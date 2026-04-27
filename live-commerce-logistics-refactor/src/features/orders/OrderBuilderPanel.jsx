import OrdersEditableTable from "../../components/OrdersEditableTable.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";

export default function OrderBuilderPanel({
  lines,
  addLine,
  isLocked,
  saving,
  orderedItemsSummary,
  expandedItems,
  toggleExpand,
  getSetComponents,
  deleteSelectedLines,
  selectedProducts,
  lineCols,
  updateLine,
  deleteLine,
  orderSummary,
  invalidLineCount,
  selected,
  isAdmin,
  sellerConfirmOrder,
  confirmPreview,
}) {
  return (
    <section className="ordersPremiumPanel ordersPremiumBuilder">
      <div className="ordersPremiumPanelHead">
        <div>
          <h2>Order Builder</h2>
          <p>A simpler flow: add items, review them, confirm, then check stock.</p>
        </div>
      </div>

      <div className="ordersPremiumBuilderStack">
        <section className="ordersPremiumStepCard">
          <div className="ordersPremiumStepLabel">STEP 1</div>
          <h3>Add Items</h3>
          <p>Start by adding products, sets, or gifts.</p>

          <div className="ordersPremiumActionRow">
            <button className="ordersPremiumGhostBtn" onClick={() => addLine("PRODUCT")} disabled={isLocked || saving} type="button">
              + Product
            </button>
            <button className="ordersPremiumGhostBtn" onClick={() => addLine("SET")} disabled={isLocked || saving} type="button">
              + Set
            </button>
            <button className="ordersPremiumGhostBtn" onClick={() => addLine("GIFT")} disabled={isLocked || saving} type="button">
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
            <div className="ordersPremiumEmptyState">No items added yet.</div>
          ) : (
            <div className="ordersPremiumSummaryList">
              {orderedItemsSummary.map((item, idx) => {
                const key = `${item.itemType}_${item.itemCode}_${idx}`;
                const expanded = expandedItems[key];
                const components = item.itemType === "SET" ? getSetComponents(item.itemCode || item.sku) : [];

                return (
                  <div key={key} className="ordersPremiumSummaryRow">
                    <div className="ordersPremiumSummaryLeft">
                      <div
                        className="ordersPremiumSummaryName"
                        onClick={() => {
                          if (components.length) toggleExpand(key);
                        }}
                        style={{ cursor: components.length ? "pointer" : "default" }}
                      >
                        {components.length > 0 && <span className="ordersPremiumExpandArrow">{expanded ? "▼" : "▶"}</span>}
                        {item.itemName || "(Unselected item)"}
                      </div>

                      <div className="ordersPremiumSummaryMeta">
                        <span className="ordersPremiumTag">{item.itemType}</span>
                        {item.itemCode && <span>{item.itemCode}</span>}
                      </div>

                      {expanded && components.length > 0 && (
                        <div className="ordersPremiumSetBreakdown">
                          {components.map((c, i) => (
                            <div key={i}>• {c.name} × {c.qty}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="ordersPremiumSummaryQty">x{item.qty}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="ordersPremiumDeleteSelectedBar">
            <button className="ordersPremiumDangerBtn" onClick={deleteSelectedLines} disabled={selectedProducts.length === 0}>
              Delete Selected ({selectedProducts.length})
            </button>
          </div>

          <OrdersEditableTable rows={lines} columns={lineCols} onUpdate={(id, patch) => updateLine(id, patch)} onDelete={(id) => deleteLine(id)} emptyText="Add at least one line item." />
        </section>

        <section className="ordersPremiumStepCard">
          <div className="ordersPremiumStepLabel">STEP 3</div>
          <h3>Review & Confirm</h3>
          <p>Check totals, warnings, and confirm when ready.</p>

          <div className="ordersPremiumSummaryGrid">
            <div className="ordersPremiumSummaryMetric"><span>Lines</span><strong>{orderSummary.totalLines}</strong></div>
            <div className="ordersPremiumSummaryMetric"><span>Total Qty</span><strong>{orderSummary.totalQty}</strong></div>
            <div className="ordersPremiumSummaryMetric"><span>Products</span><strong>{orderSummary.productLines}</strong></div>
            <div className="ordersPremiumSummaryMetric"><span>Sets</span><strong>{orderSummary.setLines}</strong></div>
            <div className="ordersPremiumSummaryMetric"><span>Gifts</span><strong>{orderSummary.giftLines}</strong></div>
            <div className="ordersPremiumSummaryMetric warning"><span>Warnings</span><strong>{orderSummary.warnings + invalidLineCount}</strong></div>
          </div>

          {(invalidLineCount > 0 || orderSummary.warnings > 0) && (
            <div className="ordersPremiumWarningBox">
              {invalidLineCount > 0 && <div>• {invalidLineCount} incomplete order line(s)</div>}
              {orderSummary.warnings > 0 && <div>• {orderSummary.warnings} stock warning(s)</div>}
            </div>
          )}

          <div className="ordersPremiumConfirmBar">
            <div className="ordersPremiumMetaRow">
              <StatusBadge status={selected.status} />
              <span className="ordersPremiumIdText">ID: {selected.id}</span>
            </div>

            {!isAdmin && (
              <button className="ordersPremiumPrimaryBtn" disabled={saving || (selected?.status || "DRAFT") !== "DRAFT"} onClick={sellerConfirmOrder} type="button">
                {(selected?.status || "DRAFT") === "DRAFT" ? "Confirm Order" : "Order Confirmed"}
              </button>
            )}
          </div>
        </section>

        <section className="ordersPremiumStepCard">
          <div className="ordersPremiumStepLabel">STEP 4</div>
          <h3>Stock Check</h3>
          <p>Final stock review before submission.</p>

          <div className="ordersPremiumStockPill">
            <span className={`ordersPremiumStockDot ${confirmPreview.ok ? "good" : "bad"}`} />
            <span>{confirmPreview.ok ? "Stock looks good for this order." : "Insufficient stock for one or more items."}</span>
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
                    <td colSpan="4" className="small">No pick items yet.</td>
                  </tr>
                ) : (
                  confirmPreview.pick.map((r) => {
                    const ok = (Number(r.stock) || 0) >= (Number(r.qty) || 0);

                    return (
                      <tr key={r.productCode}>
                        <td>{r.productCode}</td>
                        <td>
                          {r.productName === "(Missing product)" ? <span className="ordersPremiumMissingText">(Missing product mapping)</span> : r.productName}
                        </td>
                        <td className="right">{r.qty}</td>
                        <td className="right">
                          <span className={`ordersPremiumStockBadge ${ok ? "ok" : "low"}`}>{r.stock}</span>
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
  );
}
