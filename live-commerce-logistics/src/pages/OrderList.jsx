import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../data/StoreProvider.jsx";
import { computePickList, computeGiftList } from "../lib/inventory.js";

function downloadFile(filename, content, mime = "text/plain;charset=utf-8") {
  // const blob = new Blob([content], { type: mime });
  const blob = new Blob(["\ufeff", content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function startOfDayIso(yyyyMmDd) {
  if (!yyyyMmDd) return "";
  return new Date(`${yyyyMmDd}T00:00:00`).toISOString();
}

function endOfDayIso(yyyyMmDd) {
  if (!yyyyMmDd) return "";
  return new Date(`${yyyyMmDd}T23:59:59.999`).toISOString();
}

export default function OrderList() {
  const { state } = useStore();
  const nav = useNavigate();

  const [expanded, setExpanded] = useState({});
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL"); // ALL | DRAFT | CONFIRMED
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const ordersFiltered = useMemo(() => {
    let list = [...(state.orders || [])];

    const allowedStatuses = ["DRAFT", "CONFIRMED"];
    list = list.filter((o) => allowedStatuses.includes(o.status || "DRAFT"));

    if (status !== "ALL") {
      list = list.filter((o) => (o.status || "DRAFT") === status);
    }

    const fromIso = startOfDayIso(fromDate);
    const toIso = endOfDayIso(toDate);

    if (fromIso) {
      list = list.filter((o) => {
        const ref = o.sellerSubmittedAt || o.paidAt || o.createdAt || "";
        return ref >= fromIso;
      });
    }

    if (toIso) {
      list = list.filter((o) => {
        const ref = o.sellerSubmittedAt || o.paidAt || o.createdAt || "";
        return ref <= toIso;
      });
    }

    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((o) => {
        const customer = (o.customerName || "").toLowerCase();
        const seller = (o.sellerName || "").toLowerCase();
        const phone = (o.phone || "").toLowerCase();
        return (
          customer.includes(query) ||
          seller.includes(query) ||
          phone.includes(query)
        );
      });
    }

    return list
      .slice()
      .sort((a, b) =>
        (b.sellerSubmittedAt || b.paidAt || b.createdAt || "").localeCompare(
          a.sellerSubmittedAt || a.paidAt || a.createdAt || ""
        )
      );
  }, [state.orders, q, status, fromDate, toDate]);

  function toggle(orderId) {
    setExpanded((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  }

  function expandAll() {
    const all = {};
    for (const o of ordersFiltered) all[o.id] = true;
    setExpanded(all);
  }

  function collapseAll() {
    setExpanded({});
  }

  function clearFilters() {
    setQ("");
    setStatus("ALL");
    setFromDate("");
    setToDate("");
  }

// function saveOrderCsv(order) {
//   const pick = computePickList(state, order.id);
//   const gifts = computeGiftList(state, order.id);

//   const confirmedTime = order.sellerSubmittedAt
//     ? new Date(order.sellerSubmittedAt).toLocaleString()
//     : "-";

//   const baseColumns = {
//     OrderId: order.id || "-",
//     Seller: order.sellerName || "-",
//     Customer: order.customerName || "-",
//     Phone: order.phone || "-",
//     Country: order.country || "-",
//     City: order.city || "-",
//     Address: order.address || "-",
//     Shipping: order.shippingMethod || "-",
//     Status: order.status || "DRAFT",
//     ConfirmedAt: confirmedTime,
//   };

//   const rows = [];

//   // pick rows
//   if (pick.length > 0) {
//     pick.forEach((r) => {
//       rows.push({
//         ...baseColumns,
//         RowType: "PICK",
//         ProductCode: r.productCode || "-",
//         ProductName: r.productName || "-",
//         PickQuantity: r.qty ?? 0,
//         GiftCode: "",
//         GiftName: "",
//         GiftQuantity: "",
//       });
//     });
//   }

//   // gift rows
//   if (gifts.length > 0) {
//     gifts.forEach((r) => {
//       rows.push({
//         ...baseColumns,
//         RowType: "GIFT",
//         ProductCode: "",
//         ProductName: "",
//         PickQuantity: "",
//         GiftCode: r.giftCode || "-",
//         GiftName: r.giftName || "-",
//         GiftQuantity: r.qty ?? 0,
//       });
//     });
//   }

//   // if no pick/gift rows at all, still export one row
//   if (rows.length === 0) {
//     rows.push({
//       ...baseColumns,
//       RowType: "ORDER",
//       ProductCode: "",
//       ProductName: "",
//       PickQuantity: "",
//       GiftCode: "",
//       GiftName: "",
//       GiftQuantity: "",
//     });
//   }

//   const headers = [
//     "OrderId",
//     "Seller",
//     "Customer",
//     "Phone",
//     "Country",
//     "City",
//     "Address",
//     "Shipping",
//     "Status",
//     "ConfirmedAt",
//     "RowType",
//     "ProductCode",
//     "ProductName",
//     "PickQuantity",
//     "GiftCode",
//     "GiftName",
//     "GiftQuantity",
//   ];

//   const csvLines = [
//     headers.join(","),
//     ...rows.map((row) =>
//       headers.map((h) => escapeCsv(row[h])).join(",")
//     ),
//   ];

//   const safeName = (order.customerName || "Customer").replace(/[^\w\-]+/g, "_");
//   const filename = `Order_${safeName}_${order.id.slice(0, 6)}.csv`;

//   downloadFile(filename, csvLines.join("\n"), "text/csv;charset=utf-8");
// }
function saveOrderCsv(order) {
  const pick = computePickList(state, order.id);
  const gifts = computeGiftList(state, order.id);

  const confirmedTime = order.sellerSubmittedAt
    ? new Date(order.sellerSubmittedAt).toLocaleString()
    : "-";

  const shippingAddress = [
    order.postalCode || "",
    order.addressMain || "",
    order.addressDetail || "",
  ]
    .filter(Boolean)
    .join(" / ");

  const baseColumns = {
    OrderId: order.id || "-",
    Seller: order.sellerName || "-",
    Customer: order.customerName || "-",
    Phone: order.phone || "-",
    Address: shippingAddress || "-",
    Shipping: order.shippingMethod || "-",
    Status: order.status || "DRAFT",
    ConfirmedAt: confirmedTime,
    CustomerDetailsCombined: order.address || "-",
  };

  const rows = [];

  if (pick.length > 0) {
    pick.forEach((r) => {
      rows.push({
        ...baseColumns,
        RowType: "PICK",
        ProductCode: r.productCode || "-",
        ProductName: r.productName || "-",
        PickQuantity: r.qty ?? 0,
        GiftCode: "",
        GiftName: "",
        GiftQuantity: "",
      });
    });
  }

  if (gifts.length > 0) {
    gifts.forEach((r) => {
      rows.push({
        ...baseColumns,
        RowType: "GIFT",
        ProductCode: "",
        ProductName: "",
        PickQuantity: "",
        GiftCode: r.giftCode || "-",
        GiftName: r.giftName || "-",
        GiftQuantity: r.qty ?? 0,
      });
    });
  }

  if (rows.length === 0) {
    rows.push({
      ...baseColumns,
      RowType: "ORDER",
      ProductCode: "",
      ProductName: "",
      PickQuantity: "",
      GiftCode: "",
      GiftName: "",
      GiftQuantity: "",
    });
  }

  const headers = [
    "OrderId",
    "Seller",
    "Customer",
    "Phone",
    "Address",
    "Shipping",
    "Status",
    "ConfirmedAt",
    "CustomerDetailsCombined",
    "RowType",
    "ProductCode",
    "ProductName",
    "PickQuantity",
    "GiftCode",
    "GiftName",
    "GiftQuantity",
  ];

  const csvLines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(",")),
  ];

  const safeName = (order.customerName || "Customer").replace(/[^\w\-]+/g, "_");
  const filename = `Order_${safeName}_${order.id.slice(0, 6)}.csv`;

  downloadFile(filename, csvLines.join("\n"), "text/csv;charset=utf-8");
}

  return (
    <div className="card">
      <div className="row" style={{ alignItems: "flex-end" }}>
        <div>
          <h1 className="h1">Order List</h1>
          <p className="p">
            Search + filter by draft or confirmed orders. Expand for details, Save CSV per order.
          </p>
        </div>

        <div
          className="noPrint"
          style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}
        >
          <button className="btn" onClick={() => nav("/dashboard")} type="button">
            Back to Dashboard
          </button>
          <button className="btn" onClick={expandAll} type="button">
            Expand All
          </button>
          <button className="btn" onClick={collapseAll} type="button">
            Collapse All
          </button>
        </div>
      </div>

      <div className="hr" />

      <div className="card noPrint" style={{ background: "rgba(255,255,255,0.03)" }}>
        <div className="row">
          <div>
            <div className="label">Search (Customer / Seller / Phone)</div>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. Pascal, Chisom, 010..."
            />
          </div>

          <div>
            <div className="label">Order Status</div>
            <select
              className="select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ALL">ALL</option>
              <option value="DRAFT">DRAFT</option>
              <option value="CONFIRMED">CONFIRMED</option>
            </select>
          </div>

          {/* <div>
            <div className="label">Confirmed / Created From</div>
            <input
              className="input"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div> */}

          <div>
            <div className="label">Confirmed / Created To</div>
            <input
              className="input"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        <div className="toolbar" style={{ marginBottom: 0 }}>
          <div className="chip">Results: {ordersFiltered.length}</div>
          <button className="btn" onClick={clearFilters} type="button">
            Clear Filters
          </button>
        </div>
      </div>

      <div className="hr" />

      {ordersFiltered.length === 0 ? (
        <div className="small">No results. Try clearing filters or confirming an order first.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {ordersFiltered.map((order) => {
            const isOpen = !!expanded[order.id];
            const confirmedTime = order.sellerSubmittedAt
              ? new Date(order.sellerSubmittedAt).toLocaleString()
              : "-";
            const cc = `${order.country || "-"} / ${order.city || "-"}`;

            const pickCount = computePickList(state, order.id).reduce(
              (sum, r) => sum + (Number(r.qty) || 0),
              0
            );
            const giftCount = computeGiftList(state, order.id).reduce(
              (sum, r) => sum + (Number(r.qty) || 0),
              0
            );

            return (
              <div key={order.id} className="subcard">
                <div className="row" style={{ alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>
                      {order.customerName || "(No customer)"}{" "}
                      <span className="small">• Seller: {order.sellerName || "-"}</span>
                    </div>

                    <div className="small" style={{ marginTop: 4 }}>
                      Confirmed Time: {confirmedTime} • Status: {order.status || "DRAFT"} • {cc} • Pick {pickCount} • Gifts {giftCount}
                    </div>
                  </div>

                  <div
                    className="noPrint"
                    style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}
                  >
                    <button className="btn" onClick={() => toggle(order.id)} type="button">
                      {isOpen ? "Collapse" : "Expand"}
                    </button>

                    <button className="btn" onClick={() => saveOrderCsv(order)} type="button">
                      Save CSV
                    </button>

                    {(order.status || "DRAFT") === "CONFIRMED" && (
                      <button
                        className="btn primary"
                        onClick={() => nav(`/packing/${order.id}`)}
                        type="button"
                      >
                        Packing List
                      </button>
                    )}
                  </div>
                </div>

                {!isOpen && (
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <div className="chip">Customer: {order.customerName || "-"}</div>
                    <div className="chip">Phone: {order.phone || "-"}</div>
                    <div className="chip">Shipping: {order.shippingMethod || "-"}</div>
                    <div className="chip">Pick: {pickCount}</div>
                    <div className="chip">Gifts: {giftCount}</div>
                  </div>
                )}

                {isOpen && (
                  <>
                    <div className="hr" />

                    <div className="grid2">
                      <div>
                        <div className="label">Seller Name</div>
                        <div className="chip">{order.sellerName || "-"}</div>
                      </div>

                      <div>
                        <div className="label">Shipping Method</div>
                        <div className="chip">{order.shippingMethod || "-"}</div>
                      </div>

                      <div>
                        <div className="label">Customer</div>
                        <div className="chip">{order.customerName || "-"}</div>
                      </div>

                      <div>
                        <div className="label">Phone</div>
                        <div className="chip">{order.phone || "-"}</div>
                      </div>

                      <div>
                        <div className="label">Country / City</div>
                        <div className="chip">{cc}</div>
                      </div>

                      <div>
                        <div className="label">Status</div>
                        <div className="chip">{order.status || "DRAFT"}</div>
                      </div>

                      <div>
                        <div className="label">Order Confirmed At</div>
                        <div className="chip">{confirmedTime}</div>
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <div className="label">Customer Details (Address)</div>
                        <div
                          className="card"
                          style={{ padding: 12, background: "rgba(255,255,255,0.04)" }}
                        >
                          <div style={{ whiteSpace: "pre-wrap" }}>{order.address || "-"}</div>
                        </div>
                      </div>
                    </div>

                    <div className="hr" />

                    <h2 className="h1" style={{ fontSize: 16, marginBottom: 8 }}>
                      Pick List (Warehouse)
                    </h2>
                    <div className="tableWrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Product Code</th>
                            <th>Product Name</th>
                            <th className="right">Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const pick = computePickList(state, order.id)
                              .slice()
                              .sort((a, b) => (a.productName || "").localeCompare(b.productName || ""));
                            if (pick.length === 0) {
                              return <tr><td colSpan="3" className="small">No items.</td></tr>;
                            }
                            return pick.map((r) => (
                              <tr key={r.productCode}>
                                <td>{r.productCode}</td>
                                <td>{r.productName}</td>
                                <td className="right" style={{ fontWeight: 800 }}>{r.qty}</td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>

                    <div className="hr" />

                    <h2 className="h1" style={{ fontSize: 16, marginBottom: 8 }}>Gifts</h2>
                    <div className="tableWrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Gift Code</th>
                            <th>Gift Name</th>
                            <th className="right">Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const gifts = computeGiftList(state, order.id);
                            if (gifts.length === 0) {
                              return <tr><td colSpan="3" className="small">No gifts for this order.</td></tr>;
                            }
                            return gifts.map((r) => (
                              <tr key={r.giftCode}>
                                <td>{r.giftCode}</td>
                                <td>{r.giftName}</td>
                                <td className="right" style={{ fontWeight: 800 }}>{r.qty}</td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}