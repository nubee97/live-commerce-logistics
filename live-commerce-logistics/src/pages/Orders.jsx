import React, { useEffect, useMemo, useState } from "react";
import { useStore } from "../data/StoreProvider.jsx";
import { newId } from "../data/store.js";
import EditableTable from "../components/EditableTable.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { canConfirmOrder } from "../lib/inventory.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import {
  searchCatalogOptions,
  findCatalogProductBySku,
  findGiftByCode,
} from "../lib/catalog.js";
import {
  loadAppData,
  upsertOrder,
  replaceOrderItems,
  deleteOrderWithItems,
} from "../lib/db.js";
import ExcelOrderImport from "../components/ExcelOrderImport.jsx";
import * as XLSX from "xlsx";
import "./OrdersPremium.css";

function buildAddressText(order) {
  return [
    order.recipientName ? `수령인: ${order.recipientName}` : "",
    order.phone ? `연락처: ${order.phone}` : "",
    order.postalCode ? `[${order.postalCode}]` : "",
    order.addressMain || "",
    order.addressDetail || "",
    order.deliveryMemo ? `배송메모: ${order.deliveryMemo}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

function createFormState(order) {
  return {
    customerName: order?.customerName || "",
    recipientName: order?.recipientName || "",
    phone: order?.phone || "",
    shippingMethod: order?.shippingMethod || "택배",
    postalCode: order?.postalCode || "",
    addressMain: order?.addressMain || "",
    addressDetail: order?.addressDetail || "",
    deliveryMemo: order?.deliveryMemo || "",
    saveAddressBook: !!order?.saveAddressBook,
  };
}

export default function Orders() {
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
  const [formState, setFormState] = useState(createFormState(null));

  const selected = (state.orders || []).find((o) => o.id === selectedId);

  useEffect(() => {
    setFormState(createFormState(selected));
  }, [selectedId, selected]);

  const filteredOrders = useMemo(() => {
    let orders = [...(state.orders || [])];

    if (!isAdmin) {
      orders = orders.filter(
        (o) => (o.sellerName || "") === (session.influencerName || "")
      );
    }

    const q = search.trim().toLowerCase();
    if (q) {
      orders = orders.filter((o) => {
        const customer = (o.customerName || "").toLowerCase();
        const seller = (o.sellerName || "").toLowerCase();
        const phone = (o.phone || "").toLowerCase();
        const id = (o.id || "").toLowerCase();

        return (
          customer.includes(q) ||
          seller.includes(q) ||
          phone.includes(q) ||
          id.includes(q)
        );
      });
    }

    if (statusFilter !== "ALL") {
      orders = orders.filter((o) => (o.status || "DRAFT") === statusFilter);
    }

    return orders.sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || "")
    );
  }, [state.orders, isAdmin, session.influencerName, search, statusFilter]);

  const draftOrders = useMemo(() => {
    return filteredOrders.filter((o) => (o.status || "DRAFT") === "DRAFT");
  }, [filteredOrders]);

  const confirmedOrders = useMemo(() => {
    return filteredOrders.filter((o) => (o.status || "DRAFT") !== "DRAFT");
  }, [filteredOrders]);

  const lines = useMemo(() => {
    if (!selectedId) return [];
    return (state.orderLines || []).filter((l) => l.orderId === selectedId);
  }, [state.orderLines, selectedId]);

  const productOptions = useMemo(() => {
    return searchCatalogOptions(state, "").filter((x) => x.type === "PRODUCT");
  }, [state]);

  const setOptions = useMemo(() => {
    return searchCatalogOptions(state, "").filter((x) => x.type === "SET");
  }, [state]);

  const giftOptions = useMemo(() => {
    return searchCatalogOptions(state, "").filter((x) => x.type === "GIFT");
  }, [state]);

  async function refreshFromDb(preferredSelectedId = "") {
    const fresh = await loadAppData();
    setState(fresh);

    const nextSelectedId =
      preferredSelectedId ||
      (fresh.orders || []).find((o) => o.id === selectedId)?.id ||
      fresh.orders?.[0]?.id ||
      "";

    setSelectedId(nextSelectedId);
  }

  async function createOrderFromExcel(rows) {
    if (!session) return;

    const orderId = newId();

    const order = {
      id: orderId,
      orderNumber: orderId,
      orderSource: "EXCEL",
      createdAt: new Date().toISOString(),
      status: "DRAFT",
      sellerName: session.influencerName || session.userId || "",
      customerName: "",
      recipientName: "",
      phone: "",
      country: "",
      city: "",
      postalCode: "",
      addressMain: "",
      addressDetail: "",
      saveAddressBook: false,
      deliveryMemo: "",
      address: "",
      shippingMethod: "택배",
      courier: "",
      trackingNumber: "",
      shippedAt: "",
      deliveredAt: "",
      notes: "",
      sellerSubmitted: false,
      sellerSubmittedAt: "",
    };

    const orderLines = rows.map((r) => ({
      id: newId(),
      orderId,
      itemType: r.itemType || "PRODUCT",
      itemCode: r.itemCode,
      itemName: r.itemName,
      sku: r.itemCode || "",
      officialName: r.itemName || "",
      qty: Number(r.qty || 1),
      salePrice: Number(r.salePrice || 0),
      supplyPrice: Number(r.supplyPrice || 0),
      createdAt: new Date().toISOString(),
    }));

    try {
      setSaving(true);
      await upsertOrder(order);
      await replaceOrderItems(orderId, orderLines);
      await refreshFromDb(orderId);
      setSelectedId(orderId);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to create order from Excel.");
    } finally {
      setSaving(false);
    }
  }

  async function persistOrderAndLines(
    nextOrder,
    nextLines,
    preferredSelectedId = ""
  ) {
    setSaving(true);
    setError("");

    try {
      await upsertOrder(nextOrder);
      await replaceOrderItems(nextOrder.id, nextLines);
      await refreshFromDb(preferredSelectedId || nextOrder.id);
    } catch (err) {
      setError(err?.message || "Failed to save order.");
    } finally {
      setSaving(false);
    }
  }

  function buildOrderFromForm(baseOrder) {
    const merged = {
      ...baseOrder,
      ...formState,
    };

    return {
      ...merged,
      address: buildAddressText(merged),
    };
  }

  async function saveFormDraft() {
    if (!selected) return;

    const nextOrder = buildOrderFromForm(selected);
    await persistOrderAndLines(nextOrder, lines, nextOrder.id);
  }

  function handleFieldChange(key, value) {
    setFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleFieldBlur() {
    await saveFormDraft();
  }

  async function applyImmediatePatch(patch) {
    if (!selected) return;

    const mergedForm = {
      ...formState,
      ...patch,
    };

    setFormState(mergedForm);

    const nextOrder = {
      ...selected,
      ...mergedForm,
      address: buildAddressText({
        ...selected,
        ...mergedForm,
      }),
    };

    await persistOrderAndLines(nextOrder, lines, nextOrder.id);
  }

  function toggleExpand(key) {
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  async function createOrder() {
    if (!isAdmin && !session.influencerName) {
      setError("Influencer name is missing from session. Please log in again.");
      return;
    }

    const id = newId();
    const seller = isAdmin ? "" : session.influencerName || "";

    const newOrder = {
      id,
      createdAt: new Date().toISOString(),
      paidAt: "",
      status: "DRAFT",
      sellerName: seller,
      customerName: "",
      recipientName: "",
      phone: "",
      country: "",
      city: "",
      postalCode: "",
      addressMain: "",
      addressDetail: "",
      saveAddressBook: false,
      deliveryMemo: "",
      address: "",
      shippingMethod: "택배",
      courier: "",
      trackingNumber: "",
      shippedAt: "",
      deliveredAt: "",
      notes: "",
      sellerSubmitted: false,
      sellerSubmittedAt: "",
      orderNumber: id,
      orderSource: "WEB",
    };

    setSaving(true);
    setError("");

    try {
      await upsertOrder(newOrder);
      await replaceOrderItems(newOrder.id, []);
      await refreshFromDb(newOrder.id);
    } catch (err) {
      setError(err?.message || "Failed to create order.");
    } finally {
      setSaving(false);
    }
  }

  async function addLine(type = "PRODUCT") {
    if (!selectedId || !selected) return;

    const nextLine = {
      id: newId(),
      orderId: selectedId,
      itemType: type,
      itemCode: "",
      itemName: "",
      sku: "",
      officialName: "",
      brandCode: "",
      productCode: "",
      matchedAlias: "",
      matchType: "",
      qty: 1,
      supplyPrice: 0,
      salePrice: 0,
      createdAt: new Date().toISOString(),
    };

    const nextLines = [...lines, nextLine];
    await persistOrderAndLines(buildOrderFromForm(selected), nextLines, selected.id);
  }

  async function updateLine(id, patch) {
    if (!selected) return;
    const nextLines = lines.map((l) => (l.id === id ? { ...l, ...patch } : l));
    await persistOrderAndLines(buildOrderFromForm(selected), nextLines, selected.id);
  }

  async function deleteLine(id) {
    if (!selected) return;
    const nextLines = lines.filter((l) => l.id !== id);
    await persistOrderAndLines(buildOrderFromForm(selected), nextLines, selected.id);
  }

  async function deleteSelectedLines() {
    if (selectedProducts.length === 0) return;

    const ok = window.confirm("Delete selected items?");
    if (!ok) return;

    const nextLines = lines.filter((l) => !selectedProducts.includes(l.id));
    await persistOrderAndLines(buildOrderFromForm(selected), nextLines, selected.id);
    setSelectedProducts([]);
  }

  const effectiveOrder = useMemo(() => {
    if (!selected) return null;
    return {
      ...selected,
      ...formState,
      address: buildAddressText({
        ...selected,
        ...formState,
      }),
    };
  }, [selected, formState]);

  const formCompletion = useMemo(() => {
    if (!effectiveOrder) return 0;

    const checks = [
      !!effectiveOrder.sellerName,
      !!effectiveOrder.customerName,
      !!effectiveOrder.recipientName,
      !!effectiveOrder.phone,
      !!effectiveOrder.shippingMethod,
      !!effectiveOrder.postalCode,
      !!effectiveOrder.addressMain,
      !!effectiveOrder.addressDetail,
      !!effectiveOrder.deliveryMemo,
      lines.length > 0,
    ];

    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [effectiveOrder, lines]);

  const invalidLineCount = useMemo(() => {
    return lines.filter(
      (l) =>
        !(l.sku || l.itemCode) ||
        !(l.officialName || l.itemName) ||
        !(Number(l.qty) > 0)
    ).length;
  }, [lines]);

  const confirmPreview = useMemo(() => {
    if (!selectedId) return { ok: false, pick: [], gifts: [] };
    return canConfirmOrder(state, selectedId);
  }, [state, selectedId]);

  const orderSummary = useMemo(() => {
    const totalLines = lines.length;
    const totalQty = lines.reduce((sum, l) => sum + (Number(l.qty) || 0), 0);
    const productLines = lines.filter((l) => l.itemType === "PRODUCT").length;
    const setLines = lines.filter((l) => l.itemType === "SET").length;
    const giftLines = lines.filter((l) => l.itemType === "GIFT").length;
    const warnings = confirmPreview.pick.filter(
      (r) => (Number(r.stock) || 0) < (Number(r.qty) || 0)
    ).length;

    return {
      totalLines,
      totalQty,
      productLines,
      setLines,
      giftLines,
      warnings,
    };
  }, [lines, confirmPreview]);

  function mapSelectionToPatch(rowType, code) {
    if (rowType === "PRODUCT") {
      const p =
        findCatalogProductBySku(state, code) ||
        (state.mainProducts || []).find((x) => x.productCode === code);

      if (!p) {
        return {
          itemCode: code,
          itemName: "",
          sku: code,
          officialName: "",
          brandCode: "",
          productCode: "",
          matchedAlias: "",
          matchType: "MANUAL",
          supplyPrice: 0,
          salePrice: 0,
        };
      }

      return {
        itemCode: p.sku || p.productCode || code,
        itemName: p.productName || "",
        sku: p.sku || p.productCode || code,
        officialName: p.productName || "",
        brandCode: p.brandCode || "",
        productCode: p.productCode || "",
        matchedAlias: "",
        matchType: "EXACT",
        supplyPrice: Number(p.supplyPrice || 0),
        salePrice: Number(
          p.livePrice ||
            p.onlinePrice ||
            p.consumerPrice ||
            p.retailPrice ||
            0
        ),
      };
    }

    if (rowType === "SET") {
      const s = (state.setProducts || []).find((x) => x.setCode === code);

      return {
        itemCode: s?.setCode || code,
        itemName: s?.setName || "",
        sku: s?.setCode || code,
        officialName: s?.setName || "",
        brandCode: "",
        productCode: s?.setCode || "",
        matchedAlias: "",
        matchType: "EXACT",
        supplyPrice: 0,
        salePrice: 0,
      };
    }

    const g =
      findGiftByCode(state, code) ||
      (state.gifts || []).find((x) => x.giftCode === code);

    return {
      itemCode: g?.giftCode || code,
      itemName: g?.giftName || "",
      sku: g?.giftCode || code,
      officialName: g?.giftName || "",
      brandCode: "",
      productCode: g?.giftCode || "",
      matchedAlias: "",
      matchType: "EXACT",
      supplyPrice: 0,
      salePrice: 0,
    };
  }

  function getSetComponents(code) {
    if (!code) return [];

    const components = (state.setComponents || []).filter(
      (c) => c.setCode === code
    );

    return components.map((c) => {
      const product =
        (state.catalogProducts || []).find(
          (x) => x.sku === c.productCode || x.productCode === c.productCode
        ) ||
        (state.mainProducts || []).find(
          (x) => x.productCode === c.productCode
        );

      return {
        name: product?.productName || c.productCode,
        qty: Number(c.qtyPerSet || 1),
      };
    });
  }

  const lineCols = [
    {
      key: "select",
      label: "",
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedProducts.includes(row.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedProducts([...selectedProducts, row.id]);
            } else {
              setSelectedProducts(
                selectedProducts.filter((id) => id !== row.id)
              );
            }
          }}
        />
      ),
    },
    {
      key: "itemType",
      label: "Type",
      type: "select",
      options: [
        { value: "PRODUCT", label: "Product" },
        { value: "SET", label: "Set" },
        { value: "GIFT", label: "Gift" },
      ],
    },
    {
      key: "itemCode",
      label: "Select Catalog Item",
      render: (row) => {
        const opts =
          row.itemType === "PRODUCT"
            ? productOptions
            : row.itemType === "SET"
            ? setOptions
            : giftOptions;

        return (
          <select
            className="select"
            size={1}
            value={row.sku || row.itemCode || ""}
            disabled={saving || isLocked}
            onChange={(e) => {
              const code = e.target.value;
              const patch = mapSelectionToPatch(row.itemType, code);
              updateLine(row.id, patch);
            }}
          >
            <option value="">Select…</option>
            {opts.map((op) => (
              <option key={`${op.type}_${op.value}`} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: "itemName",
      label: "Official Name",
      render: (row) => <span>{row.officialName || row.itemName || ""}</span>,
    },
    {
      key: "sku",
      label: "SKU / Code",
      render: (row) => <span>{row.sku || row.itemCode || ""}</span>,
    },
    { key: "qty", label: "Qty", type: "number" },
    {
      key: "salePrice",
      label: "Sale Price",
      render: (row) => <span>{row.retailPrice || row.salePrice}</span>,
    },
  ];

  const isLocked = !!selected?.status && selected.status !== "DRAFT";

  const orderedItemsSummary = useMemo(() => {
    const map = new Map();

    for (const line of lines) {
      const code = line.sku || line.itemCode || "";
      const key = `${line.itemType}_${code}`;

      const prev = map.get(key) || {
        itemType: line.itemType,
        itemCode: code,
        itemName: line.officialName || line.itemName || "(Unselected item)",
        qty: 0,
      };

      prev.qty += Number(line.qty) || 0;
      map.set(key, prev);
    }

    return Array.from(map.values());
  }, [lines]);

  function getMissingFields() {
    if (!effectiveOrder) return [];

    const missing = [];

    if (!effectiveOrder.customerName) missing.push("Customer Name");
    if (!effectiveOrder.recipientName) missing.push("Recipient Name");
    if (!effectiveOrder.phone) missing.push("Phone");
    if (!effectiveOrder.shippingMethod) missing.push("Shipping Method");
    if (!effectiveOrder.addressMain) missing.push("Address");
    if (!effectiveOrder.addressDetail) missing.push("Address Detail");
    if (lines.length === 0) missing.push("Order Items");
    if (invalidLineCount > 0) missing.push("Incomplete Item Lines");

    return missing;
  }

  const missingFields = getMissingFields();

  function isMissing(field) {
    return missingFields.includes(field);
  }

  async function sellerConfirmOrder() {
    if (!selected || !effectiveOrder) return;

    if ((selected.status || "DRAFT") !== "DRAFT") {
      setError("This order has already been confirmed.");
      return;
    }

    const missing = getMissingFields();

    if (missing.length > 0) {
      setError(
        `Please complete the following fields before confirming: ${missing.join(", ")}`
      );
      return;
    }

    const ok = window.confirm(
      "Are you sure you want to confirm this order?"
    );
    if (!ok) return;

    const nextOrder = {
      ...effectiveOrder,
      sellerSubmitted: true,
      sellerSubmittedAt: new Date().toISOString(),
      status: "CONFIRMED",
    };

    await persistOrderAndLines(nextOrder, lines, nextOrder.id);
  }

  async function deleteEntireOrder(orderId) {
    const target = (state.orders || []).find((o) => o.id === orderId);
    if (!target) return;

    if (!isAdmin) {
      if ((target.sellerName || "") !== (session.influencerName || "")) {
        setError("You can only delete your own orders.");
        return;
      }
    }

    const ok = window.confirm(
      "Delete this order? It will also be removed from the admin order list."
    );
    if (!ok) return;

    setSaving(true);
    setError("");

    try {
      await deleteOrderWithItems(orderId);
      const fresh = await loadAppData();
      setState(fresh);

      if (selectedId === orderId) {
        setSelectedId(fresh.orders?.[0]?.id || "");
      }
    } catch (err) {
      setError(err?.message || "Failed to delete order.");
    } finally {
      setSaving(false);
    }
  }

  function downloadOrderTemplate() {
    const template = [
      {
        "Customer Name": "John Doe",
        "Recipient Name": "Jane Doe",
        "Phone Number": "01012345678",
        "Shipping Method": "택배",
        Address: "Seoul Gangnam",
        "Shipping Memo": "Leave at door",
        SKU: "BNG-001",
        "Product Name": "Braiding Gel",
        Qty: 2,
        Price: 15000,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(workbook, "order_template.xlsx");
  }

  const sellerNameDisplay =
    effectiveOrder?.sellerName ||
    (isAdmin ? "No seller selected" : session.influencerName || "-");

  return (
    <>
      {showExcelImport && (
        <div className="ordersPremiumModal">
          <div className="ordersPremiumModalCard">
            <div className="ordersPremiumModalHead">
              <div>
                <h3>Excel Import</h3>
                <p>Upload your order sheet and review before confirming.</p>
              </div>
              <button
                type="button"
                className="ordersPremiumGhostBtn"
                onClick={() => setShowExcelImport(false)}
              >
                Close
              </button>
            </div>

            <ExcelOrderImport
              onParsed={(data) => {
                createOrderFromExcel(data);
                setShowExcelImport(false);
              }}
            />
          </div>
        </div>
      )}

      <div className="ordersPremiumPage">
        <aside className="ordersPremiumLeft">
          <section className="ordersPremiumPanel ordersPremiumSidebar">
            <div className="ordersPremiumPanelHead">
              <div>
                <h2>My Orders</h2>
                <p>Drafts and confirmed submissions.</p>
              </div>
            </div>

            <div className="ordersPremiumActionRow">
              <button
                className="ordersPremiumPrimaryBtn"
                onClick={createOrder}
                type="button"
                disabled={saving}
              >
                + New Order
              </button>

              <button
                className="ordersPremiumGhostBtn"
                onClick={() => setShowExcelImport(true)}
                type="button"
              >
                Upload Excel
              </button>

              <button
                className="ordersPremiumGhostBtn"
                onClick={downloadOrderTemplate}
                type="button"
              >
                Template
              </button>
            </div>

            <div className="ordersPremiumFilterBar compact">
              <input
                className="ordersPremiumSearch"
                placeholder="Search orders"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                className="ordersPremiumSelect"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="CONFIRMED">Confirmed</option>
              </select>
            </div>

            <div className="ordersPremiumCountRow">
              <span className="ordersPremiumCountChip">
                {filteredOrders.length} order(s)
              </span>
            </div>

            <div className="ordersPremiumGroup">
              <div className="ordersPremiumGroupLabel">Draft Orders</div>

              {draftOrders.length === 0 ? (
                <div className="ordersPremiumEmptyState">No draft orders.</div>
              ) : (
                draftOrders.map((o) => (
                  <div
                    key={o.id}
                    className={`ordersPremiumInboxCard ${
                      o.id === selectedId ? "active" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="ordersPremiumInboxMain"
                      onClick={() => setSelectedId(o.id)}
                    >
                      <div className="ordersPremiumInboxTop">
                        <div className="ordersPremiumInboxCustomer">
                          {o.customerName || "(No customer)"}
                        </div>
                        <StatusBadge status={o.status} />
                      </div>

                      <div className="ordersPremiumInboxMeta">
                        <span>{o.sellerName || "Seller?"}</span>
                        <span>•</span>
                        <span>{o.phone || "No phone"}</span>
                      </div>

                      <div className="ordersPremiumInboxDate">
                        {o.createdAt ? new Date(o.createdAt).toLocaleString() : ""}
                      </div>
                    </button>

                    {!isAdmin && (
                      <div className="ordersPremiumInboxActions">
                        <button
                          className="ordersPremiumDangerBtn"
                          onClick={() => deleteEntireOrder(o.id)}
                          type="button"
                          disabled={saving}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="ordersPremiumGroup">
              <div className="ordersPremiumGroupLabel">Order Bag</div>

              {confirmedOrders.length === 0 ? (
                <div className="ordersPremiumEmptyState">
                  No confirmed orders yet.
                </div>
              ) : (
                confirmedOrders.map((o) => (
                  <div
                    key={o.id}
                    className={`ordersPremiumInboxCard confirmed ${
                      o.id === selectedId ? "active" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="ordersPremiumInboxMain"
                      onClick={() => setSelectedId(o.id)}
                    >
                      <div className="ordersPremiumInboxTop">
                        <div className="ordersPremiumInboxCustomer">
                          {o.customerName || "(No customer)"}
                        </div>
                        <StatusBadge status={o.status} />
                      </div>

                      <div className="ordersPremiumInboxMeta">
                        <span>{o.sellerName || "Seller?"}</span>
                        <span>•</span>
                        <span>{o.phone || "No phone"}</span>
                      </div>

                      <div className="ordersPremiumConfirmedAt">
                        Confirmed •{" "}
                        {o.sellerSubmittedAt
                          ? new Date(o.sellerSubmittedAt).toLocaleString()
                          : ""}
                      </div>

                      <div className="ordersPremiumInboxDate">
                        {o.createdAt ? new Date(o.createdAt).toLocaleString() : ""}
                      </div>
                    </button>

                    {!isAdmin && (
                      <div className="ordersPremiumInboxActions">
                        <button
                          className="ordersPremiumDangerBtn"
                          onClick={() => deleteEntireOrder(o.id)}
                          type="button"
                          disabled={saving}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>

        <main className="ordersPremiumRight">
          <section className="ordersPremiumHero compact">
            <div>
              <div className="ordersPremiumEyebrow">Orders Workspace</div>
              <h1 className="ordersPremiumTitle">
                Create and manage your orders
              </h1>
              <p className="ordersPremiumSubtitle">
                A simpler workflow for order details, items, confirmation, and stock review.
              </p>
            </div>

            <div className="ordersPremiumHeroStats">
              <div className="ordersPremiumStatCard">
                <span>All Orders</span>
                <strong>{filteredOrders.length}</strong>
              </div>
              <div className="ordersPremiumStatCard">
                <span>Draft</span>
                <strong>{draftOrders.length}</strong>
              </div>
              <div className="ordersPremiumStatCard">
                <span>Confirmed</span>
                <strong>{confirmedOrders.length}</strong>
              </div>
            </div>
          </section>

          {!selected ? (
            <section className="ordersPremiumPanel">
              <div className="ordersPremiumEmptyState large">
                Select an order from the left or create a new one.
              </div>
            </section>
          ) : (
            <>
              <section className="ordersPremiumPanel ordersPremiumEditor">
                <div className="ordersPremiumPanelHead">
                  <div>
                    <h2>Order Details</h2>
                    <p>Fill in customer and delivery information first.</p>
                  </div>

                  <div className="ordersPremiumMetaRow">
                    <StatusBadge status={selected.status} />
                    {selected.sellerSubmittedAt && (
                      <span className="ordersPremiumCountChip">
                        Confirmed •{" "}
                        {new Date(selected.sellerSubmittedAt).toLocaleString()}
                      </span>
                    )}
                    <span className="ordersPremiumIdText">ID: {selected.id}</span>
                  </div>
                </div>

                {error && <div className="ordersPremiumError">{error}</div>}

                <div className="ordersPremiumTopInfoGrid">
                  <div className="ordersPremiumInfoCard">
                    <div className="ordersPremiumInfoLabel">
                      Seller / Influencer
                    </div>
                    <div className="ordersPremiumInfoValue">
                      {sellerNameDisplay}
                    </div>
                    <div className="ordersPremiumInfoSub">
                      Automatically pulled from your login session.
                    </div>
                  </div>

                  <div className="ordersPremiumInfoCard">
                    <div className="ordersPremiumInfoLabel">
                      Order Completion
                    </div>
                    <div className="ordersPremiumCompletionValue">
                      {formCompletion}%
                    </div>
                    <div className="ordersPremiumProgressTrack">
                      <div
                        className="ordersPremiumProgressFill"
                        style={{ width: `${formCompletion}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="ordersPremiumFormGrid">
                  <div className="ordersPremiumFieldBlock">
                    <label>Customer Name</label>
                    <input
                      className={`ordersPremiumInput ${
                        isMissing("Customer Name") ? "error" : ""
                      }`}
                      value={formState.customerName}
                      disabled={isLocked || saving}
                      onChange={(e) =>
                        handleFieldChange("customerName", e.target.value)
                      }
                      onBlur={handleFieldBlur}
                      placeholder="Customer account / buyer name"
                    />
                  </div>

                  <div className="ordersPremiumFieldBlock">
                    <label>Recipient Name</label>
                    <input
                      className={`ordersPremiumInput ${
                        isMissing("Recipient Name") ? "error" : ""
                      }`}
                      value={formState.recipientName}
                      disabled={isLocked || saving}
                      onChange={(e) =>
                        handleFieldChange("recipientName", e.target.value)
                      }
                      onBlur={handleFieldBlur}
                      placeholder="Actual receiver name"
                    />
                  </div>

                  <div className="ordersPremiumFieldBlock">
                    <label>Phone</label>
                    <input
                      className={`ordersPremiumInput ${
                        isMissing("Phone") ? "error" : ""
                      }`}
                      value={formState.phone}
                      disabled={isLocked || saving}
                      onChange={(e) => handleFieldChange("phone", e.target.value)}
                      onBlur={handleFieldBlur}
                      placeholder="010-0000-0000"
                    />
                  </div>

                  <div className="ordersPremiumFieldBlock">
                    <label>Shipping Method</label>
                    <select
                      className={`ordersPremiumSelectField ${
                        isMissing("Shipping Method") ? "error" : ""
                      }`}
                      value={formState.shippingMethod}
                      disabled={isLocked || saving}
                      onChange={(e) =>
                        handleFieldChange("shippingMethod", e.target.value)
                      }
                      onBlur={handleFieldBlur}
                    >
                      <option value="퀵">퀵</option>
                      <option value="택배">택배</option>
                      <option value="방문 수령">방문 수령</option>
                    </select>
                  </div>

                  <div className="ordersPremiumAddressCard full">
                    <div className="ordersPremiumInfoLabel">배송지 정보</div>

                    <div className="ordersPremiumAddressRow">
                      <input
                        className="ordersPremiumInput small"
                        value={formState.postalCode}
                        disabled={isLocked || saving}
                        onChange={(e) =>
                          handleFieldChange("postalCode", e.target.value)
                        }
                        onBlur={handleFieldBlur}
                        placeholder="우편번호"
                      />

                      <button
                        type="button"
                        className="ordersPremiumGhostBtn"
                        disabled={isLocked || saving}
                        onClick={() => {
                          if (!window.daum || !window.daum.Postcode) {
                            setError(
                              "Address search script is not loaded yet. Please refresh the page."
                            );
                            return;
                          }

                          new window.daum.Postcode({
                            oncomplete: function (data) {
                              const fullAddress =
                                data.roadAddress || data.jibunAddress || "";
                              applyImmediatePatch({
                                postalCode: data.zonecode || "",
                                addressMain: fullAddress,
                              });
                            },
                          }).open();
                        }}
                      >
                        주소찾기
                      </button>
                    </div>

                    <div className="ordersPremiumAddressStack">
                      <input
                        className={`ordersPremiumInput ${
                          isMissing("Address") ? "error" : ""
                        }`}
                        value={formState.addressMain}
                        disabled={isLocked || saving}
                        onChange={(e) =>
                          handleFieldChange("addressMain", e.target.value)
                        }
                        onBlur={handleFieldBlur}
                        placeholder="주소"
                      />

                      <input
                        className={`ordersPremiumInput ${
                          isMissing("Address Detail") ? "error" : ""
                        }`}
                        value={formState.addressDetail}
                        disabled={isLocked || saving}
                        onChange={(e) =>
                          handleFieldChange("addressDetail", e.target.value)
                        }
                        onBlur={handleFieldBlur}
                        placeholder="상세주소"
                      />
                    </div>

                    <label className="ordersPremiumCheckboxRow">
                      <input
                        type="checkbox"
                        checked={!!formState.saveAddressBook}
                        disabled={isLocked || saving}
                        onChange={(e) =>
                          applyImmediatePatch({
                            saveAddressBook: e.target.checked,
                          })
                        }
                      />
                      <span>배송지 목록에 추가</span>
                    </label>
                  </div>

                  <div className="ordersPremiumFieldBlock full">
                    <label>배송메모</label>
                    <select
                      className="ordersPremiumSelectField"
                      value={formState.deliveryMemo}
                      disabled={isLocked || saving}
                      onChange={(e) =>
                        handleFieldChange("deliveryMemo", e.target.value)
                      }
                      onBlur={handleFieldBlur}
                    >
                      <option value="">배송메모를 선택해 주세요.</option>
                      <option value="문 앞에 놓아주세요.">
                        문 앞에 놓아주세요.
                      </option>
                      <option value="경비실에 맡겨주세요.">
                        경비실에 맡겨주세요.
                      </option>
                      <option value="배송 전 연락 부탁드립니다.">
                        배송 전 연락 부탁드립니다.
                      </option>
                      <option value="부재 시 연락 부탁드립니다.">
                        부재 시 연락 부탁드립니다.
                      </option>
                      <option value="파손 주의 부탁드립니다.">
                        파손 주의 부탁드립니다.
                      </option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="ordersPremiumPanel ordersPremiumBuilder">
                <div className="ordersPremiumPanelHead">
                  <div>
                    <h2>Order Builder</h2>
                    <p>
                      A simpler flow: add items, review them, confirm, then check stock.
                    </p>
                  </div>
                </div>

                <div className="ordersPremiumBuilderStack">
                  <section className="ordersPremiumStepCard">
                    <div className="ordersPremiumStepLabel">STEP 1</div>
                    <h3>Add Items</h3>
                    <p>Start by adding products, sets, or gifts.</p>

                    <div className="ordersPremiumActionRow">
                      <button
                        className="ordersPremiumGhostBtn"
                        onClick={() => addLine("PRODUCT")}
                        disabled={isLocked || saving}
                        type="button"
                      >
                        + Product
                      </button>
                      <button
                        className="ordersPremiumGhostBtn"
                        onClick={() => addLine("SET")}
                        disabled={isLocked || saving}
                        type="button"
                      >
                        + Set
                      </button>
                      <button
                        className="ordersPremiumGhostBtn"
                        onClick={() => addLine("GIFT")}
                        disabled={isLocked || saving}
                        type="button"
                      >
                        + Gift
                      </button>
                    </div>
                  </section>

                  <section className="ordersPremiumStepCard">
                    <div className="ordersPremiumStepHead">
                      <div>
                        <div className="ordersPremiumStepLabel">STEP 2</div>
                        <h3>Current Items</h3>
                        <p>Review what is already in this order.</p>
                      </div>
                      <div className="ordersPremiumCountChip">{lines.length} row(s)</div>
                    </div>

                    {orderedItemsSummary.length === 0 ? (
                      <div className="ordersPremiumEmptyState">
                        No items added yet.
                      </div>
                    ) : (
                      <div className="ordersPremiumSummaryList">
                        {orderedItemsSummary.map((item, idx) => {
                          const key = `${item.itemType}_${item.itemCode}_${idx}`;
                          const expanded = expandedItems[key];
                          const components =
                            item.itemType === "SET"
                              ? getSetComponents(item.itemCode || item.sku)
                              : [];

                          return (
                            <div key={key} className="ordersPremiumSummaryRow">
                              <div className="ordersPremiumSummaryLeft">
                                <div
                                  className="ordersPremiumSummaryName"
                                  onClick={() => {
                                    if (components.length) toggleExpand(key);
                                  }}
                                  style={{
                                    cursor: components.length ? "pointer" : "default",
                                  }}
                                >
                                  {components.length > 0 && (
                                    <span className="ordersPremiumExpandArrow">
                                      {expanded ? "▼" : "▶"}
                                    </span>
                                  )}
                                  {item.itemName || "(Unselected item)"}
                                </div>

                                <div className="ordersPremiumSummaryMeta">
                                  <span className="ordersPremiumTag">
                                    {item.itemType}
                                  </span>
                                  {item.itemCode && <span>{item.itemCode}</span>}
                                </div>

                                {expanded && components.length > 0 && (
                                  <div className="ordersPremiumSetBreakdown">
                                    {components.map((c, i) => (
                                      <div key={i}>
                                        • {c.name} × {c.qty}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="ordersPremiumSummaryQty">
                                x{item.qty}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="ordersPremiumDeleteSelectedBar">
                      <button
                        className="ordersPremiumDangerBtn"
                        onClick={deleteSelectedLines}
                        disabled={selectedProducts.length === 0}
                      >
                        Delete Selected ({selectedProducts.length})
                      </button>
                    </div>

                    <EditableTable
                      rows={lines}
                      columns={lineCols}
                      addLabel="(Use the buttons above)"
                      onAdd={() => {}}
                      onUpdate={(id, patch) => updateLine(id, patch)}
                      onDelete={(id) => deleteLine(id)}
                      emptyText="Add at least one line item."
                    />
                  </section>

                  <section className="ordersPremiumStepCard">
                    <div className="ordersPremiumStepLabel">STEP 3</div>
                    <h3>Review & Confirm</h3>
                    <p>Check totals, warnings, and confirm when ready.</p>

                    <div className="ordersPremiumSummaryGrid">
                      <div className="ordersPremiumSummaryMetric">
                        <span>Lines</span>
                        <strong>{orderSummary.totalLines}</strong>
                      </div>
                      <div className="ordersPremiumSummaryMetric">
                        <span>Total Qty</span>
                        <strong>{orderSummary.totalQty}</strong>
                      </div>
                      <div className="ordersPremiumSummaryMetric">
                        <span>Products</span>
                        <strong>{orderSummary.productLines}</strong>
                      </div>
                      <div className="ordersPremiumSummaryMetric">
                        <span>Sets</span>
                        <strong>{orderSummary.setLines}</strong>
                      </div>
                      <div className="ordersPremiumSummaryMetric">
                        <span>Gifts</span>
                        <strong>{orderSummary.giftLines}</strong>
                      </div>
                      <div className="ordersPremiumSummaryMetric warning">
                        <span>Warnings</span>
                        <strong>{orderSummary.warnings + invalidLineCount}</strong>
                      </div>
                    </div>

                    {(invalidLineCount > 0 || orderSummary.warnings > 0) && (
                      <div className="ordersPremiumWarningBox">
                        {invalidLineCount > 0 && (
                          <div>• {invalidLineCount} incomplete order line(s)</div>
                        )}
                        {orderSummary.warnings > 0 && (
                          <div>• {orderSummary.warnings} stock warning(s)</div>
                        )}
                      </div>
                    )}

                    <div className="ordersPremiumConfirmBar">
                      <div className="ordersPremiumMetaRow">
                        <StatusBadge status={selected.status} />
                        <span className="ordersPremiumIdText">ID: {selected.id}</span>
                      </div>

                      {!isAdmin && (
                        <button
                          className="ordersPremiumPrimaryBtn"
                          disabled={saving || (selected?.status || "DRAFT") !== "DRAFT"}
                          onClick={sellerConfirmOrder}
                          type="button"
                        >
                          {(selected?.status || "DRAFT") === "DRAFT"
                            ? "Confirm Order"
                            : "Order Confirmed"}
                        </button>
                      )}
                    </div>
                  </section>

                  <section className="ordersPremiumStepCard">
                    <div className="ordersPremiumStepLabel">STEP 4</div>
                    <h3>Stock Check</h3>
                    <p>Final stock review before submission.</p>

                    <div className="ordersPremiumStockPill">
                      <span
                        className={`ordersPremiumStockDot ${
                          confirmPreview.ok ? "good" : "bad"
                        }`}
                      />
                      <span>
                        {confirmPreview.ok
                          ? "Stock looks good for this order."
                          : "Insufficient stock for one or more items."}
                      </span>
                    </div>

                    <div className="ordersPremiumMiniTableWrap">
                      <table className="ordersPremiumMiniTable">
                        <thead>
                          <tr>
                            <th>Product Code</th>
                            <th>Product Name</th>
                            <th className="right">Pick Qty</th>
                            <th className="right">Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {confirmPreview.pick.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="small">
                                No pick items yet.
                              </td>
                            </tr>
                          ) : (
                            confirmPreview.pick.map((r) => {
                              const ok =
                                (Number(r.stock) || 0) >= (Number(r.qty) || 0);

                              return (
                                <tr key={r.productCode}>
                                  <td>{r.productCode}</td>
                                  <td>
                                    {r.productName === "(Missing product)" ? (
                                      <span className="ordersPremiumMissingText">
                                        (Missing product mapping)
                                      </span>
                                    ) : (
                                      r.productName
                                    )}
                                  </td>
                                  <td className="right">{r.qty}</td>
                                  <td className="right">
                                    <span
                                      className={`ordersPremiumStockBadge ${
                                        ok ? "ok" : "low"
                                      }`}
                                    >
                                      {r.stock}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </>
  );
}