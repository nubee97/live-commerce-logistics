import {
  markOrdersExcelConfirmed,
  markOrderDeliveryCompleted,
  reopenOrderDelivery,
  updateOrderShippingInfo,
} from "../../lib/db.js";
import { downloadFile, escapeCsv, formatDateTime, getDateValueByType, uniqueOrderIds } from "./order-list-utils.js";

export function exportOrderRowsToCsv(rows, dateType) {
  if (!rows.length) {
    alert("No rows to export.");
    return false;
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

  const filename = `orders_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
  downloadFile(filename, csvLines.join("\n"));
  return true;
}

export async function exportAndConfirmOrders(rows, dateType) {
  const didExport = exportOrderRowsToCsv(rows, dateType);
  if (!didExport) return;

  const orderIds = uniqueOrderIds(rows);
  await markOrdersExcelConfirmed(orderIds);
}

export async function saveOrderShippingInfo(orderId, payload) {
  return updateOrderShippingInfo(orderId, payload);
}

export async function completeOrderDelivery(orderId) {
  return markOrderDeliveryCompleted(orderId);
}

export async function reopenCompletedOrder(orderId) {
  return reopenOrderDelivery(orderId);
}
