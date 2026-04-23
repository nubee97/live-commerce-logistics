import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../data/StoreProvider.jsx";
import {
  markOrdersExcelConfirmed,
  markOrderDeliveryCompleted,
  reopenOrderDelivery,
  updateOrderShippingInfo,
} from "../lib/db.js";
import "./OrderListPremium.css";

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
    return { value: "DELIVERED", label: "배송완료", className: "delivered" };
  }

  if (String(order.trackingNumber || "").trim()) {
    return { value: "IN_TRANSIT", label: "배송 중", className: "shipping" };
  }

  if (order.excelConfirmedAt) {
    return { value: "EXCEL_CONFIRMED", label: "발주확인", className: "confirmed" };
  }

  return { value: "NEW", label: "신규주문", className: "new" };
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

function uniqueOrderIds(rows) {
  return [...new Set((rows || []).map((row) => row.orderId).filter(Boolean))];
}

function makeSellerBadge(name = "") {
  const safe = String(name || "Seller").trim();
  const initials =
    safe
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "S";

  return initials;
}

function buildRows(orders, orderLines) {
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
  const [openSellers, setOpenSellers] = useState({});
  const [sellerPage, setSellerPage] = useState(1);

  const [shippingCourier, setShippingCourier] = useState("");
  const [shippingTracking, setShippingTracking] = useState("");

  const sellerGroupsPerPage = 5;

  const allRows = useMemo(() => {
    const orders = (state.orders || []).filter(
      (order) => String(order.status || "").toUpperCase() !== "DRAFT"
    );
    const orderLines = state.orderLines || [];
    return buildRows(orders, orderLines);
  }, [state.orders, state.orderLines]);

  const visibleRows = useMemo(() => {
    const fromIso = startOfDayIso(fromDate);
    const toIso = endOfDayIso(toDate);
    const q = String(keyword || "").trim().toLowerCase();

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

        if (!q) return true;

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

        return haystack.includes(q);
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

  const groupedSellers = useMemo(() => {
    const map = new Map();

    for (const row of visibleRows) {
      const key = row.sellerName || "Unknown Seller";
      if (!map.has(key)) {
        map.set(key, {
          sellerName: key,
          rows: [],
        });
      }
      map.get(key).rows.push(row);
    }

    return Array.from(map.values()).map((group) => {
      const orderIds = uniqueOrderIds(group.rows);
      const statuses = {
        newCount: group.rows.filter((r) => r.orderStatusValue === "NEW").length,
        confirmedCount: group.rows.filter((r) => r.orderStatusValue === "EXCEL_CONFIRMED").length,
        shippingCount: group.rows.filter((r) => r.orderStatusValue === "IN_TRANSIT").length,
        deliveredCount: group.rows.filter((r) => r.orderStatusValue === "DELIVERED").length,
      };

      return {
        ...group,
        orderIds,
        orderCount: orderIds.length,
        itemCount: group.rows.length,
        firstCreatedAt: group.rows[0]?.createdAt || "",
        ...statuses,
      };
    });
  }, [visibleRows]);

  const totalSellerPages = Math.max(1, Math.ceil(groupedSellers.length / sellerGroupsPerPage));
  const safeSellerPage = Math.min(sellerPage, totalSellerPages);
  const sellerPageRows = groupedSellers.slice(
    (safeSellerPage - 1) * sellerGroupsPerPage,
    safeSellerPage * sellerGroupsPerPage
  );

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

  function clearFilters() {
    setDateType("payment");
    setDetailField("ALL");
    setKeyword("");
    setFromDate("");
    setToDate("");
    setLifecycleFilter("ALL");
    setSellerPage(1);
  }

  function toggleRowSelection(rowId) {
    setSelectedRows((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  }

  function toggleSellerOpen(sellerName) {
    setOpenSellers((prev) => ({
      ...prev,
      [sellerName]: !prev[sellerName],
    }));
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
    const rows = visibleRows.filter((row) => selectedRows[row.rowId]);
    const exportTargetRows = rows.length ? rows : visibleRows;

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
      alert("Shipping info saved.");
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

  function handlePackingList(orderId) {
    nav(`/packing/${orderId}`);
  }

  const focusedLifecycle = focusedOrder ? getLifecycleStatus(focusedOrder) : null;

  return (
    <div className="premiumOrderPage">
      <section className="premiumOrderHero">
        <div>
          <div className="premiumOrderEyebrow">ORDER LIST</div>
          <h1 className="premiumOrderTitle">주문 목록</h1>
          <p className="premiumOrderSubtitle">
            Seller-grouped order operations with cleaner cards, paging, delivery handling, and faster admin scanning.
          </p>
        </div>

        <div className="premiumOrderHeroActions">
          <button className="premiumOrderBtn" onClick={() => nav("/dashboard")}>
            Dashboard
          </button>
          <button className="premiumOrderBtn" onClick={handleExcelDownload} disabled={working}>
            Excel Download
          </button>
        </div>
      </section>

      <section className="premiumFilterCard">
        <div className="premiumFilterGrid">
          <div>
            <label>조회기간</label>
            <select value={dateType} onChange={(e) => setDateType(e.target.value)} className="premiumField">
              <option value="payment">결제일</option>
              <option value="order">주문일</option>
              <option value="confirm">발주확인일</option>
              <option value="ship">배송처리일</option>
            </select>
          </div>

          <div>
            <label>시작일</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="premiumField" />
          </div>

          <div>
            <label>종료일</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="premiumField" />
          </div>

          <div>
            <label>상세 조건</label>
            <select value={detailField} onChange={(e) => setDetailField(e.target.value)} className="premiumField">
              <option value="ALL">전체</option>
              <option value="seller">셀러명</option>
              <option value="customer">고객명</option>
              <option value="nickname">닉네임</option>
              <option value="product">제품명</option>
            </select>
          </div>

          <div className="span2">
            <label>검색</label>
            <input
              className="premiumField"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search seller, customer, product, phone, address..."
            />
          </div>

          <div>
            <label>상태</label>
            <select value={lifecycleFilter} onChange={(e) => setLifecycleFilter(e.target.value)} className="premiumField">
              <option value="ALL">전체 상태</option>
              <option value="NEW">신규주문</option>
              <option value="EXCEL_CONFIRMED">발주확인</option>
              <option value="IN_TRANSIT">배송 중</option>
              <option value="DELIVERED">배송완료</option>
            </select>
          </div>

          <div className="filterActionCell">
            <button className="premiumOrderBtn ghost" onClick={clearFilters}>
              필터 초기화
            </button>
          </div>
        </div>
      </section>

      <section className="premiumSellerSection">
        <div className="premiumSectionHead">
          <div>
            <h2>Seller Groups</h2>
            <p>Orders are grouped by seller so you can review each seller’s activity more naturally.</p>
          </div>
          <div className="premiumCountPill">{groupedSellers.length} sellers</div>
        </div>

        <div className="premiumSellerGrid">
          {sellerPageRows.length === 0 ? (
            <div className="premiumEmptyCard">No matching seller groups found.</div>
          ) : (
            sellerPageRows.map((group) => {
              const isOpen = !!openSellers[group.sellerName];

              return (
                <div key={group.sellerName} className="premiumSellerCard">
                  <button
                    type="button"
                    className="premiumSellerCardHead"
                    onClick={() => toggleSellerOpen(group.sellerName)}
                  >
                    <div className="premiumSellerIdentity">
                      <div className="premiumSellerAvatar">{makeSellerBadge(group.sellerName)}</div>
                      <div>
                        <div className="premiumSellerName">{group.sellerName}</div>
                        <div className="premiumSellerMeta">
                          {group.orderCount} orders · {group.itemCount} item rows · latest {formatDateTime(group.firstCreatedAt)}
                        </div>
                      </div>
                    </div>

                    <div className="premiumSellerStats">
                      <span className="statusPill new">신규 {group.newCount}</span>
                      <span className="statusPill confirmed">발주확인 {group.confirmedCount}</span>
                      <span className="statusPill shipping">배송중 {group.shippingCount}</span>
                      <span className="statusPill delivered">완료 {group.deliveredCount}</span>
                      <span className="premiumExpandMark">{isOpen ? "−" : "+"}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="premiumSellerOrders">
                      {group.orderIds.map((orderId) => {
                        const rows = group.rows.filter((row) => row.orderId === orderId);
                        const first = rows[0];

                        return (
                          <div
                            key={orderId}
                            className={`premiumOrderCard ${focusedOrderId === orderId ? "active" : ""}`}
                          >
                            <div className="premiumOrderCardTop">
                              <div>
                                <div className="premiumOrderCardTitle">
                                  {first.customerName || "(No customer)"}
                                </div>
                                <div className="premiumOrderCardMeta">
                                  {formatDateTime(first.createdAt)} · {first.phone} · {first.address}
                                </div>
                              </div>

                              <div className="premiumOrderCardActions">
                                <span className={`statusPill ${first.orderStatusClass}`}>
                                  {first.orderStatus}
                                </span>
                                <button
                                  type="button"
                                  className="premiumMiniBtn"
                                  onClick={() => setFocusedOrderId(orderId)}
                                >
                                  상세보기
                                </button>
                                <button
                                  type="button"
                                  className="premiumMiniBtn"
                                  onClick={() => exportRowsToCsv(rows)}
                                >
                                  CSV
                                </button>
                                <button
                                  type="button"
                                  className="premiumMiniBtn"
                                  onClick={() => handlePackingList(orderId)}
                                >
                                  Packing
                                </button>
                              </div>
                            </div>

                            <div className="premiumOrderRowList">
                              {rows.map((row) => (
                                <div key={row.rowId} className="premiumItemRow">
                                  <div className="premiumItemCheck">
                                    <input
                                      type="checkbox"
                                      checked={!!selectedRows[row.rowId]}
                                      onChange={() => toggleRowSelection(row.rowId)}
                                    />
                                  </div>
                                  <div className="premiumItemInfo">
                                    <div className="premiumItemName">{row.productName}</div>
                                    <div className="premiumItemMeta">
                                      {row.optionInfo} · Qty {row.qty} · {row.shippingMethod}
                                    </div>
                                  </div>
                                  <div className="premiumItemMemo">{row.deliveryMemo}</div>
                                  <div className="premiumItemTracking">
                                    {row.courier} {row.trackingNumber !== "-" ? `· ${row.trackingNumber}` : ""}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="premiumPagination">
          <button
            className="premiumOrderBtn ghost"
            disabled={safeSellerPage <= 1}
            onClick={() => setSellerPage(safeSellerPage - 1)}
          >
            Prev
          </button>

          {Array.from({ length: totalSellerPages }, (_, index) => index + 1).map((page) => (
            <button
              key={page}
              className={`premiumPageBtn ${page === safeSellerPage ? "active" : ""}`}
              onClick={() => setSellerPage(page)}
            >
              {page}
            </button>
          ))}

          <button
            className="premiumOrderBtn ghost"
            disabled={safeSellerPage >= totalSellerPages}
            onClick={() => setSellerPage(safeSellerPage + 1)}
          >
            Next
          </button>
        </div>
      </section>

      {focusedOrder && (
        <section className="premiumDetailPanel">
          <div className="premiumSectionHead">
            <div>
              <h2>Delivery Detail Panel</h2>
              <p>
                {focusedOrder.customerName || "-"} · {focusedOrder.sellerName || "-"} · {focusedLifecycle?.label || "-"}
              </p>
            </div>
            <div className={`statusPill ${focusedLifecycle?.className || "new"}`}>
              {focusedLifecycle?.label || "-"}
            </div>
          </div>

          <div className="premiumDetailGrid">
            <div className="premiumInfoCard">
              <div className="premiumInfoLabel">Customer</div>
              <div className="premiumInfoValue">{focusedOrder.customerName || "-"}</div>
            </div>
            <div className="premiumInfoCard">
              <div className="premiumInfoLabel">Recipient</div>
              <div className="premiumInfoValue">{focusedOrder.recipientName || "-"}</div>
            </div>
            <div className="premiumInfoCard">
              <div className="premiumInfoLabel">Phone</div>
              <div className="premiumInfoValue">{focusedOrder.phone || "-"}</div>
            </div>
            <div className="premiumInfoCard span2">
              <div className="premiumInfoLabel">Address</div>
              <div className="premiumInfoValue">
                {buildAddress(focusedOrder) || focusedOrder.address || "-"}
              </div>
            </div>
          </div>

          <div className="premiumShippingPanel">
            <div className="premiumShippingFields">
              <div>
                <label>택배사</label>
                <input
                  className="premiumField"
                  value={shippingCourier}
                  onChange={(e) => setShippingCourier(e.target.value)}
                  placeholder="예: CJ대한통운"
                />
              </div>

              <div>
                <label>운송장번호</label>
                <input
                  className="premiumField"
                  value={shippingTracking}
                  onChange={(e) => setShippingTracking(e.target.value)}
                  placeholder="Tracking number"
                />
              </div>
            </div>

            <div className="premiumShippingActions">
              <button
                className="premiumOrderBtn"
                disabled={working || !hasUnsavedShippingChanges}
                onClick={handleSaveShippingInfo}
              >
                배송정보 저장
              </button>

              <button
                className="premiumOrderBtn success"
                disabled={
                  working ||
                  !String(shippingTracking || focusedOrder?.trackingNumber || "").trim() ||
                  !!focusedOrder?.deliveryCompletedAt
                }
                onClick={handleMarkCompleted}
              >
                배송완료
              </button>

              <button
                className="premiumOrderBtn warn"
                disabled={working || !focusedOrder?.deliveryCompletedAt}
                onClick={handleReopenDelivery}
              >
                완료취소
              </button>
            </div>

            <div className="premiumItemsTableWrap">
              <table className="premiumMiniTable">
                <thead>
                  <tr>
                    <th>상품명</th>
                    <th>옵션정보</th>
                    <th>수량</th>
                  </tr>
                </thead>
                <tbody>
                  {focusedOrderLines.length === 0 ? (
                    <tr>
                      <td colSpan={3}>No items.</td>
                    </tr>
                  ) : (
                    focusedOrderLines.map((line) => (
                      <tr key={line.id}>
                        <td>{getProductName(line)}</td>
                        <td>{getOptionInfo(line)}</td>
                        <td>{line.qty || 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}