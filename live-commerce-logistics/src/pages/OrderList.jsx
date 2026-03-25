import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../data/StoreProvider.jsx";
import {
  markOrdersExcelConfirmed,
  markOrderDeliveryCompleted,
  reopenOrderDelivery,
  updateOrderShippingInfo,
} from "../lib/db.js";
import "./OrderListSheet.css";

function downloadFile(filename, content, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\ufeff", content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function startOfDayIso(yyyyMmDd) {
  if (!yyyyMmDd) return "";
  return new Date(`${yyyyMmDd}T00:00:00`).toISOString();
}

function endOfDayIso(yyyyMmDd) {
  if (!yyyyMmDd) return "";
  return new Date(`${yyyyMmDd}T23:59:59.999`).toISOString();
}

function buildAddress(order) {
  return [order.postalCode, order.addressMain, order.addressDetail]
    .filter(Boolean)
    .join(" ");
}

function getLifecycleStatus(order) {
  if (order.deliveryCompletedAt) {
    return { value: "DELIVERED", label: "배송완료", className: "shipped" };
  }

  if (String(order.trackingNumber || "").trim()) {
    return { value: "IN_TRANSIT", label: "배송 중", className: "packed" };
  }

  if (order.excelConfirmedAt) {
    return { value: "EXCEL_CONFIRMED", label: "발주확인", className: "confirmed" };
  }

  return { value: "NEW", label: "신규주문", className: "draft" };
}

function getDateValueByType(order, dateType) {
  if (dateType === "order") return order.createdAt || "";
  if (dateType === "confirm") {
    return order.excelConfirmedAt || order.sellerSubmittedAt || order.paidAt || "";
  }
  if (dateType === "ship") {
    return order.shippedAt || order.deliveryCompletedAt || "";
  }
  return order.paidAt || order.sellerSubmittedAt || order.createdAt || "";
}

function getProductName(line) {
  return (
    line?.officialName ||
    line?.itemName ||
    line?.productName ||
    line?.sku ||
    line?.itemCode ||
    "-"
  );
}

function getOptionInfo(line) {
  return line?.sku || line?.itemCode || line?.productCode || "-";
}

function matchByDetailField(row, keyword, detailField) {
  const q = String(keyword || "").trim().toLowerCase();
  if (!q) return true;

  const fields = {
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

  const haystack = (fields[detailField] || fields.ALL)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

function uniqueOrderIds(rows) {
  return [...new Set((rows || []).map((row) => row.orderId).filter(Boolean))];
}

export default function OrderList() {
  const { state, refresh } = useStore();
  const nav = useNavigate();

  const [dateType, setDateType] = useState("payment");
  const [detailField, setDetailField] = useState("ALL");
  const [keyword, setKeyword] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState("ALL");
  const [selectedRows, setSelectedRows] = useState({});
  const [focusedOrderId, setFocusedOrderId] = useState("");
  const [working, setWorking] = useState(false);

  const [shippingCourier, setShippingCourier] = useState("");
  const [shippingTracking, setShippingTracking] = useState("");

  const allRows = useMemo(() => {
    const orders = (state.orders || []).filter(
      (order) => String(order.status || "").toUpperCase() !== "DRAFT"
    );
    const orderLines = state.orderLines || [];

    return orders.flatMap((order) => {
      const lifecycle = getLifecycleStatus(order);
      const lines = orderLines.filter((line) => line.orderId === order.id);

      const base = {
        orderId: order.id,
        orderNumber: order.orderNumber || order.id,
        createdAt: order.createdAt || "",
        paymentAt: order.paidAt || order.sellerSubmittedAt || order.createdAt || "",
        excelConfirmedAt: order.excelConfirmedAt || "",
        confirmAt:
          order.excelConfirmedAt || order.sellerSubmittedAt || order.paidAt || "",
        shipAt: order.shippedAt || "",
        deliveryCompletedAt: order.deliveryCompletedAt || "",
        shippingMethod: order.shippingMethod || "-",
        orderStatus: lifecycle.label,
        orderStatusValue: lifecycle.value,
        orderStatusClass: lifecycle.className,
        sellerName: order.sellerName || "-",
        customerName: order.customerName || "-",
        nickname: order.customerName || "-",
        recipientName: order.recipientName || order.customerName || "-",
        phone: order.phone || "-",
        address: buildAddress(order) || order.address || "-",
        deliveryMemo: order.deliveryMemo || "-",
        courier: order.courier || "-",
        trackingNumber: order.trackingNumber || "-",
      };

      if (!lines.length) {
        return [
          {
            ...base,
            rowId: `${order.id}__empty`,
            lineId: "",
            productName: "-",
            optionInfo: "-",
            qty: 0,
          },
        ];
      }

      return lines.map((line, index) => ({
        ...base,
        rowId: `${order.id}__${line.id || index}`,
        lineId: line.id || "",
        productName: getProductName(line),
        optionInfo: getOptionInfo(line),
        qty: Number(line.qty || 0),
      }));
    });
  }, [state.orders, state.orderLines]);

  const visibleRows = useMemo(() => {
    const fromIso = startOfDayIso(fromDate);
    const toIso = endOfDayIso(toDate);

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

        return matchByDetailField(row, keyword, detailField);
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
  }, [allRows, lifecycleFilter, dateType, detailField, keyword, fromDate, toDate]);

  const visibleRowIds = visibleRows.map((row) => row.rowId);
  const allVisibleSelected =
    visibleRowIds.length > 0 && visibleRowIds.every((id) => selectedRows[id]);

  const selectedVisibleRows = visibleRows.filter((row) => selectedRows[row.rowId]);
  const exportTargetRows = selectedVisibleRows.length ? selectedVisibleRows : visibleRows;

  const focusedOrder = useMemo(() => {
    return (state.orders || []).find((order) => order.id === focusedOrderId) || null;
  }, [state.orders, focusedOrderId]);

  const focusedOrderLines = useMemo(() => {
    if (!focusedOrderId) return [];
    return (state.orderLines || []).filter((line) => line.orderId === focusedOrderId);
  }, [state.orderLines, focusedOrderId]);

  useEffect(() => {
    setShippingCourier(focusedOrder?.courier || "");
    setShippingTracking(focusedOrder?.trackingNumber || "");
  }, [focusedOrderId, focusedOrder?.courier, focusedOrder?.trackingNumber]);

  const hasUnsavedShippingChanges =
    !!focusedOrder &&
    (shippingCourier !== (focusedOrder.courier || "") ||
      shippingTracking !== (focusedOrder.trackingNumber || ""));

  function toggleRowSelection(rowId) {
    setSelectedRows((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  }

  function toggleAllVisibleRows() {
    if (allVisibleSelected) {
      const next = { ...selectedRows };
      visibleRowIds.forEach((id) => {
        delete next[id];
      });
      setSelectedRows(next);
      return;
    }

    const next = { ...selectedRows };
    visibleRowIds.forEach((id) => {
      next[id] = true;
    });
    setSelectedRows(next);
  }

  function clearFilters() {
    setDateType("payment");
    setDetailField("ALL");
    setKeyword("");
    setFromDate("");
    setToDate("");
    setLifecycleFilter("ALL");
  }

  function exportRowsToCsv(rows) {
    if (!rows.length) {
      alert("No rows to export.");
      return;
    }

    const headers = [
      "주문일",
      "배송속성",
      "주문상태",
      "상품명",
      "옵션정보",
      "수량",
      "셀러명",
      "닉네임",
      "수취인명",
      "연락처",
      "주소",
      "배송메모",
      "택배사",
      "운송장번호",
    ];

    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        [
          escapeCsv(
            formatDateTime(
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
              ) || row.createdAt
            )
          ),
          escapeCsv(row.shippingMethod),
          escapeCsv(row.orderStatus),
          escapeCsv(row.productName),
          escapeCsv(row.optionInfo),
          escapeCsv(row.qty),
          escapeCsv(row.sellerName),
          escapeCsv(row.nickname),
          escapeCsv(row.recipientName),
          escapeCsv(row.phone),
          escapeCsv(row.address),
          escapeCsv(row.deliveryMemo),
          escapeCsv(row.courier),
          escapeCsv(row.trackingNumber),
        ].join(",")
      ),
    ];

    const filename = `orders_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.csv`;

    downloadFile(filename, csvLines.join("\n"));
  }

  async function handleExcelDownload() {
    if (!exportTargetRows.length) {
      alert("No rows to export.");
      return;
    }

    const orderIds = uniqueOrderIds(exportTargetRows);

    try {
      setWorking(true);
      exportRowsToCsv(exportTargetRows);
      await markOrdersExcelConfirmed(orderIds);
      setSelectedRows({});
      await refresh?.();
    } catch (error) {
      alert(error?.message || "Failed to process export.");
    } finally {
      setWorking(false);
    }
  }

  async function handleSaveShippingInfo() {
    if (!focusedOrder) return;

    try {
      setWorking(true);
      await updateOrderShippingInfo(focusedOrder.id, {
        courier: shippingCourier,
        trackingNumber: shippingTracking,
      });
      await refresh?.();
      alert("Shipping info saved. If tracking exists, the order is now treated as 배송 중.");
    } catch (error) {
      alert(error?.message || "Failed to save shipping info.");
    } finally {
      setWorking(false);
    }
  }

  async function handleMarkCompleted() {
    if (!focusedOrder) return;

    const trackingToUse = String(
      shippingTracking || focusedOrder.trackingNumber || ""
    ).trim();

    if (!trackingToUse) {
      alert("Please save a tracking number first.");
      return;
    }

    if (!window.confirm("Mark this order as delivered?")) {
      return;
    }

    try {
      setWorking(true);

      if (hasUnsavedShippingChanges) {
        await updateOrderShippingInfo(focusedOrder.id, {
          courier: shippingCourier,
          trackingNumber: shippingTracking,
        });
      }

      await markOrderDeliveryCompleted(focusedOrder.id);
      await refresh?.();
      alert("Order marked as delivered.");
    } catch (error) {
      alert(error?.message || "Failed to complete delivery.");
    } finally {
      setWorking(false);
    }
  }

  async function handleReopenDelivery() {
    if (!focusedOrder) return;

    if (!window.confirm("Reopen this delivered order?")) {
      return;
    }

    try {
      setWorking(true);
      await reopenOrderDelivery(focusedOrder.id);
      await refresh?.();
      alert("Delivery completion was reverted.");
    } catch (error) {
      alert(error?.message || "Failed to reopen delivery.");
    } finally {
      setWorking(false);
    }
  }

  function handlePackingList() {
    const orderIds = uniqueOrderIds(exportTargetRows);

    if (!orderIds.length) {
      alert("No order available for packing list.");
      return;
    }

    if (orderIds.length > 1) {
      alert("Please select only one order for packing list.");
      return;
    }

    nav(`/packing/${orderIds[0]}`);
  }

  const focusedLifecycle = focusedOrder ? getLifecycleStatus(focusedOrder) : null;

  return (
    <div className="sheetOrderPage">
      <div className="sheetOrderWorkspace">
        <div className="sheetOrderTopbar">
          <div>
            <div className="sheetOrderKicker">Order List</div>
            <h1 className="sheetOrderTitle">주문 목록</h1>
          </div>

          <div className="sheetTopActions">
            <button
              type="button"
              className="sheetBtn sheetBtnGhost"
              onClick={() => nav("/dashboard")}
            >
              대시보드
            </button>
            <button
              type="button"
              className="sheetBtn sheetBtnGhost"
              onClick={handlePackingList}
              disabled={working}
            >
              패킹리스트
            </button>
            <button
              type="button"
              className="sheetBtn sheetBtnExcel"
              onClick={handleExcelDownload}
              disabled={working}
            >
              엑셀다운
            </button>
          </div>
        </div>

        <div className="sheetFilterPanel">
          <div className="sheetFilterRow sheetFilterRowTop">
            <div className="sheetFilterLabel">조회기간</div>

            <div className="sheetInlineFilters">
              <select
                className="sheetControl sheetSelectWide"
                value={dateType}
                onChange={(e) => setDateType(e.target.value)}
              >
                <option value="payment">결제일</option>
                <option value="order">주문일</option>
                <option value="confirm">발주확인일</option>
                <option value="ship">배송처리일</option>
              </select>

              <input
                className="sheetControl"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <span className="sheetTilde">~</span>
              <input
                className="sheetControl"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div className="sheetFilterLabel sheetDetailLabel">상세 조건</div>

            <div className="sheetInlineFilters sheetDetailFilters">
              <select
                className="sheetControl sheetSelectMid"
                value={detailField}
                onChange={(e) => setDetailField(e.target.value)}
              >
                <option value="ALL">전체</option>
                <option value="seller">셀러명</option>
                <option value="customer">고객명</option>
                <option value="nickname">닉네임</option>
                <option value="product">제품명</option>
              </select>

              <input
                className="sheetControl sheetKeywordInput"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="검색어를 입력하세요"
              />
            </div>
          </div>

          <div className="sheetFilterRow sheetFilterRowBottom">
            <div className="sheetCountText">
              목록 (총 <span>{visibleRows.length}</span> 개)
            </div>

            <div className="sheetFilterRightTools">
              <select
                className="sheetControl sheetSelectMid"
                value={lifecycleFilter}
                onChange={(e) => setLifecycleFilter(e.target.value)}
              >
                <option value="ALL">전체 상태</option>
                <option value="NEW">신규주문</option>
                <option value="EXCEL_CONFIRMED">발주확인</option>
                <option value="IN_TRANSIT">배송 중</option>
                <option value="DELIVERED">배송완료</option>
              </select>

              <span className="sheetSelectionHint">선택건 혹은 전체</span>

              <button
                type="button"
                className="sheetBtn sheetBtnGhost"
                onClick={clearFilters}
              >
                필터 초기화
              </button>
            </div>
          </div>
        </div>

        <div className="sheetTableWrap">
          <table className="sheetOrderTable">
            <thead>
              <tr>
                <th className="checkboxCol">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisibleRows}
                  />
                </th>
                <th>주문일</th>
                <th>배송속성</th>
                <th>주문상태</th>
                <th>상품명</th>
                <th>옵션정보</th>
                <th className="right">수량</th>
                <th>셀러명</th>
                <th>닉네임</th>
                <th>수취인명</th>
                <th>연락처</th>
                <th>주소</th>
                <th>배송메모</th>
                <th>택배사</th>
                <th>운송장번호</th>
              </tr>
            </thead>

            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={15} className="sheetEmptyCell">
                    조회 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr
                    key={row.rowId}
                    className={focusedOrderId === row.orderId ? "active" : ""}
                    onClick={() => setFocusedOrderId(row.orderId)}
                  >
                    <td
                      className="checkboxCol"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedRows[row.rowId]}
                        onChange={() => toggleRowSelection(row.rowId)}
                      />
                    </td>
                    <td>
                      {formatDateTime(
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
                        ) || row.createdAt
                      )}
                    </td>
                    <td>{row.shippingMethod}</td>
                    <td>
                      <span className={`sheetStatusChip ${row.orderStatusClass}`}>
                        {row.orderStatus}
                      </span>
                    </td>
                    <td>{row.productName}</td>
                    <td>{row.optionInfo}</td>
                    <td className="right">{row.qty}</td>
                    <td>{row.sellerName}</td>
                    <td>{row.nickname}</td>
                    <td>{row.recipientName}</td>
                    <td>{row.phone}</td>
                    <td className="sheetAddressCell">{row.address}</td>
                    <td>{row.deliveryMemo}</td>
                    <td>{row.courier}</td>
                    <td>{row.trackingNumber}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {focusedOrder && (
          <div className="sheetOrderDetailPanel">
            <div className="sheetDetailHead">
              <div>
                <div className="sheetDetailTitle">선택 주문 상세</div>
                <div className="sheetDetailSub">
                  주문번호 {focusedOrder.orderNumber || focusedOrder.id} · 셀러{" "}
                  {focusedOrder.sellerName || "-"} · 상태 {focusedLifecycle?.label || "-"}
                </div>
              </div>

              <div className="sheetDetailActions">
                <button
                  type="button"
                  className="sheetBtn sheetBtnGhost"
                  onClick={() =>
                    exportRowsToCsv(
                      visibleRows.filter((row) => row.orderId === focusedOrder.id)
                    )
                  }
                >
                  주문 CSV
                </button>

                <button
                  type="button"
                  className="sheetBtn sheetBtnGhost"
                  onClick={() => nav(`/packing/${focusedOrder.id}`)}
                >
                  패킹리스트
                </button>
              </div>
            </div>

            <div className="sheetDetailMetaGrid">
              <div>
                <span className="metaLabel">고객명</span>
                <span className="metaValue">{focusedOrder.customerName || "-"}</span>
              </div>
              <div>
                <span className="metaLabel">수취인명</span>
                <span className="metaValue">
                  {focusedOrder.recipientName || focusedOrder.customerName || "-"}
                </span>
              </div>
              <div>
                <span className="metaLabel">연락처</span>
                <span className="metaValue">{focusedOrder.phone || "-"}</span>
              </div>
              <div>
                <span className="metaLabel">주소</span>
                <span className="metaValue">
                  {buildAddress(focusedOrder) || focusedOrder.address || "-"}
                </span>
              </div>
            </div>

            <div className="sheetShippingEditor">
              <div className="sheetShippingHeader">
                <div>
                  <div className="sheetMiniTitle">배송 처리 패널</div>
                  <div className="sheetShippingSubtext">
                    1) 택배사와 운송장번호를 입력하고 저장하면 자동으로 <strong>배송 중</strong>이 됩니다.
                    2) 실제 배송이 끝나면 <strong>배송완료</strong>를 누르세요.
                    3) 잘못 처리했으면 <strong>완료취소</strong>로 되돌릴 수 있습니다.
                  </div>
                </div>

                <div
                  className={`sheetStatusPill sheetStatusPill--${
                    focusedLifecycle?.value || "NEW"
                  }`}
                >
                  현재 상태: {focusedLifecycle?.label || "-"}
                </div>
              </div>

              <div className="sheetShippingSteps">
                <div className="sheetStepCard">
                  <div className="sheetStepNumber">1</div>
                  <div>
                    <div className="sheetStepTitle">배송정보 입력</div>
                    <div className="sheetStepText">
                      선택한 주문에 택배사와 운송장번호를 입력합니다.
                    </div>
                  </div>
                </div>

                <div className="sheetStepCard">
                  <div className="sheetStepNumber">2</div>
                  <div>
                    <div className="sheetStepTitle">배송 중 전환</div>
                    <div className="sheetStepText">
                      운송장번호를 저장하면 자동으로 배송 중 상태가 됩니다.
                    </div>
                  </div>
                </div>

                <div className="sheetStepCard">
                  <div className="sheetStepNumber">3</div>
                  <div>
                    <div className="sheetStepTitle">배송완료 마감</div>
                    <div className="sheetStepText">
                      실제 완료 확인 후 배송완료를 누르고, 필요하면 완료취소를 사용합니다.
                    </div>
                  </div>
                </div>
              </div>

              <div className="sheetShippingSummaryGrid">
                <div>
                  <span className="metaLabel">저장된 택배사</span>
                  <span className="metaValue">{focusedOrder.courier || "-"}</span>
                </div>
                <div>
                  <span className="metaLabel">저장된 운송장번호</span>
                  <span className="metaValue">{focusedOrder.trackingNumber || "-"}</span>
                </div>
                <div>
                  <span className="metaLabel">배송중 시작</span>
                  <span className="metaValue">{formatDateTime(focusedOrder.shippedAt)}</span>
                </div>
                <div>
                  <span className="metaLabel">배송완료일</span>
                  <span className="metaValue">
                    {formatDateTime(focusedOrder.deliveryCompletedAt)}
                  </span>
                </div>
              </div>

              <div className="sheetShippingGrid">
                <div>
                  <label className="metaLabel">택배사</label>
                  <input
                    className="sheetControl sheetFullWidth"
                    value={shippingCourier}
                    onChange={(e) => setShippingCourier(e.target.value)}
                    placeholder="예: CJ대한통운"
                    disabled={working}
                  />
                </div>

                <div>
                  <label className="metaLabel">운송장번호</label>
                  <input
                    className="sheetControl sheetFullWidth"
                    value={shippingTracking}
                    onChange={(e) => setShippingTracking(e.target.value)}
                    placeholder="운송장번호 입력"
                    disabled={working}
                  />
                </div>
              </div>

              <div className="sheetShippingActions">
                <button
                  type="button"
                  className="sheetBtn sheetBtnGhost"
                  disabled={working || !hasUnsavedShippingChanges}
                  onClick={handleSaveShippingInfo}
                >
                  배송정보 저장
                </button>

                <button
                  type="button"
                  className="sheetBtn sheetBtnSuccess"
                  disabled={
                    working ||
                    !String(
                      shippingTracking || focusedOrder?.trackingNumber || ""
                    ).trim() ||
                    !!focusedOrder?.deliveryCompletedAt
                  }
                  onClick={handleMarkCompleted}
                >
                  배송완료
                </button>

                <button
                  type="button"
                  className="sheetBtn sheetBtnWarn"
                  disabled={working || !focusedOrder?.deliveryCompletedAt}
                  onClick={handleReopenDelivery}
                >
                  완료취소
                </button>
              </div>

              <div className="sheetShippingStateHelp">
                {!String(shippingTracking || focusedOrder?.trackingNumber || "").trim() && (
                  <span>운송장번호를 먼저 저장해야 배송 중으로 전환됩니다.</span>
                )}

                {String(shippingTracking || focusedOrder?.trackingNumber || "").trim() &&
                  !focusedOrder?.deliveryCompletedAt && (
                    <span>
                      이 주문은 배송 중 처리 가능 상태입니다. 실제 수령 확인 후 배송완료를 누르세요.
                    </span>
                  )}

                {focusedOrder?.deliveryCompletedAt && (
                  <span>
                    이 주문은 이미 배송완료 상태입니다. 필요하면 완료취소로 배송 중 상태로 되돌릴 수 있습니다.
                  </span>
                )}
              </div>
            </div>

            <div className="sheetDetailItems">
              <div className="sheetMiniTitle">주문 품목</div>
              <table className="sheetMiniTable">
                <thead>
                  <tr>
                    <th>상품명</th>
                    <th>옵션정보</th>
                    <th className="right">수량</th>
                  </tr>
                </thead>
                <tbody>
                  {focusedOrderLines.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="sheetEmptyCell">
                        품목이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    focusedOrderLines.map((line) => (
                      <tr key={line.id}>
                        <td>{getProductName(line)}</td>
                        <td>{getOptionInfo(line)}</td>
                        <td className="right">{line.qty || 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}