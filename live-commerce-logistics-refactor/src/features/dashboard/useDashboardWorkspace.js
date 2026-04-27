import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../data/useStore.js";
import { initialState } from "../../data/store.js";
import {
  DASHBOARD_TABS,
  createEmptyRow,
  getGiftRows,
  getPrimaryText,
  getTableRows,
  normalizeImportedState,
  normalizeLoadedState,
  readFileAsDataUrl,
  withTimestamp,
} from "./dashboard-view-model.js";
import {
  deleteDashboardRow,
  exportDashboardInventory,
  exportDashboardJson,
  importDashboardStateFromJson,
  loadDashboardState,
  persistDashboardRow,
  replaceDashboardCatalogFromExcel,
  resetDashboardState,
} from "./dashboard-data-service.js";

export function useDashboardWorkspace() {
  const { state, setState } = useStore();
  const navigate = useNavigate();

  const [active, setActive] = useState("mainProducts");
  const [isBusy, setIsBusy] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageByTab, setPageByTab] = useState({});
  const [selectedByTab, setSelectedByTab] = useState({});

  const fileRefXlsx = useRef(null);
  const fileRefJson = useRef(null);

  const giftRows = useMemo(() => getGiftRows(state), [state]);
  const tabs = DASHBOARD_TABS;
  const currentTab = tabs.find((tab) => tab.key === active) || tabs[0];
  const rowsPerPage = 8;

  const getSelectedIds = useCallback((tableKey) => selectedByTab[tableKey] || [], [selectedByTab]);
  const setSelectedIds = useCallback((tableKey, ids) => {
    setSelectedByTab((prev) => ({ ...prev, [tableKey]: ids }));
  }, []);
  const setPage = useCallback((tableKey, page) => {
    setPageByTab((prev) => ({ ...prev, [tableKey]: page }));
  }, []);

  const refreshFromDb = useCallback(
    async (preferredTable = active) => {
      const fresh = await loadDashboardState();
      setState(normalizeLoadedState(fresh));
      setPage(preferredTable, 1);
    },
    [active, setPage, setState]
  );

  const updateLocalTable = useCallback((tableKey, rows) => {
    setState((prev) => {
      if (tableKey === "gifts") {
        return {
          ...prev,
          gifts: rows,
          catalogGifts: rows,
        };
      }
      return {
        ...prev,
        [tableKey]: rows,
      };
    });
  }, [setState]);

  const handleAdd = useCallback(async (tableKey, row) => {
    const nextRow = withTimestamp(row);

    setState((prev) => {
      const sourceRows = tableKey === "gifts" ? getGiftRows(prev) : prev[tableKey] || [];
      const nextRows = [nextRow, ...sourceRows];
      return tableKey === "gifts"
        ? { ...prev, gifts: nextRows, catalogGifts: nextRows }
        : { ...prev, [tableKey]: nextRows };
    });

    try {
      await persistDashboardRow(tableKey, nextRow);
      setPage(tableKey, 1);
    } catch (error) {
      alert(error?.message || "Add failed.");
      await refreshFromDb(tableKey);
    }
  }, [refreshFromDb, setPage, setState]);

  const handleUpdate = useCallback(async (tableKey, id, patch) => {
    const currentRow = getTableRows(state, giftRows, tableKey).find((row) => row.id === id);
    if (!currentRow) return;

    const nextRow = withTimestamp(currentRow, patch);
    const sourceRows = tableKey === "gifts" ? giftRows : state[tableKey] || [];
    updateLocalTable(tableKey, sourceRows.map((row) => (row.id === id ? nextRow : row)));

    try {
      await persistDashboardRow(tableKey, nextRow);
    } catch (error) {
      alert(error?.message || "Update failed.");
      await refreshFromDb(tableKey);
    }
  }, [giftRows, refreshFromDb, state, updateLocalTable]);

  const handleBulkDelete = useCallback(async (tableKey) => {
    const ids = getSelectedIds(tableKey);
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} selected row(s)?`)) return;

    try {
      setIsBusy(true);
      for (const id of ids) {
        await deleteDashboardRow(tableKey, id);
      }
      setSelectedIds(tableKey, []);
      await refreshFromDb(tableKey);
    } catch (error) {
      alert(error?.message || "Bulk delete failed.");
      await refreshFromDb(tableKey);
    } finally {
      setIsBusy(false);
    }
  }, [getSelectedIds, refreshFromDb, setSelectedIds]);

  const handleImageUpload = useCallback(async (tableKey, row, file) => {
    if (!file) return;

    try {
      setIsBusy(true);
      const dataUrl = await readFileAsDataUrl(file);

      if (tableKey === "catalogProducts" || tableKey === "catalogEvents") {
        await handleUpdate(tableKey, row.id, { productImage: dataUrl });
        return;
      }

      if (tableKey === "mainProducts") {
        const linked =
          (state.catalogProducts || []).find(
            (item) =>
              (item.productCode && item.productCode === row.productCode) ||
              (item.productName && item.productName === row.productName)
          ) || null;

        if (!linked) {
          alert("Main Products images are inherited from Master Catalog. Please upload the image in Master Catalog first.");
          return;
        }

        await handleUpdate("catalogProducts", linked.id, { productImage: dataUrl });
        await refreshFromDb(tableKey);
        return;
      }

      alert("Image upload is enabled for product-based tables through Master Catalog / Event Products.");
    } catch (error) {
      alert(error?.message || "Image upload failed.");
    } finally {
      setIsBusy(false);
    }
  }, [handleUpdate, refreshFromDb, state.catalogProducts]);

  const orderMetrics = useMemo(() => {
    const orders = state.orders || [];
    return {
      total: orders.length,
      draft: orders.filter((order) => (order.status || "DRAFT") === "DRAFT").length,
      confirmed: orders.filter((order) => (order.status || "") === "CONFIRMED").length,
      packed: orders.filter((order) => (order.status || "") === "PACKED").length,
      shipped: orders.filter((order) => (order.status || "") === "SHIPPED").length,
    };
  }, [state.orders]);

  const lowStockCount = useMemo(() => {
    return (state.catalogProducts?.length ? state.catalogProducts : state.mainProducts || []).filter(
      (product) => Number(product.stock || 0) < 50
    ).length;
  }, [state.catalogProducts, state.mainProducts]);

  const stats = useMemo(() => ({
    catalog: (state.catalogProducts || []).length,
    sets: (state.setProducts || []).length,
    gifts: giftRows.length,
    aliases: (state.aliasTable || []).length,
  }), [giftRows.length, state.aliasTable, state.catalogProducts, state.setProducts]);

  const currentRows = useMemo(() => {
    const sourceRows = getTableRows(state, giftRows, active);
    return [...sourceRows].sort((a, b) => getPrimaryText(a, active).localeCompare(getPrimaryText(b, active), "ko"));
  }, [active, giftRows, state]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return currentRows;

    return currentRows.filter((row) => {
      const haystack = [
        getPrimaryText(row, active),
        row.productCode,
        row.sku,
        row.eventSku,
        row.eventCode,
        row.giftCode,
        row.setCode,
        row.brandName,
        row.aliasName,
        row.officialName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [active, currentRows, searchTerm]);

  const currentPage = pageByTab[active] || 1;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;
  const pagedRows = filteredRows.slice(startIndex, startIndex + rowsPerPage);

  const selectedIds = getSelectedIds(active);
  const allVisibleSelected = pagedRows.length > 0 && pagedRows.every((row) => selectedIds.includes(row.id));

  const toggleSelectOne = useCallback((rowId) => {
    setSelectedIds(
      active,
      selectedIds.includes(rowId)
        ? selectedIds.filter((id) => id !== rowId)
        : [...selectedIds, rowId]
    );
  }, [active, selectedIds, setSelectedIds]);

  const toggleSelectAllVisible = useCallback(() => {
    const visibleIds = pagedRows.map((row) => row.id);

    if (allVisibleSelected) {
      setSelectedIds(active, selectedIds.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedIds(active, Array.from(new Set([...selectedIds, ...visibleIds])));
  }, [active, allVisibleSelected, pagedRows, selectedIds, setSelectedIds]);

  const addRowForCurrentTab = useCallback(() => handleAdd(active, createEmptyRow(active)), [active, handleAdd]);

  const handleReset = useCallback(async () => {
    if (!window.confirm("Reset ALL data in Supabase?")) return;

    try {
      setIsBusy(true);
      await resetDashboardState();
      setState(normalizeLoadedState(initialState));
    } catch (error) {
      alert(error?.message || "Reset failed.");
      await refreshFromDb();
    } finally {
      setIsBusy(false);
    }
  }, [refreshFromDb, setState]);

  const handleExcelImport = useCallback(async (file) => {
    if (!file) return;

    try {
      setIsBusy(true);
      const fresh = await replaceDashboardCatalogFromExcel(file);
      setState(normalizeLoadedState(fresh));
    } catch (error) {
      alert(error?.message || "Excel import failed.");
      await refreshFromDb();
    } finally {
      setIsBusy(false);
    }
  }, [refreshFromDb, setState]);

  const handleJsonImport = useCallback(async (file) => {
    if (!file) return;

    try {
      setIsBusy(true);
      const fresh = await importDashboardStateFromJson(file, normalizeImportedState);
      setState(normalizeLoadedState(fresh));
    } catch (error) {
      alert(error?.message || "JSON import failed.");
      await refreshFromDb();
    } finally {
      setIsBusy(false);
    }
  }, [refreshFromDb, setState]);

  return {
    navigate,
    state,
    giftRows,
    tabs,
    active,
    setActive,
    isBusy,
    searchTerm,
    setSearchTerm,
    currentTab,
    filteredRows,
    pagedRows,
    selectedIds,
    allVisibleSelected,
    safePage,
    totalPages,
    orderMetrics,
    stats,
    lowStockCount,
    fileRefXlsx,
    fileRefJson,
    setPage,
    addRowForCurrentTab,
    handleBulkDelete,
    handleUpdate,
    handleImageUpload,
    toggleSelectAllVisible,
    toggleSelectOne,
    handleGoOrderList: () => navigate("/order-list"),
    handleExportExcel: () => exportDashboardInventory(state),
    handleExportJson: () => exportDashboardJson(state),
    handleImportExcelClick: () => fileRefXlsx.current?.click(),
    handleImportJsonClick: () => fileRefJson.current?.click(),
    handleReset,
    handleExcelImport,
    handleJsonImport,
  };
}
