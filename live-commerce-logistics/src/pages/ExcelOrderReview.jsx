import { useLocation, useNavigate } from "react-router-dom";
import { newId } from "../data/store.js";
import { upsertOrder, replaceOrderItems } from "../lib/db.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useStore } from "../data/StoreProvider.jsx";

export default function ExcelOrderReview() {

  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const { refreshFromDb } = useStore();

  const { orders = [] } = location.state || {};

  async function confirmOrders() {

    if (!orders.length) {
      alert("No orders found.");
      return;
    }

    for (const o of orders) {

      const orderId = newId();

      const order = {

        id: orderId,
        orderNumber: orderId,
        orderSource: "EXCEL",

        createdAt: new Date().toISOString(),
        sellerSubmittedAt: new Date().toISOString(),

        status: "CONFIRMED",

        /* influencer identification */
        sellerId: session?.userId || session?.id || "",
        sellerName:
          session?.influencerName ||
          o.orderInfo.sellerName ||
          "Unknown Seller",

        customerName: o.orderInfo.customerName || "",
        recipientName: o.orderInfo.recipientName || "",
        phone: o.orderInfo.phone || "",

        shippingMethod:
          o.orderInfo.shippingMethod || "택배",

        address:
          o.orderInfo.address || "",

        deliveryMemo:
          o.orderInfo.deliveryMemo || ""

      };

      const orderLines = o.items.map((item) => ({
        id: newId(),
        orderId: orderId,

        itemType: "PRODUCT",

        itemCode: item.itemCode,
        itemName: item.itemName,

        sku: item.itemCode,
        officialName: item.itemName,

        qty: Number(item.qty || 1),
        salePrice: Number(item.salePrice || 0),

        createdAt: new Date().toISOString()
      }));

      await upsertOrder(order);
      await replaceOrderItems(orderId, orderLines);
    }

    // IMPORTANT FIX
    await refreshFromDb();

    navigate("/orders");
  }

  return (

    <div className="ordersPanel">

      <h2>Review Excel Orders</h2>

      {orders.length === 0 && (
        <div className="card">
          No orders detected in Excel file.
        </div>
      )}

      {orders.map((o, index) => (

        <div key={index} className="card">

          <h3>Order {index + 1}</h3>

          <p>
            <strong>Seller:</strong>{" "}
            {session?.influencerName ||
             o.orderInfo.sellerName ||
             "-"}
          </p>

          <p>
            <strong>Customer:</strong>{" "}
            {o.orderInfo.customerName || "-"}
          </p>

          <p>
            <strong>Recipient:</strong>{" "}
            {o.orderInfo.recipientName || "-"}
          </p>

          <p>
            <strong>Phone:</strong>{" "}
            {o.orderInfo.phone || "-"}
          </p>

          <p>
            <strong>Shipping Method:</strong>{" "}
            {o.orderInfo.shippingMethod || "택배"}
          </p>

          <p>
            <strong>Address:</strong>{" "}
            {o.orderInfo.address || "-"}
          </p>

          <p>
            <strong>Delivery Memo:</strong>{" "}
            {o.orderInfo.deliveryMemo || "-"}
          </p>

          <h4>Products</h4>

          <table>

            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Qty</th>
                <th>Price</th>
              </tr>
            </thead>

            <tbody>

              {o.items.length > 0 ? (
                o.items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.itemCode || "-"}</td>
                    <td>{item.itemName || "-"}</td>
                    <td>{item.qty || 1}</td>
                    <td>{item.salePrice || 0}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">No products found</td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      ))}

      {orders.length > 0 && (

        <div style={{ marginTop: 20 }}>

          <button
            className="btn primary"
            onClick={confirmOrders}
          >
            Confirm All Orders
          </button>

          <button
            className="btn ghost"
            onClick={() => navigate("/orders")}
            style={{ marginLeft: 10 }}
          >
            Cancel
          </button>

        </div>

      )}

    </div>
  );
}