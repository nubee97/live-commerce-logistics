export function buildAddressText(order) {
  return [
    order.recipientName ? `수령인: ${order.recipientName}` : "",
    order.phone ? `연락처: ${order.phone}` : "",
    order.postalCode ? `[${order.postalCode}]` : "",
    order.addressMain || "",
    order.addressDetail || "",
    order.deliveryMemo ? `배송메모: ${order.deliveryMemo}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

export function createOrderFormState(order) {
  return {
    customerName: order?.customerName || "",
    recipientName: order?.recipientName || "",
    phone: order?.phone || "",
    shippingMethod: order?.shippingMethod || "택배",
    postalCode: order?.postalCode || "",
    addressMain: order?.addressMain || "",
    addressDetail: order?.addressDetail || "",
    deliveryMemo: order?.deliveryMemo || "",
    saveAddressBook: !!order?.saveAddressBook,
  };
}
