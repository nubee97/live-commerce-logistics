import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "../../data/useStore.js";
import { useAuth } from "../../auth/useAuth.js";
import { canConfirmOrder } from "../../lib/inventory.js";
import { searchCatalogOptions } from "../../lib/catalog.js";
import { createOrderFormState } from "./orders-form-utils.js";
import { buildOrderLineColumns } from "./order-line-columns.jsx";
import {
  buildDraftOrder,
  buildExcelDraftOrder,
  getFormCompletion,
  buildOrderSummary,
  buildOrderedItemsSummary,
  buildSelectionPatch,
  createEmptyOrderLine,
  createImportedOrderLines,
  getFilteredOrders,
  getInvalidLineCount,
  getMissingFields,
  getSetComponents,
  mergeOrderWithForm,
} from "./orders-domain.js";
import {
  deleteOrderBundle,
  downloadOrdersTemplateFile,
  persistOrderBundle,
  refreshOrdersWorkspace,
} from "./orders-service.js";

export function useOrdersWorkspace() {
  const { state, setState } = useStore();
  const { session } = useAuth();

  const isAdmin = session.role === "admin";
  const [selectedId, setSelectedId] = useState(state.orders?.[0]?.id || "");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [saving, setSaving] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});
  const [formState, setFormState] = useState(createOrderFormState(null));

  const selected = useMemo(
    () => (state.orders || []).find((order) => order.id === selectedId),
    [state.orders, selectedId]
  );

  useEffect(() => {
    setFormState(createOrderFormState(selected));
  }, [selected]);

  const filteredOrders = useMemo(
    () =>
      getFilteredOrders({
        orders: state.orders || [],
        isAdmin,
        influencerName: session.influencerName || "",
        search,
        statusFilter,
      }),
    [isAdmin, search, session.influencerName, state.orders, statusFilter]
  );

  const draftOrders = useMemo(
    () => filteredOrders.filter((order) => (order.status || "DRAFT") === "DRAFT"),
    [filteredOrders]
  );
  const confirmedOrders = useMemo(
    () => filteredOrders.filter((order) => (order.status || "DRAFT") !== "DRAFT"),
    [filteredOrders]
  );

  const lines = useMemo(() => {
    if (!selectedId) return [];
    return (state.orderLines || []).filter((line) => line.orderId === selectedId);
  }, [selectedId, state.orderLines]);

  const productOptions = useMemo(
    () => searchCatalogOptions(state, "").filter((option) => option.type === "PRODUCT"),
    [state]
  );
  const setOptions = useMemo(
    () => searchCatalogOptions(state, "").filter((option) => option.type === "SET"),
    [state]
  );
  const giftOptions = useMemo(
    () => searchCatalogOptions(state, "").filter((option) => option.type === "GIFT"),
    [state]
  );

  const effectiveOrder = useMemo(
    () => (selected ? mergeOrderWithForm(selected, formState) : null),
    [formState, selected]
  );

  const formCompletion = useMemo(() => getFormCompletion(effectiveOrder, lines), [effectiveOrder, lines]);
  const invalidLineCount = useMemo(() => getInvalidLineCount(lines), [lines]);
  const confirmPreview = useMemo(
    () => (selectedId ? canConfirmOrder(state, selectedId) : { ok: false, pick: [], gifts: [] }),
    [selectedId, state]
  );
  const orderSummary = useMemo(
    () => buildOrderSummary(lines, confirmPreview, invalidLineCount),
    [confirmPreview, invalidLineCount, lines]
  );
  const orderedItemsSummary = useMemo(() => buildOrderedItemsSummary(lines), [lines]);
  const missingFields = useMemo(
    () => getMissingFields(effectiveOrder, lines, invalidLineCount),
    [effectiveOrder, invalidLineCount, lines]
  );

  const isLocked = !!selected?.status && selected.status !== "DRAFT";
  const sellerNameDisplay = effectiveOrder?.sellerName || (isAdmin ? "No seller selected" : session.influencerName || "-");

  const refreshFromDb = useCallback(
    async (preferredSelectedId = "") => {
      const nextSelectedId = await refreshOrdersWorkspace({
        setState,
        currentSelectedId: selectedId,
        preferredSelectedId,
      });
      setSelectedId(nextSelectedId);
      return nextSelectedId;
    },
    [selectedId, setState]
  );

  const persistSelectedOrder = useCallback(
    async (nextOrder, nextLines, preferredSelectedId = "") => {
      setSaving(true);
      setError("");

      try {
        const nextSelectedId = await persistOrderBundle({
          order: nextOrder,
          lines: nextLines,
          setState,
          currentSelectedId: selectedId,
          preferredSelectedId,
        });
        setSelectedId(nextSelectedId);
      } catch (err) {
        setError(err?.message || "Failed to save order.");
      } finally {
        setSaving(false);
      }
    },
    [selectedId, setState]
  );

  const saveFormDraft = useCallback(async () => {
    if (!selected) return;
    await persistSelectedOrder(mergeOrderWithForm(selected, formState), lines, selected.id);
  }, [formState, lines, persistSelectedOrder, selected]);

  const handleFieldChange = useCallback((key, value) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFieldBlur = useCallback(async () => {
    await saveFormDraft();
  }, [saveFormDraft]);

  const applyImmediatePatch = useCallback(
    async (patch) => {
      if (!selected) return;
      const mergedForm = { ...formState, ...patch };
      setFormState(mergedForm);
      await persistSelectedOrder(mergeOrderWithForm(selected, mergedForm), lines, selected.id);
    },
    [formState, lines, persistSelectedOrder, selected]
  );

  const toggleExpand = useCallback((key) => {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const createOrder = useCallback(async () => {
    if (!isAdmin && !session.influencerName) {
      setError("Influencer name is missing from session. Please log in again.");
      return;
    }

    const nextOrder = buildDraftOrder({
      isAdmin,
      influencerName: session.influencerName || "",
      source: "WEB",
    });

    setSaving(true);
    setError("");

    try {
      const nextSelectedId = await persistOrderBundle({
        order: nextOrder,
        lines: [],
        setState,
        currentSelectedId: selectedId,
        preferredSelectedId: nextOrder.id,
      });
      setSelectedId(nextSelectedId);
    } catch (err) {
      setError(err?.message || "Failed to create order.");
    } finally {
      setSaving(false);
    }
  }, [isAdmin, selectedId, session.influencerName, setState]);

  const createOrderFromExcel = useCallback(
    async (rows) => {
      if (!session) return;

      const nextOrder = buildExcelDraftOrder(session);
      const nextLines = createImportedOrderLines(rows, nextOrder.id);

      try {
        setSaving(true);
        const nextSelectedId = await persistOrderBundle({
          order: nextOrder,
          lines: nextLines,
          setState,
          currentSelectedId: selectedId,
          preferredSelectedId: nextOrder.id,
        });
        setSelectedId(nextSelectedId);
      } catch (err) {
        console.error(err);
        setError(err?.message || "Failed to create order from Excel.");
      } finally {
        setSaving(false);
      }
    },
    [selectedId, session, setState]
  );

  const addLine = useCallback(
    async (type = "PRODUCT") => {
      if (!selectedId || !selected) return;
      const nextLines = [...lines, createEmptyOrderLine(selectedId, type)];
      await persistSelectedOrder(mergeOrderWithForm(selected, formState), nextLines, selected.id);
    },
    [formState, lines, persistSelectedOrder, selected, selectedId]
  );

  const updateLine = useCallback(
    async (id, patch) => {
      if (!selected) return;
      const nextLines = lines.map((line) => (line.id === id ? { ...line, ...patch } : line));
      await persistSelectedOrder(mergeOrderWithForm(selected, formState), nextLines, selected.id);
    },
    [formState, lines, persistSelectedOrder, selected]
  );

  const deleteLine = useCallback(
    async (id) => {
      if (!selected) return;
      const nextLines = lines.filter((line) => line.id !== id);
      await persistSelectedOrder(mergeOrderWithForm(selected, formState), nextLines, selected.id);
    },
    [formState, lines, persistSelectedOrder, selected]
  );

  const deleteSelectedLines = useCallback(async () => {
    if (!selected || selectedProducts.length === 0) return;
    if (!window.confirm("Delete selected items?")) return;

    const nextLines = lines.filter((line) => !selectedProducts.includes(line.id));
    await persistSelectedOrder(mergeOrderWithForm(selected, formState), nextLines, selected.id);
    setSelectedProducts([]);
  }, [formState, lines, persistSelectedOrder, selected, selectedProducts]);

  const sellerConfirmOrder = useCallback(async () => {
    if (!selected || !effectiveOrder) return;

    if ((selected.status || "DRAFT") !== "DRAFT") {
      setError("This order has already been confirmed.");
      return;
    }

    if (missingFields.length > 0) {
      setError(`Please complete the following fields before confirming: ${missingFields.join(", ")}`);
      return;
    }

    if (!window.confirm("Are you sure you want to confirm this order?")) return;

    const nextOrder = {
      ...effectiveOrder,
      sellerSubmitted: true,
      sellerSubmittedAt: new Date().toISOString(),
      status: "CONFIRMED",
    };

    await persistSelectedOrder(nextOrder, lines, nextOrder.id);
  }, [effectiveOrder, lines, missingFields, persistSelectedOrder, selected]);

  const deleteEntireOrder = useCallback(
    async (orderId) => {
      const target = (state.orders || []).find((order) => order.id === orderId);
      if (!target) return;

      if (!isAdmin && (target.sellerName || "") !== (session.influencerName || "")) {
        setError("You can only delete your own orders.");
        return;
      }

      if (!window.confirm("Delete this order? It will also be removed from the admin order list.")) return;

      setSaving(true);
      setError("");

      try {
        const nextSelectedId = await deleteOrderBundle({
          orderId,
          setState,
          currentSelectedId: selectedId,
        });
        setSelectedId(nextSelectedId);
      } catch (err) {
        setError(err?.message || "Failed to delete order.");
      } finally {
        setSaving(false);
      }
    },
    [isAdmin, selectedId, session.influencerName, setState, state.orders]
  );

  const lineCols = useMemo(
    () =>
      buildOrderLineColumns({
        selectedProducts,
        setSelectedProducts,
        productOptions,
        setOptions,
        giftOptions,
        saving,
        isLocked,
        mapSelectionToPatch: (rowType, code) => buildSelectionPatch(state, rowType, code),
        updateLine,
      }),
    [giftOptions, isLocked, productOptions, saving, selectedProducts, setOptions, state, updateLine]
  );

  const handleDownloadTemplate = useCallback(() => {
    downloadOrdersTemplateFile();
  }, []);

  return {
    state,
    session,
    isAdmin,
    selected,
    selectedId,
    setSelectedId,
    error,
    setError,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    saving,
    showExcelImport,
    setShowExcelImport,
    selectedProducts,
    expandedItems,
    formState,
    filteredOrders,
    draftOrders,
    confirmedOrders,
    lines,
    effectiveOrder,
    formCompletion,
    invalidLineCount,
    confirmPreview,
    orderSummary,
    orderedItemsSummary,
    missingFields,
    isLocked,
    sellerNameDisplay,
    productOptions,
    setOptions,
    giftOptions,
    lineCols,
    refreshFromDb,
    createOrderFromExcel,
    createOrder,
    saveFormDraft,
    handleFieldChange,
    handleFieldBlur,
    applyImmediatePatch,
    toggleExpand,
    addLine,
    updateLine,
    deleteLine,
    deleteSelectedLines,
    sellerConfirmOrder,
    deleteEntireOrder,
    handleDownloadTemplate,
    isMissing: (field) => missingFields.includes(field),
    getSetComponents: (code) => getSetComponents(state, code),
  };
}
