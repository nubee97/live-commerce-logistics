export default function DashboardHeaderSection({
  isBusy,
  onGoOrderList,
  onExportExcel,
  onImportExcel,
  onExportJson,
  onImportJson,
  onReset,
  orderMetrics,
  stats,
  lowStockCount,
}) {
  return (
    <>
      <div className="dashboardHero">
        <div>
          <div className="dashboardEyebrow">MAIN DASHBOARD</div>
          <h1 className="dashboardTitle">Inventory & Order Control Center</h1>
          <p className="dashboardSubtitle">
            Clean, searchable, paginated product operations with image management and bulk actions.
          </p>
        </div>

        <div className="dashboardHeroActions">
          <button className="dashboardActionBtn" onClick={onGoOrderList} disabled={isBusy}>
            Order List
          </button>
          <button className="dashboardActionBtn" onClick={onExportExcel} disabled={isBusy}>
            Export Excel
          </button>
          <button className="dashboardActionBtn" onClick={onImportExcel} disabled={isBusy}>
            Import Excel
          </button>
          <button className="dashboardActionBtn" onClick={onExportJson} disabled={isBusy}>
            Export JSON
          </button>
          <button className="dashboardActionBtn" onClick={onImportJson} disabled={isBusy}>
            Import JSON
          </button>
          <button className="dashboardActionBtn danger" disabled={isBusy} onClick={onReset}>
            {isBusy ? "Working..." : "Reset"}
          </button>
        </div>
      </div>

      <div className="dashboardStatsGrid">
        <div className="dashboardStatCard">
          <div className="dashboardStatLabel">Total Orders</div>
          <div className="dashboardStatValue">{orderMetrics.total}</div>
        </div>
        <div className="dashboardStatCard">
          <div className="dashboardStatLabel">Draft Orders</div>
          <div className="dashboardStatValue">{orderMetrics.draft}</div>
        </div>
        <div className="dashboardStatCard">
          <div className="dashboardStatLabel">Confirmed</div>
          <div className="dashboardStatValue">{orderMetrics.confirmed}</div>
        </div>
        <div className="dashboardStatCard">
          <div className="dashboardStatLabel">Catalog SKU</div>
          <div className="dashboardStatValue">{stats.catalog}</div>
        </div>
        <div className="dashboardStatCard">
          <div className="dashboardStatLabel">Set Products</div>
          <div className="dashboardStatValue">{stats.sets}</div>
        </div>
        <div className="dashboardStatCard">
          <div className="dashboardStatLabel">Low Stock</div>
          <div className="dashboardStatValue">{lowStockCount}</div>
        </div>
      </div>
    </>
  );
}
