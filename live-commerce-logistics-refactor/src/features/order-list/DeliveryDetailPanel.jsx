import { buildAddress, getOptionInfo, getProductName } from "./order-list-utils.js";

export default function DeliveryDetailPanel({
  focusedOrder,
  focusedLifecycle,
  shippingCourier,
  setShippingCourier,
  shippingTracking,
  setShippingTracking,
  working,
  hasUnsavedShippingChanges,
  handleSaveShippingInfo,
  handleMarkCompleted,
  handleReopenDelivery,
  focusedOrderLines,
}) {
  if (!focusedOrder) return null;

  return (
    <section className="premiumDetailPanel">
      <div className="premiumSectionHead">
        <div>
          <h2>Delivery Detail Panel</h2>
          <p>
            {focusedOrder.customerName || "-"} · {focusedOrder.sellerName || "-"} · {focusedLifecycle?.label || "-"}
          </p>
        </div>
        <div className={`statusPill ${focusedLifecycle?.className || "new"}`}>{focusedLifecycle?.label || "-"}</div>
      </div>

      <div className="premiumDetailGrid">
        <div className="premiumInfoCard">
          <div className="premiumInfoLabel">Customer</div>
          <div className="premiumInfoValue">{focusedOrder.customerName || "-"}</div>
        </div>
        <div className="premiumInfoCard">
          <div className="premiumInfoLabel">Recipient</div>
          <div className="premiumInfoValue">{focusedOrder.recipientName || "-"}</div>
        </div>
        <div className="premiumInfoCard">
          <div className="premiumInfoLabel">Phone</div>
          <div className="premiumInfoValue">{focusedOrder.phone || "-"}</div>
        </div>
        <div className="premiumInfoCard span2">
          <div className="premiumInfoLabel">Address</div>
          <div className="premiumInfoValue">{buildAddress(focusedOrder) || focusedOrder.address || "-"}</div>
        </div>
      </div>

      <div className="premiumShippingPanel">
        <div className="premiumShippingFields">
          <div>
            <label>택배사</label>
            <input className="premiumField" value={shippingCourier} onChange={(e) => setShippingCourier(e.target.value)} placeholder="예: CJ대한통운" />
          </div>

          <div>
            <label>운송장번호</label>
            <input className="premiumField" value={shippingTracking} onChange={(e) => setShippingTracking(e.target.value)} placeholder="Tracking number" />
          </div>
        </div>

        <div className="premiumShippingActions">
          <button className="premiumOrderBtn" disabled={working || !hasUnsavedShippingChanges} onClick={handleSaveShippingInfo}>
            배송정보 저장
          </button>

          <button
            className="premiumOrderBtn success"
            disabled={working || !String(shippingTracking || focusedOrder?.trackingNumber || "").trim() || !!focusedOrder?.deliveryCompletedAt}
            onClick={handleMarkCompleted}
          >
            배송완료
          </button>

          <button className="premiumOrderBtn warn" disabled={working || !focusedOrder?.deliveryCompletedAt} onClick={handleReopenDelivery}>
            완료취소
          </button>
        </div>

        <div className="premiumItemsTableWrap">
          <table className="premiumMiniTable">
            <thead>
              <tr>
                <th>상품명</th>
                <th>옵션정보</th>
                <th>수량</th>
              </tr>
            </thead>
            <tbody>
              {focusedOrderLines.length === 0 ? (
                <tr>
                  <td colSpan={3}>No items.</td>
                </tr>
              ) : (
                focusedOrderLines.map((line) => (
                  <tr key={line.id}>
                    <td>{getProductName(line)}</td>
                    <td>{getOptionInfo(line)}</td>
                    <td>{line.qty || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
