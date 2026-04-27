import DashboardHeaderSection from "../features/dashboard/DashboardHeaderSection.jsx";
import DashboardWorkspace from "../features/dashboard/DashboardWorkspace.jsx";
import DashboardImportInputs from "../features/dashboard/DashboardImportInputs.jsx";
import { useDashboardWorkspace } from "../features/dashboard/useDashboardWorkspace.js";

export default function Dashboard() {
  const workspace = useDashboardWorkspace();

  return (
    <div className="dashboardModernPage">
      <DashboardHeaderSection
        isBusy={workspace.isBusy}
        onGoOrderList={workspace.handleGoOrderList}
        onExportExcel={workspace.handleExportExcel}
        onImportExcel={workspace.handleImportExcelClick}
        onExportJson={workspace.handleExportJson}
        onImportJson={workspace.handleImportJsonClick}
        onReset={workspace.handleReset}
        orderMetrics={workspace.orderMetrics}
        stats={workspace.stats}
        lowStockCount={workspace.lowStockCount}
      />

      <DashboardWorkspace
        tabs={workspace.tabs}
        active={workspace.active}
        setActive={workspace.setActive}
        setSearchTerm={workspace.setSearchTerm}
        currentTab={workspace.currentTab}
        searchTerm={workspace.searchTerm}
        setPage={workspace.setPage}
        filteredRows={workspace.filteredRows}
        addRowForCurrentTab={workspace.addRowForCurrentTab}
        handleBulkDelete={workspace.handleBulkDelete}
        isBusy={workspace.isBusy}
        selectedIds={workspace.selectedIds}
        pagedRows={workspace.pagedRows}
        safePage={workspace.safePage}
        totalPages={workspace.totalPages}
        state={workspace.state}
        giftRows={workspace.giftRows}
        allVisibleSelected={workspace.allVisibleSelected}
        toggleSelectAllVisible={workspace.toggleSelectAllVisible}
        toggleSelectOne={workspace.toggleSelectOne}
        handleUpdate={workspace.handleUpdate}
        handleImageUpload={workspace.handleImageUpload}
      />

      <DashboardImportInputs
        fileRefXlsx={workspace.fileRefXlsx}
        fileRefJson={workspace.fileRefJson}
        onExcelImport={workspace.handleExcelImport}
        onJsonImport={workspace.handleJsonImport}
      />
    </div>
  );
}
