import StatusBadge from "../../components/StatusBadge.jsx";

function OrderGroup({ title, orders, selectedId, setSelectedId, isAdmin, deleteEntireOrder, saving, confirmed = false }) {
  return (
    <div className="ordersPremiumGroup">
      <div className="ordersPremiumGroupLabel">{title}</div>

      {orders.length === 0 ? (
        <div className="ordersPremiumEmptyState">
          {confirmed ? "No confirmed orders yet." : "No draft orders."}
        </div>
      ) : (
        orders.map((o) => (
          <div key={o.id} className={`ordersPremiumInboxCard ${confirmed ? "confirmed" : ""} ${o.id === selectedId ? "active" : ""}`}>
            <button type="button" className="ordersPremiumInboxMain" onClick={() => setSelectedId(o.id)}>
              <div className="ordersPremiumInboxTop">
                <div className="ordersPremiumInboxCustomer">{o.customerName || "(No customer)"}</div>
                <StatusBadge status={o.status} />
              </div>

              <div className="ordersPremiumInboxMeta">
                <span>{o.sellerName || "Seller?"}</span>
                <span>•</span>
                <span>{o.phone || "No phone"}</span>
              </div>

              {confirmed && (
                <div className="ordersPremiumConfirmedAt">
                  Confirmed • {o.sellerSubmittedAt ? new Date(o.sellerSubmittedAt).toLocaleString() : ""}
                </div>
              )}

              <div className="ordersPremiumInboxDate">
                {o.createdAt ? new Date(o.createdAt).toLocaleString() : ""}
              </div>
            </button>

            {!isAdmin && (
              <div className="ordersPremiumInboxActions">
                <button className="ordersPremiumDangerBtn" onClick={() => deleteEntireOrder(o.id)} type="button" disabled={saving}>
                  Delete
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default function OrdersSidebar({
  saving,
  createOrder,
  openExcelImport,
  downloadOrderTemplate,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  filteredOrders,
  draftOrders,
  confirmedOrders,
  selectedId,
  setSelectedId,
  isAdmin,
  deleteEntireOrder,
}) {
  return (
    <aside className="ordersPremiumLeft">
      <section className="ordersPremiumPanel ordersPremiumSidebar">
        <div className="ordersPremiumPanelHead">
          <div>
            <h2>My Orders</h2>
            <p>Drafts and confirmed submissions.</p>
          </div>
        </div>

        <div className="ordersPremiumActionRow">
          <button className="ordersPremiumPrimaryBtn" onClick={createOrder} type="button" disabled={saving}>
            + New Order
          </button>

          <button className="ordersPremiumGhostBtn" onClick={openExcelImport} type="button">
            Upload Excel
          </button>

          <button className="ordersPremiumGhostBtn" onClick={downloadOrderTemplate} type="button">
            Template
          </button>
        </div>

        <div className="ordersPremiumFilterBar compact">
          <input className="ordersPremiumSearch" placeholder="Search orders" value={search} onChange={(e) => setSearch(e.target.value)} />

          <select className="ordersPremiumSelect" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All</option>
            <option value="CONFIRMED">Confirmed</option>
          </select>
        </div>

        <div className="ordersPremiumCountRow">
          <span className="ordersPremiumCountChip">{filteredOrders.length} order(s)</span>
        </div>

        <OrderGroup
          title="Draft Orders"
          orders={draftOrders}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          isAdmin={isAdmin}
          deleteEntireOrder={deleteEntireOrder}
          saving={saving}
        />

        <OrderGroup
          title="Order Bag"
          orders={confirmedOrders}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          isAdmin={isAdmin}
          deleteEntireOrder={deleteEntireOrder}
          saving={saving}
          confirmed
        />
      </section>
    </aside>
  );
}
