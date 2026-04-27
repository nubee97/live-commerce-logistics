import DashboardDataTable from "./DashboardDataTable.jsx";

export default function DashboardWorkspace({
  tabs,
  active,
  setActive,
  setSearchTerm,
  currentTab,
  searchTerm,
  setPage,
  filteredRows,
  addRowForCurrentTab,
  handleBulkDelete,
  isBusy,
  selectedIds,
  pagedRows,
  safePage,
  totalPages,
  state,
  giftRows,
  allVisibleSelected,
  toggleSelectAllVisible,
  toggleSelectOne,
  handleUpdate,
  handleImageUpload,
}) {
  return (
    <div className="dashboardSurface">
      <div className="dashboardSectionHeader">
        <div>
          <h2>Catalog Workspace</h2>
          <p>Search, edit, paginate, upload images, and bulk-delete without the dark heavy UI.</p>
        </div>
        <div className="dashboardRecordsBadge">{filteredRows.length} records</div>
      </div>

      <div className="dashboardTabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`dashboardTab ${active === tab.key ? "active" : ""}`}
            onClick={() => {
              setActive(tab.key);
              setSearchTerm("");
            }}
          >
            <span>{tab.label}</span>
            <small>{tab.subtitle}</small>
          </button>
        ))}
      </div>

      <div className="dashboardToolbar">
        <div className="dashboardSearchWrap">
          <input
            className="dashboardSearchInput"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(active, 1);
            }}
            placeholder={`Search ${currentTab.label} by product name`}
          />
        </div>

        <div className="dashboardToolbarActions">
          <button className="dashboardPrimaryBtn" type="button" onClick={addRowForCurrentTab} disabled={isBusy}>
            + Add Row
          </button>
          <button
            className="dashboardSecondaryBtn"
            type="button"
            onClick={() => handleBulkDelete(active)}
            disabled={isBusy || !selectedIds.length}
          >
            Delete Selected ({selectedIds.length})
          </button>
        </div>
      </div>

      <DashboardDataTable
        active={active}
        pagedRows={pagedRows}
        selectedIds={selectedIds}
        allVisibleSelected={allVisibleSelected}
        toggleSelectAllVisible={toggleSelectAllVisible}
        toggleSelectOne={toggleSelectOne}
        handleUpdate={handleUpdate}
        handleImageUpload={handleImageUpload}
        state={state}
        giftRows={giftRows}
      />

      <div className="dashboardPagination">
        <button
          type="button"
          className="dashboardPageBtn"
          disabled={safePage <= 1}
          onClick={() => setPage(active, safePage - 1)}
        >
          Prev
        </button>

        {Array.from({ length: totalPages }, (_, index) => index + 1)
          .slice(Math.max(0, safePage - 3), Math.max(5, safePage + 2))
          .map((page) => (
            <button
              key={page}
              type="button"
              className={`dashboardPageBtn ${page === safePage ? "active" : ""}`}
              onClick={() => setPage(active, page)}
            >
              {page}
            </button>
          ))}

        <button
          type="button"
          className="dashboardPageBtn"
          disabled={safePage >= totalPages}
          onClick={() => setPage(active, safePage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
