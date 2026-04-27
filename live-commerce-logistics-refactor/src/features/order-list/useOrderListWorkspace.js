import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../data/useStore.js";
import {
  buildRows,
  endOfDayIso,
  getDateValueByType,
  getLifecycleStatus,
  startOfDayIso,
  uniqueOrderIds,
} from "./order-list-utils.js";
import {
  completeOrderDelivery,
  exportAndConfirmOrders,
  exportOrderRowsToCsv,
  reopenCompletedOrder,
  saveOrderShippingInfo,
} from "./order-list-service.js";

export function useOrderListWorkspace() {
  const { state, refresh } = useStore();
  const navigate = useNavigate();

  const [dateType, setDateType] = useState("payment");
  const [detailField, setDetailField] = useState("ALL");
  const [keyword, setKeyword] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState("ALL");
  const [selectedRows, setSelectedRows] = useState({});
  const [focusedOrderId, setFocusedOrderId] = useState("");
  const [working, setWorking] = useState(false);
  const [openSellers, setOpenSellers] = useState({});
  const [sellerPage, setSellerPage] = useState(1);
  const [shippingCourier, setShippingCourier] = useState("");
  const [shippingTracking, setShippingTracking] = useState("");

  const sellerGroupsPerPage = 5;

  const allRows = useMemo(() => {
    const orders = (state.orders || []).filter((order) => String(order.status || "").toUpperCase() !== "DRAFT");
    const orderLines = state.orderLines || [];
    return buildRows(orders, orderLines);
  }, [state.orderLines, state.orders]);

  const visibleRows = useMemo(() => {
    const fromIso = startOfDayIso(fromDate);
    const toIso = endOfDayIso(toDate);
    const query = String(keyword || "").trim().toLowerCase();

    return [...allRows]
      .filter((row) => {
        if (lifecycleFilter !== "ALL" && row.orderStatusValue !== lifecycleFilter) {
          return false;
        }

        const ref =
          getDateValueByType(
            {
              createdAt: row.createdAt,
              paidAt: row.paymentAt,
              excelConfirmedAt: row.excelConfirmedAt,
              sellerSubmittedAt: row.confirmAt,
              shippedAt: row.shipAt,
              deliveryCompletedAt: row.deliveryCompletedAt,
            },
            dateType
          ) || row.createdAt;

        if (fromIso && (!ref || ref < fromIso)) return false;
        if (toIso && (!ref || ref > toIso)) return false;
        if (!query) return true;

        const fieldMap = {
          seller: [row.sellerName],
          customer: [row.customerName, row.recipientName],
          nickname: [row.nickname],
          product: [row.productName, row.optionInfo],
          ALL: [
            row.sellerName,
            row.customerName,
            row.recipientName,
            row.nickname,
            row.productName,
            row.optionInfo,
            row.phone,
            row.address,
          ],
        };

        const haystack = (fieldMap[detailField] || fieldMap.ALL)
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort((a, b) => {
        const aRef =
          getDateValueByType(
            {
              createdAt: a.createdAt,
              paidAt: a.paymentAt,
              excelConfirmedAt: a.excelConfirmedAt,
              sellerSubmittedAt: a.confirmAt,
              shippedAt: a.shipAt,
              deliveryCompletedAt: a.deliveryCompletedAt,
            },
            dateType
          ) || a.createdAt;

        const bRef =
          getDateValueByType(
            {
              createdAt: b.createdAt,
              paidAt: b.paymentAt,
              excelConfirmedAt: b.excelConfirmedAt,
              sellerSubmittedAt: b.confirmAt,
              shippedAt: b.shipAt,
              deliveryCompletedAt: b.deliveryCompletedAt,
            },
            dateType
          ) || b.createdAt;

        return String(bRef).localeCompare(String(aRef));
      });
  }, [allRows, dateType, detailField, fromDate, keyword, lifecycleFilter, toDate]);

  const groupedSellers = useMemo(() => {
    const map = new Map();

    for (const row of visibleRows) {
      const key = row.sellerName || "Unknown Seller";
      if (!map.has(key)) {
        map.set(key, { sellerName: key, rows: [] });
      }
      map.get(key).rows.push(row);
    }

    return Array.from(map.values()).map((group) => {
      const orderIds = uniqueOrderIds(group.rows);
      return {
        ...group,
        orderIds,
        orderCount: orderIds.length,
        itemCount: group.rows.length,
        firstCreatedAt: group.rows[0]?.createdAt || "",
        newCount: group.rows.filter((row) => row.orderStatusValue === "NEW").length,
        confirmedCount: group.rows.filter((row) => row.orderStatusValue === "EXCEL_CONFIRMED").length,
        shippingCount: group.rows.filter((row) => row.orderStatusValue === "IN_TRANSIT").length,
        deliveredCount: group.rows.filter((row) => row.orderStatusValue === "DELIVERED").length,
      };
    });
  }, [visibleRows]);

  const totalSellerPages = Math.max(1, Math.ceil(groupedSellers.length / sellerGroupsPerPage));
  const safeSellerPage = Math.min(sellerPage, totalSellerPages);
  const sellerPageRows = groupedSellers.slice((safeSellerPage - 1) * sellerGroupsPerPage, safeSellerPage * sellerGroupsPerPage);

  const focusedOrder = useMemo(
    () => (state.orders || []).find((order) => order.id === focusedOrderId) || null,
    [focusedOrderId, state.orders]
  );
  const focusedOrderLines = useMemo(
    () => (focusedOrderId ? (state.orderLines || []).filter((line) => line.orderId === focusedOrderId) : []),
    [focusedOrderId, state.orderLines]
  );

  useEffect(() => {
    setShippingCourier(focusedOrder?.courier || "");
    setShippingTracking(focusedOrder?.trackingNumber || "");
  }, [focusedOrder?.courier, focusedOrder?.trackingNumber, focusedOrderId]);

  const hasUnsavedShippingChanges =
    !!focusedOrder &&
    (shippingCourier !== (focusedOrder.courier || "") || shippingTracking !== (focusedOrder.trackingNumber || ""));

  const clearFilters = useCallback(() => {
    setDateType("payment");
    setDetailField("ALL");
    setKeyword("");
    setFromDate("");
    setToDate("");
    setLifecycleFilter("ALL");
    setSellerPage(1);
  }, []);

  const toggleRowSelection = useCallback((rowId) => {
    setSelectedRows((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  }, []);

  const toggleSellerOpen = useCallback((sellerName) => {
    setOpenSellers((prev) => ({ ...prev, [sellerName]: !prev[sellerName] }));
  }, []);

  const exportRows = useCallback((rows) => exportOrderRowsToCsv(rows, dateType), [dateType]);

  const handleExcelDownload = useCallback(async () => {
    const rows = visibleRows.filter((row) => selectedRows[row.rowId]);
    const exportTargetRows = rows.length ? rows : visibleRows;

    if (!exportTargetRows.length) {
      alert("No rows to export.");
      return;
    }

    try {
      setWorking(true);
      await exportAndConfirmOrders(exportTargetRows, dateType);
      setSelectedRows({});
      await refresh?.();
    } catch (error) {
      alert(error?.message || "Failed to process export.");
    } finally {
      setWorking(false);
    }
  }, [dateType, refresh, selectedRows, visibleRows]);

  const handleSaveShippingInfo = useCallback(async () => {
    if (!focusedOrder) return;

    try {
      setWorking(true);
      await saveOrderShippingInfo(focusedOrder.id, {
        courier: shippingCourier,
        trackingNumber: shippingTracking,
      });
      await refresh?.();
      alert("Shipping info saved.");
    } catch (error) {
      alert(error?.message || "Failed to save shipping info.");
    } finally {
      setWorking(false);
    }
  }, [focusedOrder, refresh, shippingCourier, shippingTracking]);

  const handleMarkCompleted = useCallback(async () => {
    if (!focusedOrder) return;

    const trackingToUse = String(shippingTracking || focusedOrder.trackingNumber || "").trim();
    if (!trackingToUse) {
      alert("Please save a tracking number first.");
      return;
    }

    if (!window.confirm("Mark this order as delivered?")) return;

    try {
      setWorking(true);

      if (hasUnsavedShippingChanges) {
        await saveOrderShippingInfo(focusedOrder.id, {
          courier: shippingCourier,
          trackingNumber: shippingTracking,
        });
      }

      await completeOrderDelivery(focusedOrder.id);
      await refresh?.();
      alert("Order marked as delivered.");
    } catch (error) {
      alert(error?.message || "Failed to complete delivery.");
    } finally {
      setWorking(false);
    }
  }, [focusedOrder, hasUnsavedShippingChanges, refresh, shippingCourier, shippingTracking]);

  const handleReopenDelivery = useCallback(async () => {
    if (!focusedOrder) return;
    if (!window.confirm("Reopen this delivered order?")) return;

    try {
      setWorking(true);
      await reopenCompletedOrder(focusedOrder.id);
      await refresh?.();
      alert("Delivery completion was reverted.");
    } catch (error) {
      alert(error?.message || "Failed to reopen delivery.");
    } finally {
      setWorking(false);
    }
  }, [focusedOrder, refresh]);

  const focusedLifecycle = focusedOrder ? getLifecycleStatus(focusedOrder) : null;

  return {
    navigate,
    dateType,
    setDateType,
    detailField,
    setDetailField,
    keyword,
    setKeyword,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    lifecycleFilter,
    setLifecycleFilter,
    selectedRows,
    focusedOrderId,
    setFocusedOrderId,
    working,
    openSellers,
    sellerPage,
    setSellerPage,
    shippingCourier,
    setShippingCourier,
    shippingTracking,
    setShippingTracking,
    groupedSellers,
    sellerPageRows,
    safeSellerPage,
    totalSellerPages,
    focusedOrder,
    focusedOrderLines,
    hasUnsavedShippingChanges,
    focusedLifecycle,
    clearFilters,
    toggleRowSelection,
    toggleSellerOpen,
    exportRows,
    handleExcelDownload,
    handleSaveShippingInfo,
    handleMarkCompleted,
    handleReopenDelivery,
    handleGoDashboard: () => navigate("/dashboard"),
    handlePackingList: (orderId) => navigate(`/packing/${orderId}`),
  };
}
