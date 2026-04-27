import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../data/useStore.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { expandOrderForPacking } from "../lib/inventory.js";

function downloadFile(filename, content, mime = "text/plain;charset=utf-8") {
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

export default function Packing() {
  const nav = useNavigate();
  const { orderId } = useParams();
  const { state } = useStore();

  const order = (state.orders || []).find((o) => o.id === orderId);

  if (!order) {
    return (
      <div className="card">
        <h1 className="h1">Packing List</h1>
        <p className="p">Order not found.</p>
        <div className="toolbar">
          <button
            className="btn"
            onClick={() => nav("/order-list")}
            type="button"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const packing = expandOrderForPacking(state, order.id);

  const confirmedAtText = order.sellerSubmittedAt
    ? new Date(order.sellerSubmittedAt).toLocaleString()
    : "-";

  const shippingAddress = [
    order.postalCode || "",
    order.addressMain || "",
    order.addressDetail || "",
  ]
    .filter(Boolean)
    .join(" / ");

  const customerDetailsCombined = order.address || "-";

  function saveOrderCsv() {
    const baseColumns = {
      OrderId: order.id || "-",
      Seller: order.sellerName || "-",
      Customer: order.customerName || "-",
      Phone: order.phone || "-",
      Address: shippingAddress || "-",
      Shipping: order.shippingMethod || "-",
      Status: order.status || "DRAFT",
      ConfirmedAt: confirmedAtText,
      CustomerDetailsCombined: customerDetailsCombined,
    };

    const rows = [];

    if ((packing.pick || []).length > 0) {
      packing.pick.forEach((r) => {
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

    if ((packing.gifts || []).length > 0) {
      packing.gifts.forEach((r) => {
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

    const safeName = (order.customerName || "Customer").replace(
      /[^\w-]+/g,
      "_"
    );
    const filename = `Packing_${safeName}_${String(order.id || "").slice(0, 6)}.csv`;

    downloadFile(filename, csvLines.join("\n"), "text/csv;charset=utf-8");
  }

  return (
    <div className="card printCard">
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div>
          <h1 className="h1">Packing List</h1>
          <p className="p">Sets are expanded into real products for picking.</p>
        </div>

        <div className="toolbar noPrint">
          <button
            className="btn"
            onClick={() => nav("/order-list")}
            type="button"
          >
            Back to Order List
          </button>
          <button className="btn" onClick={saveOrderCsv} type="button">
            Save CSV
          </button>
          <button
            className="btn primary"
            onClick={() => window.print()}
            type="button"
          >
            Print
          </button>
        </div>
      </div>

      <div className="hr" />

      <div className="packingInfoGrid">
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
          <div className="label">Status</div>
          <StatusBadge status={order.status} />
        </div>

        <div>
          <div className="label">Order Confirmed At</div>
          <div className="chip">{confirmedAtText}</div>
        </div>
      </div>

      <div className="hr" />

      <div>
        <div className="sectionTitle" style={{ marginBottom: 10 }}>
          배송지 정보
        </div>

        <div className="packingInfoGrid">
          <div>
            <div className="label">Recipient Name</div>
            <div className="chip">{order.recipientName || "-"}</div>
          </div>

          <div>
            <div className="label">Postal Code</div>
            <div className="chip">{order.postalCode || "-"}</div>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div className="label">Address</div>
            <div className="packingAddressBox">{order.addressMain || "-"}</div>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div className="label">Detail Address</div>
            <div className="packingAddressBox">
              {order.addressDetail || "-"}
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div className="label">Delivery Memo</div>
            <div className="packingAddressBox">
              {order.deliveryMemo || "-"}
            </div>
          </div>
        </div>
      </div>

      <div className="hr" />

      <div>
        <div className="label">Customer Details (Combined)</div>
        <div className="packingAddressBox">{customerDetailsCombined}</div>
      </div>

      <div className="hr" />

      <h2 className="h2">Pick List (Warehouse)</h2>
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
            {(packing.pick || []).length === 0 ? (
              <tr>
                <td colSpan="3" className="small">
                  No products in this order.
                </td>
              </tr>
            ) : (
              packing.pick.map((row, idx) => (
                <tr key={`${row.productCode || "product"}-${idx}`}>
                  <td>{row.productCode || "-"}</td>
                  <td>{row.productName || "-"}</td>
                  <td className="right">{row.qty ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="hr" />

      <h2 className="h2">Gifts</h2>
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
            {(packing.gifts || []).length === 0 ? (
              <tr>
                <td colSpan="3" className="small">
                  No gifts for this order.
                </td>
              </tr>
            ) : (
              packing.gifts.map((row, idx) => (
                <tr key={`${row.giftCode || "gift"}-${idx}`}>
                  <td>{row.giftCode || "-"}</td>
                  <td>{row.giftName || "-"}</td>
                  <td className="right">{row.qty ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="hr" />
      <div className="small">
        Tip: Confirm the order on the Influencer/Seller page to deduct stock before shipping.
      </div>
    </div>
  );
}