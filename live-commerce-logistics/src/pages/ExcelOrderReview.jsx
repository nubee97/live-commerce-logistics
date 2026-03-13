import { useLocation, useNavigate } from "react-router-dom";
import { newId } from "../data/store.js";
import { upsertOrder, replaceOrderItems } from "../lib/db.js";
import { useAuth } from "../auth/AuthProvider.jsx";

export default function ExcelOrderReview() {

  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();

  const { orderInfo = {}, items = [] } = location.state || {};

  // Robust Excel field normalization
  const phone =
    orderInfo.phone ||
    orderInfo["Phone"] ||
    orderInfo["Phone Number"] ||
    orderInfo["Mobile"] ||
    orderInfo.mobile ||
    "";

  const deliveryMemo =
    orderInfo.deliveryMemo ||
    orderInfo["Delivery Memo"] ||
    orderInfo["Shipping Memo"] ||
    orderInfo.shippingMemo ||
    "";

  async function confirmOrder() {

    const orderId = newId();

    const order = {
      id: orderId,
      orderNumber: orderId,
      orderSource: "EXCEL",
      createdAt: new Date().toISOString(),
      status: "CONFIRMED",

      // Priority: session → Excel → fallback
      sellerName:
        session?.influencerName ||
        orderInfo.sellerName ||
        orderInfo["Seller Name"] ||
        "Unknown Seller",

      customerName:
        orderInfo.customerName ||
        orderInfo["Customer Name"] ||
        "",

      recipientName:
        orderInfo.recipientName ||
        orderInfo["Recipient Name"] ||
        "",

      phone: phone,

      shippingMethod:
        orderInfo.shippingMethod ||
        orderInfo["Shipping Method"] ||
        "택배",

      address:
        orderInfo.address ||
        orderInfo["Address"] ||
        "",

      deliveryMemo: deliveryMemo
    };

    const orderLines = items.map((item) => ({
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

    navigate("/orders");
  }

  return (

    <div className="ordersPanel">

      <h2>Review Excel Order</h2>

      <div className="card">

        <h3>Customer Info</h3>

        <p>
          <strong>Seller:</strong>{" "}
          {session?.influencerName ||
           orderInfo.sellerName ||
           orderInfo["Seller Name"] ||
           "-"}
        </p>

        <p>
          <strong>Customer:</strong>{" "}
          {orderInfo.customerName ||
           orderInfo["Customer Name"] ||
           "-"}
        </p>

        <p>
          <strong>Recipient:</strong>{" "}
          {orderInfo.recipientName ||
           orderInfo["Recipient Name"] ||
           "-"}
        </p>

        <p>
          <strong>Phone:</strong>{" "}
          {phone || "-"}
        </p>

        <p>
          <strong>Shipping Method:</strong>{" "}
          {orderInfo.shippingMethod ||
           orderInfo["Shipping Method"] ||
           "택배"}
        </p>

        <p>
          <strong>Address:</strong>{" "}
          {orderInfo.address ||
           orderInfo["Address"] ||
           "-"}
        </p>

        <p>
          <strong>Delivery Memo:</strong>{" "}
          {deliveryMemo || "-"}
        </p>

      </div>

      <div className="card">

        <h3>Products</h3>

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
            {items.length > 0 ? (
              items.map((item, i) => (
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

      <button className="btn primary" onClick={confirmOrder}>
        Confirm Order
      </button>

      <button className="btn ghost" onClick={() => navigate("/orders")}>
        Cancel
      </button>

    </div>
  );
}