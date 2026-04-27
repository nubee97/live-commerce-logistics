export default function OrderListHero({ onGoDashboard, onExcelDownload, working }) {
  return (
    <section className="premiumOrderHero">
      <div>
        <div className="premiumOrderEyebrow">ORDER LIST</div>
        <h1 className="premiumOrderTitle">주문 목록</h1>
        <p className="premiumOrderSubtitle">
          Seller-grouped order operations with cleaner cards, paging, delivery handling, and faster admin scanning.
        </p>
      </div>

      <div className="premiumOrderHeroActions">
        <button className="premiumOrderBtn" onClick={onGoDashboard}>
          Dashboard
        </button>
        <button className="premiumOrderBtn" onClick={onExcelDownload} disabled={working}>
          Excel Download
        </button>
      </div>
    </section>
  );
}
