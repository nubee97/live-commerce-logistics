import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../data/StoreProvider.jsx";
import PageHeader from "../components/PageHeader.jsx";
import MetricCard from "../components/MetricCard.jsx";
import { computePickList, computeGiftList } from "../lib/inventory.js";

function downloadFile(filename, content, mime = "text/plain;charset=utf-8") {
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

function startOfDayIso(yyyyMmDd) {
  if (!yyyyMmDd) return "";
  return new Date(`${yyyyMmDd}T00:00:00`).toISOString();
}

function endOfDayIso(yyyyMmDd) {
  if (!yyyyMmDd) return "";
  return new Date(`${yyyyMmDd}T23:59:59.999`).toISOString();
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR");
}

function statusMeta(status) {
  const value = String(status || "DRAFT").toUpperCase();
  if (value === "CONFIRMED") {
    return { label: "발주확인", className: "confirmed" };
  }
  if (value === "PACKED") {
    return { label: "배송중", className: "packed" };
  }
  if (value === "SHIPPED") {
    return { label: "배송완료", className: "shipped" };
  }
  return { label: "신규주문", className: "draft" };
}

function summarizeOrderLine(lines) {
  const safeLines = Array.isArray(lines) ? lines : [];
  if (safeLines.length === 0) {
    return "상품 없음";
  }

  const primary = safeLines[0];
  const primaryName = primary.officialName || primary.itemName || primary.productName || "상품명 없음";

  if (safeLines.length === 1) {
    return primaryName;
  }

  return `${primaryName} 외 ${safeLines.length - 1}건`;
}

export default function OrderList() {
  const { state } = useStore();
  const nav = useNavigate();

  const [expanded, setExpanded] = useState({});
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const metrics = useMemo(() => {
    const orders = state.orders || [];
    return {
      total: orders.length,
      draft: orders.filter((o) => (o.status || "DRAFT") === "DRAFT").length,
      confirmed: orders.filter((o) => (o.status || "") === "CONFIRMED").length,
      packed: orders.filter((o) => (o.status || "") === "PACKED").length,
      shipped: orders.filter((o) => (o.status || "") === "SHIPPED").length,
    };
  }, [state.orders]);

  const ordersFiltered = useMemo(() => {
    let list = [...(state.orders || [])];

    if (status !== "ALL") {
      list = list.filter((o) => (o.status || "DRAFT") === status);
    }

    const fromIso = startOfDayIso(fromDate);
    const toIso = endOfDayIso(toDate);

    if (fromIso) {
      list = list.filter((o) => {
        const ref = o.sellerSubmittedAt || o.paidAt || o.createdAt || "";
        return ref >= fromIso;
      });
    }

    if (toIso) {
      list = list.filter((o) => {
        const ref = o.sellerSubmittedAt || o.paidAt || o.createdAt || "";
        return ref <= toIso;
      });
    }

    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((o) => {
        const haystack = [
          o.customerName,
          o.sellerName,
          o.phone,
          o.recipientName,
          o.addressMain,
          o.addressDetail,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      });
    }

    return list
      .slice()
      .sort((a, b) =>
        (b.sellerSubmittedAt || b.paidAt || b.createdAt || "").localeCompare(
          a.sellerSubmittedAt || a.paidAt || a.createdAt || ""
        )
      );
  }, [state.orders, q, status, fromDate, toDate]);

  function toggle(orderId) {
    setExpanded((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  }

  function expandAll() {
    const all = {};
    for (const o of ordersFiltered) all[o.id] = true;
    setExpanded(all);
  }

  function collapseAll() {
    setExpanded({});
  }

  function clearFilters() {
    setQ("");
    setStatus("ALL");
    setFromDate("");
    setToDate("");
  }

  function saveOrderCsv(order) {
    const pick = computePickList(state, order.id);
    const gifts = computeGiftList(state, order.id);

    const confirmedTime = order.sellerSubmittedAt
      ? new Date(order.sellerSubmittedAt).toLocaleString()
      : "-";

    const shippingAddress = [order.postalCode || "", order.addressMain || "", order.addressDetail || ""]
      .filter(Boolean)
      .join(" / ");

    const baseColumns = {
      OrderId: order.id || "-",
      Seller: order.sellerName || "-",
      Customer: order.customerName || "-",
      Phone: order.phone || "-",
      Address: shippingAddress || "-",
      Shipping: order.shippingMethod || "-",
      Status: order.status || "DRAFT",
      ConfirmedAt: confirmedTime,
      CustomerDetailsCombined: order.address || "-",
    };

    const rows = [];

    if (pick.length > 0) {
      pick.forEach((r) => {
        rows.push({
          ...baseColumns,
          RowType: "PICK",
          ProductCode: r.productCode || "-",
          ProductName: r.productName || "-",
          PickQuantity: r.qty ?? 0,
          GiftCode: "",
          GiftName: "",
          GiftQuantity: "",
        });
      });
    }

    if (gifts.length > 0) {
      gifts.forEach((r) => {
        rows.push({
          ...baseColumns,
          RowType: "GIFT",
          ProductCode: "",
          ProductName: "",
          PickQuantity: "",
          GiftCode: r.giftCode || "-",
          GiftName: r.giftName || "-",
          GiftQuantity: r.qty ?? 0,
        });
      });
    }

    if (rows.length === 0) {
      rows.push({
        ...baseColumns,
        RowType: "ORDER",
        ProductCode: "",
        ProductName: "",
        PickQuantity: "",
        GiftCode: "",
        GiftName: "",
        GiftQuantity: "",
      });
    }

    const headers = [
      "OrderId",
      "Seller",
      "Customer",
      "Phone",
      "Address",
      "Shipping",
      "Status",
      "ConfirmedAt",
      "CustomerDetailsCombined",
      "RowType",
      "ProductCode",
      "ProductName",
      "PickQuantity",
      "GiftCode",
      "GiftName",
      "GiftQuantity",
    ];

    const csvLines = [headers.join(","), ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(","))];

    const safeName = (order.customerName || "Customer").replace(/[^\w\-]+/g, "_");
    const filename = `Order_${safeName}_${order.id.slice(0, 6)}.csv`;

    downloadFile(filename, csvLines.join("\n"), "text/csv;charset=utf-8");
  }

  const metricCards = [
    { label: "전체 주문", value: metrics.total, hint: "All orders", tone: "default" },
    { label: "신규주문", value: metrics.draft, hint: "Draft", tone: "info" },
    { label: "발주확인", value: metrics.confirmed, hint: "Confirmed", tone: "success" },
    { label: "배송중", value: metrics.packed, hint: "Packed", tone: "warn" },
    { label: "배송완료", value: metrics.shipped, hint: "Shipped", tone: "default" },
  ];

  return (
    <div className="orderBoardPage">
      <PageHeader
        kicker="주문통합검색 · Order Center"
        title="Confirmed & Searchable Order List"
        subtitle="Inspired by your Korean Excel operations sheet: date filters first, then seller/customer search, then row-by-row operational actions like packing and CSV export."
        actions={
          <>
            <button className="btn secondary" onClick={() => nav("/dashboard")} type="button">
              Back to Dashboard
            </button>
            <button className="btn" onClick={expandAll} type="button">
              Expand All
            </button>
            <button className="btn" onClick={collapseAll} type="button">
              Collapse All
            </button>
          </>
        }
      />

      <div className="metricsGrid orderMetricsGrid">
        {metricCards.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            tone={metric.tone}
          />
        ))}
      </div>

      <div className="dashboardSection filterBoardCard noPrint">
        <div className="sectionTopRow">
          <div>
            <div className="sectionTitle">조회조건</div>
            <div className="sectionSubtitle">Search by date, status, seller, customer, recipient, or phone number.</div>
          </div>
          <div className="sectionMetaBadge">Results {ordersFiltered.length}</div>
        </div>

        <div className="filterBoardGrid">
          <div className="filterField wide">
            <label className="label">검색어 (셀러명 / 고객명 / 연락처 / 주소)</label>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="예: Pascal, User1, 010-1234-5678, 성동구"
            />
          </div>

          <div className="filterField">
            <label className="label">주문상태</label>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">전체</option>
              <option value="DRAFT">신규주문</option>
              <option value="CONFIRMED">발주확인</option>
              <option value="PACKED">배송중</option>
              <option value="SHIPPED">배송완료</option>
            </select>
          </div>

          <div className="filterField">
            <label className="label">조회 시작일</label>
            <input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>

          <div className="filterField">
            <label className="label">조회 종료일</label>
            <input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>

        <div className="toolbar" style={{ marginBottom: 0 }}>
          <div className="filterHintRow">
            <span className="chip">엑셀 기준 컬럼: 주문일 / 배송속성 / 주문상태 / 상품명 / 셀러명 / 수취인명</span>
          </div>
          <button className="btn" onClick={clearFilters} type="button">
            Clear Filters
          </button>
        </div>
      </div>

      {ordersFiltered.length === 0 ? (
        <div className="dashboardSection emptyStatePanel">
          <div className="sectionTitle">No orders found</div>
          <div className="sectionSubtitle">Try clearing filters or submitting an order first.</div>
        </div>
      ) : (
        <div className="orderCardList">
          {ordersFiltered.map((order) => {
            const isOpen = !!expanded[order.id];
            const meta = statusMeta(order.status);
            const confirmedTime = formatDateTime(order.sellerSubmittedAt || order.paidAt || order.createdAt);
            const lines = (state.orderLines || []).filter((line) => line.orderId === order.id);
            const lineSummary = summarizeOrderLine(lines);
            const pickRows = computePickList(state, order.id).slice().sort((a, b) =>
              (a.productName || "").localeCompare(b.productName || "", "ko")
            );
            const giftRows = computeGiftList(state, order.id);
            const pickCount = pickRows.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
            const giftCount = giftRows.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
            const shippingAddress = [order.postalCode, order.addressMain, order.addressDetail]
              .filter(Boolean)
              .join(" ");

            return (
              <div key={order.id} className={`orderOpsCard ${isOpen ? "open" : ""}`}>
                <div className="orderOpsTop">
                  <div className="orderOpsIdentity">
                    <div className="orderOpsTitleRow">
                      <h3>{order.customerName || order.recipientName || "(No customer)"}</h3>
                      <span className={`statusBadge ${meta.className}`}>{meta.label}</span>
                    </div>
                    <div className="orderOpsMetaLine">
                      <span>주문일 {formatDateTime(order.createdAt)}</span>
                      <span>발주확인일 {confirmedTime}</span>
                      <span>셀러 {order.sellerName || "-"}</span>
                    </div>
                    <div className="orderOpsSummary">대표 상품: {lineSummary}</div>
                  </div>

                  <div className="orderOpsActions noPrint">
                    <button className="btn" onClick={() => toggle(order.id)} type="button">
                      {isOpen ? "Collapse" : "Expand"}
                    </button>
                    <button className="btn" onClick={() => saveOrderCsv(order)} type="button">
                      Save CSV
                    </button>
                    {(order.status || "DRAFT") === "CONFIRMED" && (
                      <button className="btn primary" onClick={() => nav(`/packing/${order.id}`)} type="button">
                        Packing List
                      </button>
                    )}
                  </div>
                </div>

                <div className="orderOpsChipRow">
                  <span className="chip">배송속성: {order.shippingMethod || "-"}</span>
                  <span className="chip">수량: Pick {pickCount}</span>
                  <span className="chip">사은품: {giftCount}</span>
                  <span className="chip">수취인: {order.recipientName || order.customerName || "-"}</span>
                  <span className="chip">연락처: {order.phone || "-"}</span>
                  <span className="chip">주소: {shippingAddress || order.address || "-"}</span>
                </div>

                {isOpen && (
                  <>
                    <div className="hr" />

                    <div className="orderDetailGrid">
                      <div className="detailPanel">
                        <div className="detailPanelTitle">주문 정보</div>
                        <div className="detailInfoGrid">
                          <div>
                            <div className="label">주문번호</div>
                            <div className="detailValue">{order.orderNumber || order.id}</div>
                          </div>
                          <div>
                            <div className="label">주문상태</div>
                            <div className="detailValue">{meta.label}</div>
                          </div>
                          <div>
                            <div className="label">셀러명</div>
                            <div className="detailValue">{order.sellerName || "-"}</div>
                          </div>
                          <div>
                            <div className="label">배송속성</div>
                            <div className="detailValue">{order.shippingMethod || "-"}</div>
                          </div>
                          <div>
                            <div className="label">수취인명</div>
                            <div className="detailValue">{order.recipientName || order.customerName || "-"}</div>
                          </div>
                          <div>
                            <div className="label">연락처</div>
                            <div className="detailValue">{order.phone || "-"}</div>
                          </div>
                        </div>
                      </div>

                      <div className="detailPanel">
                        <div className="detailPanelTitle">배송 정보</div>
                        <div className="detailInfoGrid">
                          <div>
                            <div className="label">우편번호</div>
                            <div className="detailValue">{order.postalCode || "-"}</div>
                          </div>
                          <div>
                            <div className="label">택배사</div>
                            <div className="detailValue">{order.courier || "-"}</div>
                          </div>
                          <div style={{ gridColumn: "1 / -1" }}>
                            <div className="label">주소</div>
                            <div className="detailValue multiline">{shippingAddress || order.address || "-"}</div>
                          </div>
                          <div style={{ gridColumn: "1 / -1" }}>
                            <div className="label">배송메모</div>
                            <div className="detailValue multiline">{order.deliveryMemo || "-"}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="orderTablesGrid">
                      <div className="detailPanel">
                        <div className="detailPanelTitle">주문 품목</div>
                        <div className="tableWrap compact">
                          <table>
                            <thead>
                              <tr>
                                <th>유형</th>
                                <th>상품명</th>
                                <th>코드</th>
                                <th className="right">수량</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lines.length === 0 ? (
                                <tr>
                                  <td colSpan="4" className="small">등록된 품목이 없습니다.</td>
                                </tr>
                              ) : (
                                lines.map((line) => (
                                  <tr key={line.id}>
                                    <td>{line.itemType || "PRODUCT"}</td>
                                    <td>{line.officialName || line.itemName || "-"}</td>
                                    <td>{line.sku || line.itemCode || line.productCode || "-"}</td>
                                    <td className="right">{line.qty || 0}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="detailPanel">
                        <div className="detailPanelTitle">창고 Pick List</div>
                        <div className="tableWrap compact">
                          <table>
                            <thead>
                              <tr>
                                <th>상품코드</th>
                                <th>상품명</th>
                                <th className="right">수량</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pickRows.length === 0 ? (
                                <tr>
                                  <td colSpan="3" className="small">No items.</td>
                                </tr>
                              ) : (
                                pickRows.map((row) => (
                                  <tr key={row.productCode}>
                                    <td>{row.productCode}</td>
                                    <td>{row.productName}</td>
                                    <td className="right">{row.qty}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="detailPanel giftPanel">
                      <div className="detailPanelTitle">사은품</div>
                      <div className="tableWrap compact">
                        <table>
                          <thead>
                            <tr>
                              <th>사은품 코드</th>
                              <th>사은품명</th>
                              <th className="right">수량</th>
                            </tr>
                          </thead>
                          <tbody>
                            {giftRows.length === 0 ? (
                              <tr>
                                <td colSpan="3" className="small">No gifts for this order.</td>
                              </tr>
                            ) : (
                              giftRows.map((row) => (
                                <tr key={row.giftCode}>
                                  <td>{row.giftCode}</td>
                                  <td>{row.giftName}</td>
                                  <td className="right">{row.qty}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
