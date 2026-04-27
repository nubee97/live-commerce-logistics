import OrdersImportModal from "../features/orders/OrdersImportModal.jsx";
import OrdersSidebar from "../features/orders/OrdersSidebar.jsx";
import OrderDetailsPanel from "../features/orders/OrderDetailsPanel.jsx";
import OrderBuilderPanel from "../features/orders/OrderBuilderPanel.jsx";
import OrdersHeroSection from "../features/orders/OrdersHeroSection.jsx";
import { useOrdersWorkspace } from "../features/orders/useOrdersWorkspace.js";

export default function Orders() {
  const workspace = useOrdersWorkspace();

  return (
    <>
      <OrdersImportModal
        show={workspace.showExcelImport}
        onClose={() => workspace.setShowExcelImport(false)}
        onParsed={(data) => {
          workspace.createOrderFromExcel(data);
          workspace.setShowExcelImport(false);
        }}
      />

      <div className="ordersPremiumPage">
        <OrdersSidebar
          saving={workspace.saving}
          createOrder={workspace.createOrder}
          openExcelImport={() => workspace.setShowExcelImport(true)}
          downloadOrderTemplate={workspace.handleDownloadTemplate}
          search={workspace.search}
          setSearch={workspace.setSearch}
          statusFilter={workspace.statusFilter}
          setStatusFilter={workspace.setStatusFilter}
          filteredOrders={workspace.filteredOrders}
          draftOrders={workspace.draftOrders}
          confirmedOrders={workspace.confirmedOrders}
          selectedId={workspace.selectedId}
          setSelectedId={workspace.setSelectedId}
          isAdmin={workspace.isAdmin}
          deleteEntireOrder={workspace.deleteEntireOrder}
        />

        <main className="ordersPremiumRight">
          <OrdersHeroSection
            filteredCount={workspace.filteredOrders.length}
            draftCount={workspace.draftOrders.length}
            confirmedCount={workspace.confirmedOrders.length}
          />

          {!workspace.selected ? (
            <section className="ordersPremiumPanel">
              <div className="ordersPremiumEmptyState large">Select an order from the left or create a new one.</div>
            </section>
          ) : (
            <>
              <OrderDetailsPanel
                selected={workspace.selected}
                sellerNameDisplay={workspace.sellerNameDisplay}
                formCompletion={workspace.formCompletion}
                error={workspace.error}
                isMissing={workspace.isMissing}
                formState={workspace.formState}
                isLocked={workspace.isLocked}
                saving={workspace.saving}
                handleFieldChange={workspace.handleFieldChange}
                handleFieldBlur={workspace.handleFieldBlur}
                applyImmediatePatch={workspace.applyImmediatePatch}
                onAddressLookup={() => {
                  if (!window.daum || !window.daum.Postcode) {
                    workspace.setError("Address search script is not loaded yet. Please refresh the page.");
                    return;
                  }

                  new window.daum.Postcode({
                    oncomplete(data) {
                      const fullAddress = data.roadAddress || data.jibunAddress || "";
                      workspace.applyImmediatePatch({
                        postalCode: data.zonecode || "",
                        addressMain: fullAddress,
                      });
                    },
                  }).open();
                }}
              />

              <OrderBuilderPanel
                lines={workspace.lines}
                addLine={workspace.addLine}
                isLocked={workspace.isLocked}
                saving={workspace.saving}
                orderedItemsSummary={workspace.orderedItemsSummary}
                expandedItems={workspace.expandedItems}
                toggleExpand={workspace.toggleExpand}
                getSetComponents={workspace.getSetComponents}
                deleteSelectedLines={workspace.deleteSelectedLines}
                selectedProducts={workspace.selectedProducts}
                lineCols={workspace.lineCols}
                updateLine={workspace.updateLine}
                deleteLine={workspace.deleteLine}
                orderSummary={workspace.orderSummary}
                invalidLineCount={workspace.invalidLineCount}
                selected={workspace.selected}
                isAdmin={workspace.isAdmin}
                sellerConfirmOrder={workspace.sellerConfirmOrder}
                confirmPreview={workspace.confirmPreview}
              />
            </>
          )}
        </main>
      </div>
    </>
  );
}
