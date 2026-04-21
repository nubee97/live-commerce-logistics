import React, { useMemo, useState } from "react";
import { useStore } from "../data/StoreProvider.jsx";
import { newId } from "../data/store.js";
import EditableTable from "../components/EditableTable.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { canConfirmOrder } from "../lib/inventory.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import {
  searchCatalogOptions,
  findCatalogProductBySku,
  findCatalogEventBySku,
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

  const selected = (state.orders || []).find((o) => o.id === selectedId);

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
//   async function createOrderFromExcel(rows) {
//   if (!session) return;

//   const orderId = newId();

//   const order = {
//     id: orderId,
//     orderNumber: orderId,
//     orderSource: "EXCEL",
//     createdAt: new Date().toISOString(),
//     status: "DRAFT",
//     sellerName: session.influencerName,
//   };

//   const orderLines = rows.map((r) => ({
//     id: newId(),
//     orderId,
//     itemType: r.itemType || "PRODUCT",
//     itemCode: r.itemCode,
//     itemName: r.itemName,
//     qty: r.qty,
//     salePrice: r.salePrice,
//     createdAt: new Date().toISOString(),
//   }));

//   await upsertOrder(order);
//   await replaceOrderItems(orderId, orderLines);
//   // await refresh();
//   await refreshFromDb(orderId);

//   setSelectedId(orderId);
// }
async function createOrderFromExcel(rows) {
  if (!session) return;

  const orderId = newId();

  const order = {
    id: orderId,
    orderNumber: orderId,
    orderSource: "EXCEL",
    createdAt: new Date().toISOString(),
    status: "DRAFT",
    sellerName: session.influencerName,
  };

  const orderLines = rows.map((r) => ({
    id: newId(),
    orderId,
    itemType: r.itemType || "PRODUCT",
    itemCode: r.itemCode,
    itemName: r.itemName,
    qty: r.qty,
    salePrice: r.salePrice,
    createdAt: new Date().toISOString(),
  }));

  try {
    await upsertOrder(order);
    await replaceOrderItems(orderId, orderLines);

    // IMPORTANT FIX
    await refreshFromDb(orderId);

    setSelectedId(orderId);
  } catch (err) {
    console.error(err);
  }
}

  async function persistOrderAndLines(nextOrder, nextLines, preferredSelectedId = "") {
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

  async function updateOrderPatch(orderPatch) {
    if (!selected) return;
    const nextOrder = { ...selected, ...orderPatch };
    await persistOrderAndLines(nextOrder, lines, nextOrder.id);
  }

  async function rebuildAddress(orderPatch = {}) {
    if (!selected) return;

    const merged = { ...selected, ...orderPatch };

    const addressText = [
      merged.recipientName ? `수령인: ${merged.recipientName}` : "",
      merged.phone ? `연락처: ${merged.phone}` : "",
      merged.postalCode ? `[${merged.postalCode}]` : "",
      merged.addressMain || "",
      merged.addressDetail || "",
      merged.deliveryMemo ? `배송메모: ${merged.deliveryMemo}` : "",
    ]
      .filter(Boolean)
      .join(" / ");

    const nextOrder = {
      ...merged,
      address: addressText,
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
    await persistOrderAndLines(selected, nextLines, selected.id);
  }

  async function updateLine(id, patch) {
    if (!selected) return;
    const nextLines = lines.map((l) => (l.id === id ? { ...l, ...patch } : l));
    await persistOrderAndLines(selected, nextLines, selected.id);
  }

  async function deleteLine(id) {
    if (!selected) return;
    const nextLines = lines.filter((l) => l.id !== id);
    await persistOrderAndLines(selected, nextLines, selected.id);
  }
  async function deleteSelectedLines() {
  if (selectedProducts.length === 0) return;

  const ok = window.confirm("Delete selected items?");
  if (!ok) return;

  const nextLines = lines.filter((l) => !selectedProducts.includes(l.id));

  await persistOrderAndLines(selected, nextLines, selected.id);

  setSelectedProducts([]);
}

  const formCompletion = useMemo(() => {
    if (!selected) return 0;

    const checks = [
      !!selected.sellerName,
      !!selected.customerName,
      !!selected.recipientName,
      !!selected.phone,
      !!selected.shippingMethod,
      !!selected.postalCode,
      !!selected.addressMain,
      !!selected.addressDetail,
      !!selected.deliveryMemo,
      lines.length > 0,
    ];

    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [selected, lines]);

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
        salePrice: Number(p.livePrice || p.onlinePrice || p.consumerPrice || p.retailPrice || 0),
      };
    }

    // if (rowType === "SET") {
    //   const s =
    //     findCatalogEventBySku(state, code) ||
    //     (state.setProducts || []).find((x) => x.setCode === code);

    //   return {
    //     itemCode: s?.eventSku || s?.setCode || code,
    //     itemName: s?.productName || s?.setName || "",
    //     sku: s?.eventSku || s?.setCode || code,
    //     officialName: s?.productName || s?.setName || "",
    //     brandCode: "",
    //     productCode: s?.eventCode || "",
    //     matchedAlias: "",
    //     matchType: "EXACT",
    //     supplyPrice: Number(s?.supplyPrice || 0),
    //     salePrice: Number(s?.salePrice || 0),
    //   };
    // }
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

// function getSetComponents(code) {
//   if (!code) return [];

//   const set = (state.setProducts || []).find((s) => s.setCode === code);
//   if (!set || !set.productsInside) return [];

//   const parts = set.productsInside.split(";");

//   return parts.map((p) => {
//     const [productCode, qty] = p.split(":");

//     const product =
//       (state.catalogProducts || []).find(
//         (x) => x.sku === productCode || x.productCode === productCode
//       ) ||
//       (state.mainProducts || []).find((x) => x.productCode === productCode);

//     return {
//       name: product?.productName || productCode,
//       qty: Number(qty || 1),
//     };
//   });
// }  

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
  )
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
    // added on the 16th: show sale price or retail price if sale price is not available
    { key: "salePrice", label: "Sale Price", render: (row) => <span>{row.retailPrice || row.salePrice}</span> },
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

  const canSellerSubmit = useMemo(() => {
    if (!selected) return false;

    const required = [
      !!selected.sellerName,
      !!selected.customerName,
      !!selected.recipientName,
      !!selected.phone,
      !!selected.shippingMethod,
      !!selected.addressMain,
      !!selected.addressDetail,
      lines.length > 0,
      invalidLineCount === 0,
    ];

    return required.every(Boolean);
  }, [selected, lines, invalidLineCount]);
function getMissingFields() {
  if (!selected) return [];

  const missing = [];

  if (!selected.customerName) missing.push("Customer Name");
  if (!selected.recipientName) missing.push("Recipient Name");
  if (!selected.phone) missing.push("Phone");
  if (!selected.shippingMethod) missing.push("Shipping Method");
  if (!selected.addressMain) missing.push("Address");
  if (!selected.addressDetail) missing.push("Address Detail");
  if (lines.length === 0) missing.push("Order Items");

  if (invalidLineCount > 0) missing.push("Incomplete Item Lines");

  return missing;
}
const missingFields = getMissingFields();

function isMissing(field) {
  return missingFields.includes(field);
}

  async function sellerConfirmOrder() {
    if (!selected) return;

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
      "이 주문을 확정하시겠습니까? / Are you sure you want to confirm this order?"
    );
    if (!ok) return;

    const nextOrder = {
      ...selected,
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
      "이 주문을 삭제하시겠습니까? 관리자 주문 목록에서도 함께 삭제됩니다. / Delete this order? It will also be removed from the admin order list."
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
      "Address": "Seoul Gangnam",
      "Shipping Memo": "Leave at door",
      "SKU": "BNG-001",
      "Product Name": "Braiding Gel",
      "Qty": 2,
      "Price": 15000
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(template);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

  XLSX.writeFile(workbook, "order_template.xlsx");
}
  return (
    <>
    {showExcelImport && (
      <div className="modal">
        <ExcelOrderImport
          onParsed={(data) => {
            createOrderFromExcel(data);
            setShowExcelImport(false);
          }}
        />
      </div>
    )}

    <div className="ordersWorkspace">
      <section className="ordersPanel inboxPanel">
        <div className="ordersPanelHeader">
          <div>
            <h2 className="ordersPanelTitle">
              {isAdmin ? "Order Inbox" : "My Orders"}
            </h2>
            <p className="ordersPanelText">
              {isAdmin
                ? "Review, search, and open incoming logistics orders."
                : "Create and manage your submitted orders."}
            </p>
          </div>

          <button
            className="btn primary"
            onClick={createOrder}
            type="button"
            disabled={saving}
          >
            + New Order
          </button>
    <button className="btn" onClick={() => setShowExcelImport(true)}>
      Upload Excel
    </button>

    
    <button className="btn ghost" onClick={downloadOrderTemplate}>
      Download Template
    </button>
        </div>

        <div className="ordersFilterBar">
          <input
            className="input"
            placeholder="Search customer / seller / phone / order ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            {/* <option value="DRAFT">Draft</option> */}
            <option value="CONFIRMED">Confirmed</option>
            {/* <option value="PACKED">Packed</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option> */}
          </select>
        </div>

        <div className="ordersCountRow">
          <span className="miniChip">{filteredOrders.length} order(s)</span>
        </div>

        <div className="orderListColumn">
          {filteredOrders.length === 0 ? (
            <div className="emptyPanelState">
              No orders yet. Create a new order to begin.
            </div>
          ) : (
            <>
              <div className="orderGroup">
                <div className="orderGroupTitle">Draft Orders</div>

                {draftOrders.length === 0 ? (
                  <div className="emptyPanelState smallEmpty">No draft orders.</div>
                ) : (
                  draftOrders.map((o) => (
                    <div
                      key={o.id}
                      className={`orderInboxCard ${o.id === selectedId ? "active" : ""}`}
                    >
                      <button
                        type="button"
                        className="orderInboxMain"
                        onClick={() => setSelectedId(o.id)}
                      >
                        <div className="orderInboxTop">
                          <div className="orderInboxCustomer">
                            {o.customerName || "(No customer)"}
                          </div>
                          <StatusBadge status={o.status} />
                        </div>

                        <div className="orderInboxMeta">
                          <span>{o.sellerName || "Seller?"}</span>
                          <span>•</span>
                          <span>{o.phone || "No phone"}</span>
                        </div>

                        <div className="orderInboxDate">
                          {o.createdAt ? new Date(o.createdAt).toLocaleString() : ""}
                        </div>
                      </button>

                      {!isAdmin && (
                        // draft orders can be deleted by sellers, but confirmed orders cannot
                        <div className="orderInboxActions">
                          <button
                            className="btn danger"
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

              <div className="orderGroup">
                <div className="orderGroupTitle">Order Bag</div>

                {confirmedOrders.length === 0 ? (
                  <div className="emptyPanelState smallEmpty">
                    No confirmed orders yet.
                  </div>
                ) : (
                  confirmedOrders.map((o) => (
                    <div
                      key={o.id}
                      className={`orderInboxCard added ${o.id === selectedId ? "active" : ""}`}
                    >
                      <button
                        type="button"
                        className="orderInboxMain"
                        onClick={() => setSelectedId(o.id)}
                      >
                        <div className="orderInboxTop">
                          <div className="orderInboxCustomer">
                            {o.customerName || "(No customer)"}
                          </div>
                          <StatusBadge status={o.status} />
                        </div>

                        <div className="orderInboxMeta">
                          <span>{o.sellerName || "Seller?"}</span>
                          <span>•</span>
                          <span>{o.phone || "No phone"}</span>
                        </div>

                        <div className="orderInboxSubmitted">
                          Confirmed •{" "}
                          {o.sellerSubmittedAt
                            ? new Date(o.sellerSubmittedAt).toLocaleString()
                            : ""}
                        </div>

                        <div className="orderInboxDate">
                          {o.createdAt ? new Date(o.createdAt).toLocaleString() : ""}
                        </div>
                      </button>

                      {!isAdmin && (
                        <div className="orderInboxActions">
                          <button
                            className="btn danger"
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
            </>
          )}
        </div>
      </section>

      <section className="ordersPanel editorPanel">
        {!selected ? (
          <div className="emptyPanelState">
            Select an order from the left or create a new one.
          </div>
        ) : (
          <>
            <div className="ordersPanelHeader">
              <div>
                <h2 className="ordersPanelTitle">Order Details</h2>
                <p className="ordersPanelText">
                  Customer, shipping, and delivery information.
                </p>
              </div>

              <div className="orderEditorMeta">
                <StatusBadge status={selected.status} />
                {selected.sellerSubmittedAt && (
                  <span className="miniChip">
                    Confirmed • {new Date(selected.sellerSubmittedAt).toLocaleString()}
                  </span>
                )}
                <span className="orderIdText">ID: {selected.id}</span>
              </div>
            </div>

            {error && <div className="errorBanner">{error}</div>}

            <div className="orderMetaTopRow">
              <div className="sellerReadonlyCard">
                <div className="label">Seller / Influencer</div>
                <div className="sellerReadonlyValue">
                  {selected.sellerName ||
                    (isAdmin ? "No seller selected" : session.influencerName || "-")}
                </div>
                <div className="small">
                  {isAdmin
                    ? "Admin can review seller identity from the order."
                    : "Automatically pulled from your login session."}
                </div>
              </div>

              <div className="completionCard">
                <div className="label">Order Completion</div>
                <div className="completionValue">{formCompletion}%</div>
                <div className="progressTrack">
                  <div
                    className="progressFill"
                    style={{ width: `${formCompletion}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="editorGrid">
              <div>
                <div className="label">Customer Name</div>
                <input
                  // className="input"
                  className={`input ${isMissing("Customer Name") ? "inputError" : ""}`}
                  value={selected.customerName || ""}
                  disabled={isLocked || saving}
                  onChange={(e) => updateOrderPatch({ customerName: e.target.value })}
                  placeholder="Customer account / buyer name"
                />
              </div>

              <div>
                <div className="label">Recipient Name</div>
                <input
                  // className="input"
                  className={`input ${isMissing("Recipient Name") ? "inputError" : ""}`}
                  value={selected.recipientName || ""}
                  disabled={isLocked || saving}
                  onChange={(e) => rebuildAddress({ recipientName: e.target.value })}
                  placeholder="Actual receiver name"
                />
              </div>

              <div>
                <div className="label">Phone</div>
                <input
                  // className="input"
                  className={`input ${isMissing("Phone") ? "inputError" : ""}`}
                  value={selected.phone || ""}
                  disabled={isLocked || saving}
                  onChange={(e) => rebuildAddress({ phone: e.target.value })}
                  placeholder="010-0000-0000"
                />
              </div>

              <div>
                <div className="label">Shipping Method</div>
                <select
                  // className="select"
                  className={`select ${isMissing("Shipping Method") ? "inputError" : ""}`}
                  value={selected.shippingMethod || "택배"}
                  disabled={isLocked || saving}
                  onChange={(e) => updateOrderPatch({ shippingMethod: e.target.value })}
                >
                  <option value="퀵">퀵</option>
                  <option value="택배">택배</option>
                  <option value="방문 수령">방문 수령</option>
                </select>
              </div>

              <div className="editorFull">
                <div className="addressBlockPro">
                  <div className="label">배송지 정보</div>

                  <div className="addressSearchRow">
                    <input
                      className="input addressPostalInput"
                      value={selected.postalCode || ""}
                      disabled={isLocked || saving}
                      onChange={(e) => rebuildAddress({ postalCode: e.target.value })}
                      placeholder="우편번호"
                    />

                    <button
                      type="button"
                      className="btn addressSearchBtn"
                      disabled={isLocked || saving}
                      onClick={() => {
                        if (!window.daum || !window.daum.Postcode) {
                          setError(
                            "주소 검색 스크립트가 아직 로드되지 않았습니다. 페이지를 새로고침해 주세요."
                          );
                          return;
                        }

                        new window.daum.Postcode({
                          oncomplete: function (data) {
                            const fullAddress =
                              data.roadAddress || data.jibunAddress || "";
                            rebuildAddress({
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

                  <div style={{ marginTop: 10 }}>
                    <input
                      // className="input"
                      className={`input ${isMissing("Address") ? "inputError" : ""}`}
                      
                      value={selected.addressMain || ""}
                      disabled={isLocked || saving}
                      onChange={(e) => rebuildAddress({ addressMain: e.target.value })}
                      placeholder="주소"
                    />
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <input
                      // className="input"
                      className={`input ${isMissing("Address Detail") ? "inputError" : ""}`}
                      value={selected.addressDetail || ""}
                      disabled={isLocked || saving}
                      onChange={(e) => rebuildAddress({ addressDetail: e.target.value })}
                      placeholder="상세주소"
                    />
                  </div>

                  <label className="addressCheckboxRow">
                    <input
                      type="checkbox"
                      checked={!!selected.saveAddressBook}
                      disabled={isLocked || saving}
                      onChange={(e) =>
                        updateOrderPatch({ saveAddressBook: e.target.checked })
                      }
                    />
                    <span>배송지 목록에 추가</span>
                  </label>
                </div>
              </div>

              <div className="editorFull">
                <div className="label">배송메모</div>
                <select
                  className="select"
                  value={selected.deliveryMemo || ""}
                  disabled={isLocked || saving}
                  onChange={(e) => rebuildAddress({ deliveryMemo: e.target.value })}
                >
                  <option value="">배송메모를 선택해 주세요.</option>
                  <option value="문 앞에 놓아주세요.">문 앞에 놓아주세요.</option>
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
          </>
        )}
      </section>

      <section className="ordersPanel builderPanel">
        {!selected ? (
          <div className="emptyPanelState">No order selected.</div>
        ) : (
          <>
            <div className="ordersPanelHeader">
              <div>
                <h2 className="ordersPanelTitle">Order Builder</h2>
                <p className="ordersPanelText">
                  Follow the steps below to add items, review the order, and confirm it.
                </p>
              </div>
            </div>

            <div className="builderBlock">
              <div className="builderBlockHeader">
                <div>
                  <div className="builderStep">Step 1</div>
                  <div className="sectionTitle">Add Items</div>
                  <div className="sectionSubtitle">
                    Choose what you want to include in this order.
                  </div>
                </div>
              </div>

              <div className="quickActionRow">
                <button
                  className="btn"
                  onClick={() => addLine("PRODUCT")}
                  disabled={isLocked || saving}
                  type="button"
                >
                  + Product
                </button>
                <button
                  className="btn"
                  onClick={() => addLine("SET")}
                  disabled={isLocked || saving}
                  type="button"
                >
                  + Set
                </button>
                <button
                  className="btn"
                  onClick={() => addLine("GIFT")}
                  disabled={isLocked || saving}
                  type="button"
                >
                  + Gift
                </button>
              </div>
            </div>

            <div className="builderBlock">
              <div className="builderBlockHeader">
                <div>
                  <div className="builderStep">Step 2</div>
                  <div className="sectionTitle">Current Order Items</div>
                  <div className="sectionSubtitle">
                    Review and edit the items currently added to this order.
                  </div>
                </div>
                <div className="miniChip">{lines.length} row(s)</div>
              </div>

              {orderedItemsSummary.length === 0 ? (
                <div className="emptyPanelState" style={{ marginTop: 12 }}>
                  No items added yet. Start with + Product, + Set, or + Gift.
                </div>
              ) : (
                <div className="orderedSummaryList">
                  {/* {orderedItemsSummary.map((item, idx) => (
                    <div
                      key={`${item.itemType}_${item.itemCode}_${idx}`}
                      className="orderedSummaryRow"
                    >
                      <div className="orderedSummaryLeft">
                        <div className="orderedSummaryName">
                          {item.itemName || "(Unselected item)"}
                        </div>
                        <div className="orderedSummaryMeta">
                          <span className="miniChip">{item.itemType}</span>
                          {item.itemCode ? (
                            <span className="small">{item.itemCode}</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="orderedSummaryQty">x{item.qty}</div>
                    </div>
                  ))} */}
{orderedItemsSummary.map((item, idx) => {

  const key = `${item.itemType}_${item.itemCode}_${idx}`;
  const expanded = expandedItems[key];

const components =
  item.itemType === "SET"
    ? getSetComponents(item.itemCode || item.sku)
    : [];
    
  return (
    <div key={key} className="orderedSummaryRow">

      <div className="orderedSummaryLeft">

        <div
          className="orderedSummaryName"
          style={{ cursor: components.length ? "pointer" : "default" }}
          onClick={() => {
            if (components.length) toggleExpand(key);
          }}
        >

          {components.length > 0 && (
            <span className="expandArrow">
              {expanded ? "▼" : "▶"}
            </span>
          )}

          {item.itemName || "(Unselected item)"}

        </div>

        <div className="orderedSummaryMeta">
          <span className="miniChip">{item.itemType}</span>

          {item.itemCode && (
            <span className="small">{item.itemCode}</span>
          )}
        </div>

        {expanded && components.length > 0 && (
          <div style={{ marginTop: 6, marginLeft: 18, fontSize: 13, opacity: 0.85 }}>
            {components.map((c, i) => (
              <div key={i}>
                • {c.name} × {c.qty}
              </div>
            ))}
          </div>
        )}

      </div>

      <div className="orderedSummaryQty">
        x{item.qty}
      </div>

    </div>
  );
})}
                </div>
              )}

              <div className="builderSection" style={{ marginTop: 16 }}>
                <div style={{marginBottom:10}}>
<button
className="btn danger"
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
              </div>
            </div>

            <div className="builderBlock">
              <div className="builderBlockHeader">
                <div>
                  <div className="builderStep">Step 3</div>
                  <div className="sectionTitle">Review & Confirm</div>
                  <div className="sectionSubtitle">
                    Check the totals below, then confirm the order.
                  </div>
                </div>
              </div>

              <div className="summaryCard compactSummaryCard">
                <div className="summaryHeader">
                  <div className="summaryTitle">Order Summary</div>
                  <StatusBadge status={selected.status} />
                </div>

                <div className="summaryGrid">
                  <div className="summaryItem">
                    <span>Lines</span>
                    <strong>{orderSummary.totalLines}</strong>
                  </div>
                  <div className="summaryItem">
                    <span>Total Qty</span>
                    <strong>{orderSummary.totalQty}</strong>
                  </div>
                  <div className="summaryItem">
                    <span>Products</span>
                    <strong>{orderSummary.productLines}</strong>
                  </div>
                  <div className="summaryItem">
                    <span>Sets</span>
                    <strong>{orderSummary.setLines}</strong>
                  </div>
                  <div className="summaryItem">
                    <span>Gifts</span>
                    <strong>{orderSummary.giftLines}</strong>
                  </div>
                  <div
                    className={`summaryItem ${
                      orderSummary.warnings > 0 || invalidLineCount > 0
                        ? "warning"
                        : ""
                    }`}
                  >
                    <span>Warnings</span>
                    <strong>{orderSummary.warnings + invalidLineCount}</strong>
                  </div>
                </div>

                {(invalidLineCount > 0 || orderSummary.warnings > 0) && (
                  <div className="summaryWarningBox">
                    {invalidLineCount > 0 && (
                      <div>• {invalidLineCount} incomplete order line(s)</div>
                    )}
                    {orderSummary.warnings > 0 && (
                      <div>• {orderSummary.warnings} stock warning(s)</div>
                    )}
                  </div>
                )}
              </div>

              <div className="confirmActionBox">
                <div className="confirmMeta">
                  <StatusBadge status={selected.status} />
                  <span className="orderIdText">ID: {selected.id}</span>
                  {selected.sellerSubmittedAt && (
                    <span className="miniChip">
                      Confirmed • {new Date(selected.sellerSubmittedAt).toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="confirmButtonRow">
                  {!isAdmin && (
                    <button
                      className="btn primary"
                      disabled={
  saving ||
  (selected?.status || "DRAFT") !== "DRAFT"
}
                      onClick={sellerConfirmOrder}
                      type="button"
                    >
                      {(selected?.status || "DRAFT") === "DRAFT"
                        ? "Confirm Order"
                        : "Order Confirmed"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="builderBlock">
              <div className="builderBlockHeader">
                <div>
                  <div className="builderStep">Step 4</div>
                  <div className="sectionTitle">Stock Check</div>
                  <div className="sectionSubtitle">
                    Confirm that stock is available before finalizing.
                  </div>
                </div>
              </div>

              <div className="stockCheckPill">
                <span
                  className={`stockCheckDot ${
                    confirmPreview.ok ? "good" : "bad"
                  }`}
                />
                <span>
                  {confirmPreview.ok
                    ? "Stock looks good for this order."
                    : "Insufficient stock for one or more items."}
                </span>
              </div>

              <div className="tableWrap" style={{ marginTop: 12 }}>
                <table>
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
                                <span className="missingProductText">
                                  (Missing product mapping)
                                </span>
                              ) : (
                                r.productName
                              )}
                            </td>
                            <td className="right">{r.qty}</td>
                            <td className="right">
                              <span
                                className={`stockLevelBadge ${
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
            </div>
          </>
        )}
      </section>
    </div>
    </>
  );
}