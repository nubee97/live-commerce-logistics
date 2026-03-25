// src/lib/db.js
import { initialState, newId } from "../data/store.js";
import { supabase } from "./supabase.js";

function ensureSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Check your environment variables.");
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

function safeId(value) {
  return isUuid(value) ? String(value).trim() : newId();
}

function mapRows(rows, mapper = (x) => x) {
  return Array.isArray(rows) ? rows.map(mapper) : [];
}

function byCreatedDesc(a, b, key = "createdAt") {
  return String(b?.[key] || "").localeCompare(String(a?.[key] || ""));
}

function toText(value) {
  return value == null ? "" : String(value);
}

function toTrimmedText(value) {
  return toText(value).trim();
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toBoolActive(value) {
  return value !== false;
}

function pickLastModified(row) {
  return (
    row?.updated_at ||
    row?.last_modified ||
    row?.modified_at ||
    row?.created_at ||
    ""
  );
}

function normalizeProductsInside(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function uniqueBy(list, keyFn) {
  const seen = new Set();
  const out = [];

  for (const item of list || []) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

async function deleteAllRows(tableName) {
  ensureSupabase();
  const { error } = await supabase.from(tableName).delete().not("id", "is", null);
  if (error) throw new Error(error.message || `Failed clearing ${tableName}`);
}

async function ensureBrandExists({ brandCode, brandName }) {
  ensureSupabase();

  const code = toTrimmedText(brandCode);
  const name = toTrimmedText(brandName);

  if (!code || !name) return;

  const existing = await supabase
    .from("brands")
    .select("id, brand_code, brand_name")
    .eq("brand_code", code)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message || "Failed checking brand.");
  }

  if (!existing.data) {
    const insertRes = await supabase.from("brands").insert({
      id: newId(),
      brand_code: code,
      brand_name: name,
    });

    if (insertRes.error) {
      throw new Error(insertRes.error.message || "Failed inserting brand.");
    }
    return;
  }

  if (existing.data.brand_name !== name && name) {
    const updateRes = await supabase
      .from("brands")
      .update({ brand_name: name })
      .eq("id", existing.data.id);

    if (updateRes.error) {
      throw new Error(updateRes.error.message || "Failed updating brand.");
    }
  }
}

function buildBrandRows(payload) {
  const explicitBrands = Array.isArray(payload?.brands) ? payload.brands : [];
  const catalogProducts = Array.isArray(payload?.catalogProducts)
    ? payload.catalogProducts
    : [];

  const inferredBrands = catalogProducts
    .filter((row) => toTrimmedText(row.brandCode) && toTrimmedText(row.brandName))
    .map((row) => ({
      id: row.brandId || newId(),
      brandCode: toTrimmedText(row.brandCode),
      brandName: toTrimmedText(row.brandName),
    }));

  const combined = [...explicitBrands, ...inferredBrands];

  return uniqueBy(
    combined
      .map((row) => ({
        id: safeId(row.id),
        brandCode: toTrimmedText(row.brandCode),
        brandName: toTrimmedText(row.brandName),
      }))
      .filter((row) => row.brandCode && row.brandName),
    (row) => row.brandCode
  );
}

export async function loadAppData() {
  ensureSupabase();

  const [
    brandsRes,
    productsRes,
    eventsRes,
    giftsRes,
    aliasRes,
    mainRes,
    setProductsRes,
    setComponentsRes,
    ordersRes,
    orderItemsRes,
  ] = await Promise.all([
    supabase.from("brands").select("*").order("brand_code"),
    supabase.from("products").select("*").order("brand_code").order("product_code"),
    supabase.from("event_products").select("*").order("event_code"),
    supabase.from("gifts").select("*").order("gift_code"),
    supabase.from("alias_mapping").select("*").order("alias_name"),
    supabase.from("main_products").select("*").order("brand_name").order("product_code"),
    supabase.from("set_products").select("*").order("set_code"),
    supabase.from("set_components").select("*").order("set_code").order("product_code"),
    supabase.from("orders").select("*").order("created_at", { ascending: false }),
    supabase.from("order_items").select("*").order("created_at", { ascending: false }),
  ]);

  const errors = [
    brandsRes.error,
    productsRes.error,
    eventsRes.error,
    giftsRes.error,
    aliasRes.error,
    mainRes.error,
    setProductsRes.error,
    setComponentsRes.error,
    ordersRes.error,
    orderItemsRes.error,
  ].filter(Boolean);

  if (errors.length) {
    throw new Error(errors[0].message || "Failed to load app data from Supabase.");
  }

  const catalogGifts = mapRows(giftsRes.data, (r) => ({
    id: r.id,
    giftName: toText(r.gift_name),
    giftCode: toText(r.gift_code),
    stock: toNumber(r.stock),
    lastModified: pickLastModified(r),
  }));

  return {
    ...initialState,

    brands: mapRows(brandsRes.data, (r) => ({
      id: r.id,
      brandCode: toText(r.brand_code),
      brandName: toText(r.brand_name),
      lastModified: pickLastModified(r),
    })),

    catalogProducts: mapRows(productsRes.data, (r) => ({
      id: r.id,
      brandCode: toText(r.brand_code),
      brandName: toText(r.brand_name),
      productCode: toText(r.product_code),
      sku: toText(r.sku),
      productName: toText(r.official_product_name),
      productImage: toText(r.product_image),
      advantage: toText(r.advantage),
      stock: toNumber(r.stock),
      supplyPrice: toNumber(r.supply_price),
      consumerPrice: toNumber(r.consumer_price),
      lowestPrice: toNumber(r.lowest_price),
      livePrice: toNumber(r.live_sale_price),
      active: toBoolActive(r.active),
      lastModified: pickLastModified(r),
    })),

    catalogEvents: mapRows(eventsRes.data, (r) => ({
      id: r.id,
      eventSku: toText(r.event_sku),
      eventCode: toText(r.event_code),
      productName: toText(r.product_name),
      productImage: toText(r.image),
      supplyPrice: toNumber(r.supply_price),
      salePrice: toNumber(r.sale_price),
      consumerPrice: toNumber(r.consumer_price),
      active: toBoolActive(r.active),
      lastModified: pickLastModified(r),
    })),

    catalogGifts,
    gifts: catalogGifts,

    aliasTable: mapRows(aliasRes.data, (r) => ({
      id: r.id,
      aliasName: toText(r.alias_name),
      targetType: toText(r.target_type) || "PRODUCT",
      targetSku: toText(r.target_sku),
      officialName: toText(r.official_name),
      active: toBoolActive(r.active),
      lastModified: pickLastModified(r),
    })),

    mainProducts: mapRows(mainRes.data, (r) => ({
      id: r.id,
      brandName: toText(r.brand_name),
      productName: toText(r.product_name),
      productCode: toText(r.product_code),
      stock: toNumber(r.stock),
      supplyPrice: toNumber(r.supply_price),
      retailPrice: toNumber(r.retail_price),
      lowestPrice: toNumber(r.lowest_price),
      onlinePrice: toNumber(r.online_price),
      livePrice: toNumber(r.online_price),
      lastModified: pickLastModified(r),
    })),

    setProducts: mapRows(setProductsRes.data, (r) => ({
      id: r.id,
      setName: toText(r.set_name),
      setCode: toText(r.set_code),
      productsInside: normalizeProductsInside(r.products_inside),
      lastModified: pickLastModified(r),
    })),

    setComponents: mapRows(setComponentsRes.data, (r) => ({
      id: r.id,
      setCode: toText(r.set_code),
      productCode: toText(r.product_code),
      qtyPerSet: toNumber(r.qty_per_set),
      lastModified: pickLastModified(r),
    })),

    orders: mapRows(ordersRes.data, (r) => ({
      id: r.id,
      createdAt: r.created_at || "",
      paidAt: r.paid_at || "",
      status: toText(r.status) || "DRAFT",
      sellerName: toText(r.seller_name || r.influencer_name),
      customerName: toText(r.customer_name),
      recipientName: toText(r.recipient_name),
      phone: toText(r.phone),
      country: toText(r.country),
      city: toText(r.city),
      postalCode: toText(r.postal_code),
      addressMain: toText(r.address_main),
      addressDetail: toText(r.address_detail),
      saveAddressBook: !!r.save_address_book,
      deliveryMemo: toText(r.delivery_memo),
      address: toText(r.address),
      shippingMethod: toText(r.shipping_method) || "택배",
      courier: toText(r.courier),
      trackingNumber: toText(r.tracking_number),
      shippedAt: r.shipped_at || "",
      deliveredAt: r.delivered_at || "",
      notes: toText(r.notes),
      sellerSubmitted: !!r.seller_submitted,
      sellerSubmittedAt: r.seller_submitted_at || "",
      orderNumber: toText(r.order_number),
      orderSource: toText(r.order_source),
      lastModified: pickLastModified(r),
      excelConfirmedAt: r.excel_confirmed_at || "",
      deliveryCompletedAt: r.delivery_completed_at || "",
    })).sort((a, b) => byCreatedDesc(a, b, "createdAt")),

    orderLines: mapRows(orderItemsRes.data, (r) => ({
      id: r.id,
      orderId: toText(r.order_id),
      itemType: toText(r.item_type) || "PRODUCT",
      itemCode: toText(r.item_code || r.sku),
      itemName: toText(r.item_name || r.product_name),
      sku: toText(r.sku),
      officialName: toText(r.product_name),
      brandCode: toText(r.brand_code),
      productCode: toText(r.product_code),
      matchedAlias: toText(r.matched_alias),
      matchType: toText(r.match_type),
      qty: toNumber(r.quantity),
      supplyPrice: toNumber(r.supply_price),
      salePrice: toNumber(r.sale_price),
      createdAt: r.created_at || "",
      lastModified: pickLastModified(r),
    })),
  };
}

export async function replaceCatalogData(payload) {
  ensureSupabase();

  const {
    catalogProducts = [],
    catalogEvents = [],
    catalogGifts = [],
    aliasTable = [],
    mainProducts = [],
    setProducts = [],
    setComponents = [],
    gifts = [],
  } = payload || {};

  const brands = buildBrandRows(payload);
  const mergedGifts =
    Array.isArray(catalogGifts) && catalogGifts.length ? catalogGifts : gifts;

  const deleteTargets = [
    "products",
    "event_products",
    "gifts",
    "alias_mapping",
    "main_products",
    "set_components",
    "set_products",
    "brands",
  ];

  for (const table of deleteTargets) {
    await deleteAllRows(table);
  }

  if (brands.length) {
    const { error } = await supabase.from("brands").insert(
      brands.map((r) => ({
        id: safeId(r.id),
        brand_code: toTrimmedText(r.brandCode),
        brand_name: toTrimmedText(r.brandName),
      }))
    );
    if (error) throw new Error(error.message);
  }

  if (catalogProducts.length) {
    const { error } = await supabase.from("products").insert(
      catalogProducts.map((r) => ({
        id: safeId(r.id),
        brand_code: toTrimmedText(r.brandCode),
        brand_name: toTrimmedText(r.brandName),
        product_code: toTrimmedText(r.productCode),
        sku: toTrimmedText(r.sku),
        official_product_name: toText(r.productName),
        product_image: toText(r.productImage),
        advantage: toText(r.advantage),
        stock: toNumber(r.stock),
        supply_price: toNumber(r.supplyPrice),
        consumer_price: toNumber(r.consumerPrice),
        lowest_price: toNumber(r.lowestPrice),
        live_sale_price: toNumber(r.livePrice),
        active: toBoolActive(r.active),
      }))
    );
    if (error) throw new Error(error.message);
  }

  if (catalogEvents.length) {
    const { error } = await supabase.from("event_products").insert(
      catalogEvents.map((r) => ({
        id: safeId(r.id),
        event_sku: toText(r.eventSku),
        event_code: toText(r.eventCode),
        product_name: toText(r.productName),
        image: toText(r.productImage),
        supply_price: toNumber(r.supplyPrice),
        sale_price: toNumber(r.salePrice),
        consumer_price: toNumber(r.consumerPrice),
        active: toBoolActive(r.active),
      }))
    );
    if (error) throw new Error(error.message);
  }

  if (mergedGifts.length) {
    const { error } = await supabase.from("gifts").insert(
      mergedGifts.map((r) => ({
        id: safeId(r.id),
        gift_name: toText(r.giftName),
        gift_code: toText(r.giftCode),
        stock: toNumber(r.stock),
      }))
    );
    if (error) throw new Error(error.message);
  }

  if (aliasTable.length) {
    const { error } = await supabase.from("alias_mapping").insert(
      aliasTable.map((r) => ({
        id: safeId(r.id),
        alias_name: toText(r.aliasName),
        target_type: toText(r.targetType) || "PRODUCT",
        target_sku: toText(r.targetSku),
        official_name: toText(r.officialName),
        active: toBoolActive(r.active),
      }))
    );
    if (error) throw new Error(error.message);
  }

  if (mainProducts.length) {
    const { error } = await supabase.from("main_products").insert(
      mainProducts.map((r) => ({
        id: safeId(r.id),
        brand_name: toText(r.brandName),
        product_name: toText(r.productName),
        product_code: toText(r.productCode),
        stock: toNumber(r.stock),
        supply_price: toNumber(r.supplyPrice),
        retail_price: toNumber(r.retailPrice),
        lowest_price: toNumber(r.lowestPrice),
        online_price: toNumber(r.onlinePrice || r.livePrice),
      }))
    );
    if (error) throw new Error(error.message);
  }

  if (setProducts.length) {
    const { error } = await supabase.from("set_products").insert(
      setProducts.map((r) => ({
        id: safeId(r.id),
        set_name: toText(r.setName),
        set_code: toText(r.setCode),
        products_inside: toText(r.productsInside),
      }))
    );
    if (error) throw new Error(error.message);
  }

  if (setComponents.length) {
    const { error } = await supabase.from("set_components").insert(
      setComponents.map((r) => ({
        id: safeId(r.id),
        set_code: toText(r.setCode),
        product_code: toText(r.productCode),
        qty_per_set: toNumber(r.qtyPerSet),
      }))
    );
    if (error) throw new Error(error.message);
  }

  return loadAppData();
}

export async function upsertCatalogProduct(row) {
  ensureSupabase();

  await ensureBrandExists({
    brandCode: row.brandCode,
    brandName: row.brandName,
  });

  const payload = {
    id: safeId(row.id),
    brand_code: toTrimmedText(row.brandCode),
    brand_name: toTrimmedText(row.brandName),
    product_code: toTrimmedText(row.productCode),
    sku: toTrimmedText(row.sku),
    official_product_name: toText(row.productName),
    product_image: toText(row.productImage),
    advantage: toText(row.advantage),
    stock: toNumber(row.stock),
    supply_price: toNumber(row.supplyPrice),
    consumer_price: toNumber(row.consumerPrice),
    lowest_price: toNumber(row.lowestPrice),
    live_sale_price: toNumber(row.livePrice),
    active: toBoolActive(row.active),
  };

  const { error } = await supabase.from("products").upsert(payload);
  if (error) throw new Error(error.message);
}

export async function deleteCatalogProduct(id) {
  ensureSupabase();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function upsertEventProduct(row) {
  ensureSupabase();

  const payload = {
    id: safeId(row.id),
    event_sku: toText(row.eventSku),
    event_code: toText(row.eventCode),
    product_name: toText(row.productName),
    image: toText(row.productImage),
    supply_price: toNumber(row.supplyPrice),
    sale_price: toNumber(row.salePrice),
    consumer_price: toNumber(row.consumerPrice),
    active: toBoolActive(row.active),
  };

  const { error } = await supabase.from("event_products").upsert(payload);
  if (error) throw new Error(error.message);
}

export async function deleteEventProduct(id) {
  ensureSupabase();
  const { error } = await supabase.from("event_products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function upsertGift(row) {
  ensureSupabase();

  const payload = {
    id: safeId(row.id),
    gift_name: toText(row.giftName),
    gift_code: toText(row.giftCode),
    stock: toNumber(row.stock),
  };

  const { error } = await supabase.from("gifts").upsert(payload);
  if (error) throw new Error(error.message);
}

export async function deleteGift(id) {
  ensureSupabase();
  const { error } = await supabase.from("gifts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function upsertAliasMapping(row) {
  ensureSupabase();

  const payload = {
    id: safeId(row.id),
    alias_name: toText(row.aliasName),
    target_type: toText(row.targetType) || "PRODUCT",
    target_sku: toText(row.targetSku),
    official_name: toText(row.officialName),
    active: toBoolActive(row.active),
  };

  const { error } = await supabase.from("alias_mapping").upsert(payload);
  if (error) throw new Error(error.message);
}

export async function deleteAliasMapping(id) {
  ensureSupabase();
  const { error } = await supabase.from("alias_mapping").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function upsertMainProduct(row) {
  ensureSupabase();

  const payload = {
    id: safeId(row.id),
    brand_name: toText(row.brandName),
    product_name: toText(row.productName),
    product_code: toText(row.productCode),
    stock: toNumber(row.stock),
    supply_price: toNumber(row.supplyPrice),
    retail_price: toNumber(row.retailPrice),
    lowest_price: toNumber(row.lowestPrice),
    online_price: toNumber(row.onlinePrice || row.livePrice),
  };

  const { error } = await supabase.from("main_products").upsert(payload);
  if (error) throw new Error(error.message);
}

export async function deleteMainProduct(id) {
  ensureSupabase();
  const { error } = await supabase.from("main_products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function upsertSetProduct(row) {
  ensureSupabase();

  const payload = {
    id: safeId(row.id),
    set_name: toText(row.setName),
    set_code: toText(row.setCode),
    products_inside: toText(row.productsInside),
  };

  const { error } = await supabase.from("set_products").upsert(payload);
  if (error) throw new Error(error.message);
}

export async function deleteSetProduct(id) {
  ensureSupabase();
  const { error } = await supabase.from("set_products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function upsertSetComponent(row) {
  ensureSupabase();

  const payload = {
    id: safeId(row.id),
    set_code: toText(row.setCode),
    product_code: toText(row.productCode),
    qty_per_set: toNumber(row.qtyPerSet),
  };

  const { error } = await supabase.from("set_components").upsert(payload);
  if (error) throw new Error(error.message);
}

export async function deleteSetComponent(id) {
  ensureSupabase();
  const { error } = await supabase.from("set_components").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

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

  const { error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", orderId);

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

export async function resetAllAppData() {
  ensureSupabase();

  const deleteTargets = [
    "order_items",
    "orders",
    "products",
    "event_products",
    "gifts",
    "alias_mapping",
    "main_products",
    "set_components",
    "set_products",
    "brands",
  ];

  for (const table of deleteTargets) {
    await deleteAllRows(table);
  }
}