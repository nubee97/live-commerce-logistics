export function downloadFile(filename, content, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function escapeCsv(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function startOfDayIso(yyyyMmDd) {
  if (!yyyyMmDd) return "";
  return new Date(`${yyyyMmDd}T00:00:00`).toISOString();
}

export function endOfDayIso(yyyyMmDd) {
  if (!yyyyMmDd) return "";
  return new Date(`${yyyyMmDd}T23:59:59.999`).toISOString();
}

export function buildAddress(order) {
  return [order?.postalCode, order?.addressMain, order?.addressDetail].filter(Boolean).join(" ").trim();
}

export function getLifecycleStatus(order) {
  if (order?.deliveryCompletedAt) {
    return { value: "DELIVERED", label: "배송완료", className: "delivered" };
  }

  if (String(order?.trackingNumber || "").trim()) {
    return { value: "IN_TRANSIT", label: "배송 중", className: "shipping" };
  }

  if (order?.excelConfirmedAt) {
    return { value: "EXCEL_CONFIRMED", label: "발주확인", className: "confirmed" };
  }

  return { value: "NEW", label: "신규주문", className: "new" };
}

export function getDateValueByType(order, dateType) {
  if (dateType === "payment") return order?.paidAt || "";
  if (dateType === "confirm") return order?.excelConfirmedAt || order?.sellerSubmittedAt || "";
  if (dateType === "ship") return order?.shippedAt || order?.deliveryCompletedAt || "";
  return order?.createdAt || "";
}

export function getProductName(line) {
  return line?.officialName || line?.itemName || line?.productName || line?.itemCode || "-";
}

export function getOptionInfo(line) {
  return line?.itemType === "SET" ? "SET" : line?.itemType === "GIFT" ? "GIFT" : "PRODUCT";
}

export function uniqueOrderIds(rows) {
  return Array.from(new Set(rows.map((row) => row.orderId).filter(Boolean)));
}

export function makeSellerBadge(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || String(name).slice(0, 1).toUpperCase() || "S";
  return initials;
}

export function buildRows(orders, orderLines) {
  return orders.flatMap((order) => {
    const lifecycle = getLifecycleStatus(order);
    const lines = orderLines.filter((line) => line.orderId === order.id);

    const base = {
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      createdAt: order.createdAt || "",
      paymentAt: order.paidAt || order.sellerSubmittedAt || order.createdAt || "",
      excelConfirmedAt: order.excelConfirmedAt || "",
      confirmAt: order.excelConfirmedAt || order.sellerSubmittedAt || order.paidAt || "",
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
      return [{ ...base, rowId: `${order.id}__empty`, lineId: "", productName: "-", optionInfo: "-", qty: 0 }];
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
