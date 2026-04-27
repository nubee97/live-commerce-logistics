import { formatDateTime, makeSellerBadge } from "./order-list-utils.js";

export default function SellerGroupSection({
  groupedSellers,
  sellerPageRows,
  openSellers,
  toggleSellerOpen,
  focusedOrderId,
  setFocusedOrderId,
  exportRowsToCsv,
  handlePackingList,
  selectedRows,
  toggleRowSelection,
  safeSellerPage,
  totalSellerPages,
  setSellerPage,
}) {
  return (
    <section className="premiumSellerSection">
      <div className="premiumSectionHead">
        <div>
          <h2>Seller Groups</h2>
          <p>Orders are grouped by seller so you can review each seller’s activity more naturally.</p>
        </div>
        <div className="premiumCountPill">{groupedSellers.length} sellers</div>
      </div>

      <div className="premiumSellerGrid">
        {sellerPageRows.length === 0 ? (
          <div className="premiumEmptyCard">No matching seller groups found.</div>
        ) : (
          sellerPageRows.map((group) => {
            const isOpen = !!openSellers[group.sellerName];

            return (
              <div key={group.sellerName} className="premiumSellerCard">
                <button type="button" className="premiumSellerCardHead" onClick={() => toggleSellerOpen(group.sellerName)}>
                  <div className="premiumSellerIdentity">
                    <div className="premiumSellerAvatar">{makeSellerBadge(group.sellerName)}</div>
                    <div>
                      <div className="premiumSellerName">{group.sellerName}</div>
                      <div className="premiumSellerMeta">
                        {group.orderCount} orders · {group.itemCount} item rows · latest {formatDateTime(group.firstCreatedAt)}
                      </div>
                    </div>
                  </div>

                  <div className="premiumSellerStats">
                    <span className="statusPill new">신규 {group.newCount}</span>
                    <span className="statusPill confirmed">발주확인 {group.confirmedCount}</span>
                    <span className="statusPill shipping">배송중 {group.shippingCount}</span>
                    <span className="statusPill delivered">완료 {group.deliveredCount}</span>
                    <span className="premiumExpandMark">{isOpen ? "−" : "+"}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="premiumSellerOrders">
                    {group.orderIds.map((orderId) => {
                      const rows = group.rows.filter((row) => row.orderId === orderId);
                      const first = rows[0];

                      return (
                        <div key={orderId} className={`premiumOrderCard ${focusedOrderId === orderId ? "active" : ""}`}>
                          <div className="premiumOrderCardTop">
                            <div>
                              <div className="premiumOrderCardTitle">{first.customerName || "(No customer)"}</div>
                              <div className="premiumOrderCardMeta">
                                {formatDateTime(first.createdAt)} · {first.phone} · {first.address}
                              </div>
                            </div>

                            <div className="premiumOrderCardActions">
                              <span className={`statusPill ${first.orderStatusClass}`}>{first.orderStatus}</span>
                              <button type="button" className="premiumMiniBtn" onClick={() => setFocusedOrderId(orderId)}>
                                상세보기
                              </button>
                              <button type="button" className="premiumMiniBtn" onClick={() => exportRowsToCsv(rows)}>
                                CSV
                              </button>
                              <button type="button" className="premiumMiniBtn" onClick={() => handlePackingList(orderId)}>
                                Packing
                              </button>
                            </div>
                          </div>

                          <div className="premiumOrderRowList">
                            {rows.map((row) => (
                              <div key={row.rowId} className="premiumItemRow">
                                <div className="premiumItemCheck">
                                  <input
                                    type="checkbox"
                                    checked={!!selectedRows[row.rowId]}
                                    onChange={() => toggleRowSelection(row.rowId)}
                                  />
                                </div>
                                <div className="premiumItemInfo">
                                  <div className="premiumItemName">{row.productName}</div>
                                  <div className="premiumItemMeta">
                                    {row.optionInfo} · Qty {row.qty} · {row.shippingMethod}
                                  </div>
                                </div>
                                <div className="premiumItemMemo">{row.deliveryMemo}</div>
                                <div className="premiumItemTracking">
                                  {row.courier} {row.trackingNumber !== "-" ? `· ${row.trackingNumber}` : ""}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="premiumPagination">
        <button className="premiumOrderBtn ghost" disabled={safeSellerPage <= 1} onClick={() => setSellerPage(safeSellerPage - 1)}>
          Prev
        </button>

        {Array.from({ length: totalSellerPages }, (_, index) => index + 1).map((page) => (
          <button key={page} className={`premiumPageBtn ${page === safeSellerPage ? "active" : ""}`} onClick={() => setSellerPage(page)}>
            {page}
          </button>
        ))}

        <button className="premiumOrderBtn ghost" disabled={safeSellerPage >= totalSellerPages} onClick={() => setSellerPage(safeSellerPage + 1)}>
          Next
        </button>
      </div>
    </section>
  );
}
