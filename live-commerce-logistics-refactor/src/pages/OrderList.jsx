import OrderListHero from "../features/order-list/OrderListHero.jsx";
import OrderListFilters from "../features/order-list/OrderListFilters.jsx";
import SellerGroupSection from "../features/order-list/SellerGroupSection.jsx";
import DeliveryDetailPanel from "../features/order-list/DeliveryDetailPanel.jsx";
import { useOrderListWorkspace } from "../features/order-list/useOrderListWorkspace.js";

export default function OrderList() {
  const workspace = useOrderListWorkspace();

  return (
    <div className="premiumOrderPage">
      <OrderListHero
        onGoDashboard={workspace.handleGoDashboard}
        onExcelDownload={workspace.handleExcelDownload}
        working={workspace.working}
      />

      <OrderListFilters
        dateType={workspace.dateType}
        setDateType={workspace.setDateType}
        fromDate={workspace.fromDate}
        setFromDate={workspace.setFromDate}
        toDate={workspace.toDate}
        setToDate={workspace.setToDate}
        detailField={workspace.detailField}
        setDetailField={workspace.setDetailField}
        keyword={workspace.keyword}
        setKeyword={workspace.setKeyword}
        lifecycleFilter={workspace.lifecycleFilter}
        setLifecycleFilter={workspace.setLifecycleFilter}
        clearFilters={workspace.clearFilters}
      />

      <SellerGroupSection
        groupedSellers={workspace.groupedSellers}
        sellerPageRows={workspace.sellerPageRows}
        openSellers={workspace.openSellers}
        toggleSellerOpen={workspace.toggleSellerOpen}
        focusedOrderId={workspace.focusedOrderId}
        setFocusedOrderId={workspace.setFocusedOrderId}
        exportRowsToCsv={workspace.exportRows}
        handlePackingList={workspace.handlePackingList}
        selectedRows={workspace.selectedRows}
        toggleRowSelection={workspace.toggleRowSelection}
        safeSellerPage={workspace.safeSellerPage}
        totalSellerPages={workspace.totalSellerPages}
        setSellerPage={workspace.setSellerPage}
      />

      <DeliveryDetailPanel
        focusedOrder={workspace.focusedOrder}
        focusedLifecycle={workspace.focusedLifecycle}
        shippingCourier={workspace.shippingCourier}
        setShippingCourier={workspace.setShippingCourier}
        shippingTracking={workspace.shippingTracking}
        setShippingTracking={workspace.setShippingTracking}
        working={workspace.working}
        hasUnsavedShippingChanges={workspace.hasUnsavedShippingChanges}
        handleSaveShippingInfo={workspace.handleSaveShippingInfo}
        handleMarkCompleted={workspace.handleMarkCompleted}
        handleReopenDelivery={workspace.handleReopenDelivery}
        focusedOrderLines={workspace.focusedOrderLines}
      />
    </div>
  );
}
