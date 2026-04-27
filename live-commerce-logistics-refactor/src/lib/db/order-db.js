import { deleteAllRows, ensureSupabase, safeId, supabase, toNumber, toText } from "./shared.js";
import { loadAppData } from "./app-db.js";

export async function upsertOrder(order) {
  ensureSupabase();

  const payload = {
    id: safeId(order.id),
    order_number: order.orderNumber || order.id,
    influencer_name: toText(order.sellerName),
    seller_name: toText(order.sellerName),
    order_source: toText(order.orderSource) || "WEB",
    status: toText(order.status) || "DRAFT",
    customer_name: toText(order.customerName),
    recipient_name: toText(order.recipientName),
    phone: toText(order.phone),
    country: toText(order.country),
    city: toText(order.city),
    postal_code: toText(order.postalCode),
    address_main: toText(order.addressMain),
    address_detail: toText(order.addressDetail),
    save_address_book: !!order.saveAddressBook,
    delivery_memo: toText(order.deliveryMemo),
    address: toText(order.address),
    shipping_method: toText(order.shippingMethod) || "택배",
    courier: toText(order.courier),
    tracking_number: toText(order.trackingNumber),
    paid_at: order.paidAt || null,
    shipped_at: order.shippedAt || null,
    delivered_at: order.deliveredAt || null,
    notes: toText(order.notes),
    seller_submitted: !!order.sellerSubmitted,
    seller_submitted_at: order.sellerSubmittedAt || null,
    created_at: order.createdAt || new Date().toISOString(),
    excel_confirmed_at: order.excelConfirmedAt || null,
    delivery_completed_at: order.deliveryCompletedAt || null,
  };

  const { error } = await supabase.from("orders").upsert(payload);
  if (error) throw new Error(error.message);
}

export async function markOrdersExcelConfirmed(orderIds = []) {
  ensureSupabase();

  const ids = Array.isArray(orderIds) ? orderIds.filter(Boolean) : [];
  if (!ids.length) return;

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("orders")
    .update({ excel_confirmed_at: now })
    .in("id", ids);

  if (error) throw new Error(error.message);
}

export async function updateOrderShippingInfo(orderId, { courier, trackingNumber }) {
  ensureSupabase();

  if (!orderId) return;

  const normalizedCourier = String(courier || "").trim();
  const normalizedTracking = String(trackingNumber || "").trim();

  const existingRes = await supabase
    .from("orders")
    .select("id, shipped_at, delivery_completed_at")
    .eq("id", orderId)
    .maybeSingle();

  if (existingRes.error) {
    throw new Error(existingRes.error.message);
  }

  const patch = {
    courier: normalizedCourier,
    tracking_number: normalizedTracking,
  };

  if (normalizedTracking && !existingRes.data?.shipped_at) {
    patch.shipped_at = new Date().toISOString();
  }

  if (!normalizedTracking && !existingRes.data?.delivery_completed_at) {
    patch.shipped_at = null;
  }

  const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
  if (error) throw new Error(error.message);
}

export async function markOrderDeliveryCompleted(orderId) {
  ensureSupabase();

  if (!orderId) return;

  const orderRes = await supabase
    .from("orders")
    .select("id, tracking_number, shipped_at")
    .eq("id", orderId)
    .maybeSingle();

  if (orderRes.error) {
    throw new Error(orderRes.error.message);
  }

  const trackingNumber = String(orderRes.data?.tracking_number || "").trim();

  if (!trackingNumber) {
    throw new Error("운송장번호가 있어야 배송완료 처리할 수 있습니다.");
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("orders")
    .update({
      shipped_at: orderRes.data?.shipped_at || now,
      delivered_at: now,
      delivery_completed_at: now,
    })
    .eq("id", orderId);

  if (error) throw new Error(error.message);
}

export async function reopenOrderDelivery(orderId) {
  ensureSupabase();

  if (!orderId) return;

  const { error } = await supabase
    .from("orders")
    .update({
      delivered_at: null,
      delivery_completed_at: null,
    })
    .eq("id", orderId);

  if (error) throw new Error(error.message);
}

export async function deleteOrderWithItems(orderId) {
  ensureSupabase();

  const itemsRes = await supabase.from("order_items").delete().eq("order_id", orderId);
  if (itemsRes.error) throw new Error(itemsRes.error.message);

  const orderRes = await supabase.from("orders").delete().eq("id", orderId);
  if (orderRes.error) throw new Error(orderRes.error.message);
}

export async function replaceOrderItems(orderId, items) {
  ensureSupabase();

  const del = await supabase.from("order_items").delete().eq("order_id", orderId);
  if (del.error) throw new Error(del.error.message);

  if (!Array.isArray(items) || items.length === 0) return;

  const insertRows = items.map((r) => ({
    id: safeId(r.id),
    order_id: orderId,
    item_type: toText(r.itemType) || "PRODUCT",
    item_code: toText(r.itemCode || r.sku),
    item_name: toText(r.itemName || r.officialName),
    sku: toText(r.sku),
    product_name: toText(r.officialName || r.itemName),
    product_code: toText(r.productCode),
    brand_code: toText(r.brandCode),
    matched_alias: toText(r.matchedAlias),
    match_type: toText(r.matchType),
    quantity: toNumber(r.qty),
    supply_price: toNumber(r.supplyPrice),
    sale_price: toNumber(r.salePrice),
    created_at: r.createdAt || new Date().toISOString(),
  }));

  const ins = await supabase.from("order_items").insert(insertRows);
  if (ins.error) throw new Error(ins.error.message);
}

export async function clearOrdersOnly() {
  ensureSupabase();
  await deleteAllRows("order_items");
  await deleteAllRows("orders");
}

export async function saveOrderWithItems(order, items = []) {
  ensureSupabase();

  const orderId = safeId(order?.id);
  const normalizedOrder = {
    ...order,
    id: orderId,
    orderNumber: order?.orderNumber || orderId,
    createdAt: order?.createdAt || new Date().toISOString(),
  };

  await upsertOrder(normalizedOrder);

  const normalizedItems = (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    id: item?.id || safeId(),
    orderId,
  }));

  await replaceOrderItems(orderId, normalizedItems);

  return loadAppData();
}
