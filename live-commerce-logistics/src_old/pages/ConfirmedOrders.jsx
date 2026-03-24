import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../data/StoreProvider.jsx";
import { computePickList, computeGiftList } from "../lib/inventory.js";

export default function ConfirmedOrders() {
  const { state } = useStore();
  const nav = useNavigate();

  const confirmed = useMemo(() => {
    return state.orders
      .filter((o) => ["CONFIRMED", "PACKED", "SHIPPED"].includes(o.status))
      .slice()
      .sort((a, b) => (b.paidAt || b.createdAt || "").localeCompare(a.paidAt || a.createdAt || ""));
  }, [state.orders]);

  return (
    <div className="card">
      <div className="row" style={{ alignItems: "flex-end" }}>
        <div>
          <h1 className="h1">Confirmed Orders</h1>
          <p className="p">Orders confirmed by influencers/sellers (includes Paid Time).</p>
        </div>
        <div className="noPrint" style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button className="btn" onClick={() => nav("/dashboard")} type="button">Back to Dashboard</button>
          <button className="btn" onClick={() => nav("/orders")} type="button">Go to Influencer/Seller</button>
        </div>
      </div>

      <div className="hr" />

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Paid Time</th>
              <th>Status</th>
              <th>Seller</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Country/City</th>
              <th>Shipping</th>
              <th className="right">Pick Items</th>
              <th className="right">Gifts</th>
              <th className="right noPrint">Actions</th>
            </tr>
          </thead>

          <tbody>
            {confirmed.length === 0 ? (
              <tr>
                <td colSpan="10" className="small">No confirmed orders yet.</td>
              </tr>
            ) : (
              confirmed.map((o) => {
                const pick = computePickList(state, o.id);
                const gifts = computeGiftList(state, o.id);

                const paid = o.paidAt ? new Date(o.paidAt).toLocaleString() : "-";
                const cc = `${o.country || "-"} / ${o.city || "-"}`;

                return (
                  <tr key={o.id}>
                    <td>{paid}</td>
                    <td>{o.status}</td>
                    <td>{o.sellerName || "-"}</td>
                    <td>{o.customerName || "-"}</td>
                    <td>{o.phone || "-"}</td>
                    <td>{cc}</td>
                    <td>{o.shippingMethod || "-"}</td>
                    <td className="right">{pick.reduce((sum, r) => sum + (Number(r.qty) || 0), 0)}</td>
                    <td className="right">{gifts.reduce((sum, r) => sum + (Number(r.qty) || 0), 0)}</td>
                    <td className="right noPrint">
                      <button className="btn" onClick={() => nav(`/packing/${o.id}`)} type="button">
                        Packing List
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}