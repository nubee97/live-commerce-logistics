export default function OrdersHeroSection({ filteredCount, draftCount, confirmedCount }) {
  return (
    <section className="ordersPremiumHero compact">
      <div>
        <div className="ordersPremiumEyebrow">Orders Workspace</div>
        <h1 className="ordersPremiumTitle">Create and manage your orders</h1>
        <p className="ordersPremiumSubtitle">
          A simpler workflow for order details, items, confirmation, and stock review.
        </p>
      </div>

      <div className="ordersPremiumHeroStats">
        <div className="ordersPremiumStatCard"><span>All Orders</span><strong>{filteredCount}</strong></div>
        <div className="ordersPremiumStatCard"><span>Draft</span><strong>{draftCount}</strong></div>
        <div className="ordersPremiumStatCard"><span>Confirmed</span><strong>{confirmedCount}</strong></div>
      </div>
    </section>
  );
}
