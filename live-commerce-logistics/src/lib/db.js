// src/lib/db.js
import { initialState, newId } from "../data/store.js";
import { supabase } from "./supabase.js";

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

function safeId(value) {
  return isUuid(value) ? value : newId();
}

function mapRows(rows, mapper = (x) => x) {
  return Array.isArray(rows) ? rows.map(mapper) : [];
}

function byCreatedDesc(a, b, key = "created_at") {
  return String(b?.[key] || "").localeCompare(String(a?.[key] || ""));
}

async function ensureBrandExists({ brandCode, brandName }) {
  const code = String(brandCode || "").trim();
  const name = String(brandName || "").trim();
  if (!code || !name) return;

  const { error } = await supabase.from("brands").upsert(
    {
      id: newId(),
      brand_code: code,
      brand_name: name,
    },
    {
      onConflict: "brand_code",
    }
  );

  if (error) throw new Error(error.message);
}

export async function loadAppData() {
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

  return {
    ...initialState,

    brands: mapRows(brandsRes.data, (r) => ({
      id: r.id,
      brandCode: r.brand_code || "",
      brandName: r.brand_name || "",
    })),

    catalogProducts: mapRows(productsRes.data, (r) => ({
      id: r.id,
      brandCode: r.brand_code || "",
      brandName: r.brand_name || "",
      productCode: r.product_code || "",
      sku: r.sku || "",
      productName: r.official_product_name || "",
      productImage: r.product_image || "",
      advantage: r.advantage || "",
      stock: Number(r.stock || 0),
      supplyPrice: Number(r.supply_price || 0),
      consumerPrice: Number(r.consumer_price || 0),
      lowestPrice: Number(r.lowest_price || 0),
      livePrice: Number(r.live_sale_price || 0),
      active: r.active !== false,
    })),

    catalogEvents: mapRows(eventsRes.data, (r) => ({
      id: r.id,
      eventSku: r.event_sku || "",
      eventCode: r.event_code || "",
      productName: r.product_name || "",
      productImage: r.image || "",
      supplyPrice: Number(r.supply_price || 0),
      salePrice: Number(r.sale_price || 0),
      consumerPrice: Number(r.consumer_price || 0),
      active: r.active !== false,
    })),

    catalogGifts: mapRows(giftsRes.data, (r) => ({
      id: r.id,
      giftName: r.gift_name || "",
      giftCode: r.gift_code || "",
      stock: Number(r.stock || 0),
    })),

    aliasTable: mapRows(aliasRes.data, (r) => ({
      id: r.id,
      aliasName: r.alias_name || "",
      targetType: r.target_type || "PRODUCT",
      targetSku: r.target_sku || "",
      officialName: r.official_name || "",
      active: r.active !== false,
    })),

    mainProducts: mapRows(mainRes.data, (r) => ({
      id: r.id,
      brandName: r.brand_name || "",
      productName: r.product_name || "",
      productCode: r.product_code || "",
      stock: Number(r.stock || 0),
      supplyPrice: Number(r.supply_price || 0),
      retailPrice: Number(r.retail_price || 0),
      lowestPrice: Number(r.lowest_price || 0),
      onlinePrice: Number(r.online_price || 0),
      livePrice: Number(r.online_price || 0),
    })),

    setProducts: mapRows(setProductsRes.data, (r) => ({
      id: r.id,
      setName: r.set_name || "",
      setCode: r.set_code || "",
      productsInside:
        typeof r.products_inside === "string"
          ? r.products_inside
          : JSON.stringify(r.products_inside || ""),
    })),

    setComponents: mapRows(setComponentsRes.data, (r) => ({
      id: r.id,
      setCode: r.set_code || "",
      productCode: r.product_code || "",
      qtyPerSet: Number(r.qty_per_set || 0),
    })),

    orders: mapRows(ordersRes.data, (r) => ({
      id: r.id,
      createdAt: r.created_at || "",
      paidAt: r.paid_at || "",
      status: r.status || "DRAFT",
      sellerName: r.seller_name || r.influencer_name || "",
      customerName: r.customer_name || "",
      recipientName: r.recipient_name || "",
      phone: r.phone || "",
      country: r.country || "",
      city: r.city || "",
      postalCode: r.postal_code || "",
      addressMain: r.address_main || "",
      addressDetail: r.address_detail || "",
      saveAddressBook: !!r.save_address_book,
      deliveryMemo: r.delivery_memo || "",
      address: r.address || "",
      shippingMethod: r.shipping_method || "택배",
      courier: r.courier || "",
      trackingNumber: r.tracking_number || "",
      shippedAt: r.shipped_at || "",
      deliveredAt: r.delivered_at || "",
      notes: r.notes || "",
      sellerSubmitted: !!r.seller_submitted,
      sellerSubmittedAt: r.seller_submitted_at || "",
      orderNumber: r.order_number || "",
      orderSource: r.order_source || "",
    })).sort((a, b) => byCreatedDesc(a, b, "createdAt")),

    orderLines: mapRows(orderItemsRes.data, (r) => ({
      id: r.id,
      orderId: r.order_id || "",
      itemType: r.item_type || "PRODUCT",
      itemCode: r.item_code || r.sku || "",
      itemName: r.item_name || r.product_name || "",
      sku: r.sku || "",
      officialName: r.product_name || "",
      brandCode: r.brand_code || "",
      productCode: r.product_code || "",
      matchedAlias: r.matched_alias || "",
      matchType: r.match_type || "",
      qty: Number(r.quantity || 0),
      supplyPrice: Number(r.supply_price || 0),
      salePrice: Number(r.sale_price || 0),
      createdAt: r.created_at || "",
    })),
  };
}

export async function replaceCatalogData(payload) {
  const {
    brands = [],
    catalogProducts = [],
    catalogEvents = [],
    catalogGifts = [],
    aliasTable = [],
    mainProducts = [],
    setProducts = [],
    setComponents = [],
    gifts = [],
  } = payload || {};

  // delete children first, then parents
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
    const { error } = await supabase.from(table).delete().not("id", "is", null);
    if (error) throw new Error(error.message || `Failed clearing ${table}`);
  }

  if (brands.length) {
    const { error } = await supabase.from("brands").insert(
      brands.map((r) => ({
        id: safeId(r.id),
        brand_code: String(r.brandCode || "").trim(),
        brand_name: String(r.brandName || "").trim(),
      }))
    );
    if (error) throw new Error(error.message);
  }

  if (catalogProducts.length) {
    const { error } = await supabase.from("products").insert(
      catalogProducts.map((r) => ({
        id: safeId(r.id),
        brand_code: String(r.brandCode || "").trim(),
        brand_name: String(r.brandName || "").trim(),
        product_code: String(r.productCode || "").trim(),
        sku: String(r.sku || "").trim(),
        official_product_name: r.productName || "",
        product_image: r.productImage || "",
        advantage: r.advantage || "",
        stock: Number(r.stock || 0),
        supply_price: Number(r.supplyPrice || 0),
        consumer_price: Number(r.consumerPrice || 0),
        lowest_price: Number(r.lowestPrice || 0),
        live_sale_price: Number(r.livePrice || 0),
        active: r.active !== false,
      }))
    );
    if (error) throw new Error(error.message);
  }

  if (catalogEvents.length) {
    const { error } = await supabase.from("event_products").insert(
      catalogEvents.map((r) => ({
        id: safeId(r.id),
        event_sku: r.eventSku,
        event_code: r.eventCode,
        product_name: r.productName,
        image: r.productImage || "",
        supply_price: Number(r.supplyPrice || 0),
        sale_price: Number(r.salePrice || 0),
        consumer_price: Number(r.consumerPrice || 0),
        active: r.active !== false,
      }))
    );
    if (error) throw new Error(error.message);
  }

  const mergedGifts = catalogGifts.length ? catalogGifts : gifts;
  if (mergedGifts.length) {
    const { error } = await supabase.from("gifts").insert(
      mergedGifts.map((r) => ({
        id: safeId(r.id),
        gift_name: r.giftName,
        gift_code: r.giftCode,
        stock: Number(r.stock || 0),
      }))
    );
    if (error) throw new Error(error.message);
  }

  if (aliasTable.length) {
    const { error } = await supabase.from("alias_mapping").insert(
      aliasTable.map((r) => ({
        id: safeId(r.id),
        alias_name: r.aliasName,
        target_type: r.targetType,
        target_sku: r.targetSku,
        official_name: r.officialName,
        active: r.active !== false,
      }))
    );
    if (error) throw new Error(error.message);
  }

  if (mainProducts.length) {
    const { error } = await supabase.from("main_products").insert(
      mainProducts.map((r) => ({
        id: safeId(r.id),
        brand_name: r.brandName,
        product_name: r.productName,
        product_code: r.productCode,
        stock: Number(r.stock || 0),
        supply_price: Number(r.supplyPrice || 0),
        retail_price: Number(r.retailPrice || 0),
        lowest_price: Number(r.lowestPrice || 0),
        online_price: Number(r.onlinePrice || r.livePrice || 0),
      }))
    );
    if (error) throw new Error(error.message);
  }

  if (setProducts.length) {
    const { error } = await supabase.from("set_products").insert(
      setProducts.map((r) => ({
        id: safeId(r.id),
        set_name: r.setName,
        set_code: r.setCode,
        products_inside: r.productsInside || "",
      }))
    );
    if (error) throw new Error(error.message);
  }

  if (setComponents.length) {
    const { error } = await supabase.from("set_components").insert(
      setComponents.map((r) => ({
        id: safeId(r.id),
        set_code: r.setCode,
        product_code: r.productCode,
        qty_per_set: Number(r.qtyPerSet || 0),
      }))
    );
    if (error) throw new Error(error.message);
  }

  return loadAppData();
}

export async function upsertCatalogProduct(row) {
  await ensureBrandExists({
    brandCode: row.brandCode,
    brandName: row.brandName,
  });

  const payload = {
    id: safeId(row.id),
    brand_code: row.brandCode || "",
    brand_name: row.brandName || "",
    product_code: row.productCode || "",
    sku: row.sku || "",
    official_product_name: row.productName || "",
    product_image: row.productImage || "",
    advantage: row.advantage || "",
    stock: Number(row.stock || 0),
    supply_price: Number(row.supplyPrice || 0),
    consumer_price: Number(row.consumerPrice || 0),
    lowest_price: Number(row.lowestPrice || 0),
    live_sale_price: Number(row.livePrice || 0),
    active: row.active !== false,
  };

  const { error } = await supabase.from("products").upsert(payload);
  if (error) throw new Error(error.message);
}

export async function deleteCatalogProduct(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function upsertMainProduct(row) {
  const payload = {
    id: safeId(row.id),
    brand_name: row.brandName || "",
    product_name: row.productName || "",
    product_code: row.productCode || "",
    stock: Number(row.stock || 0),
    supply_price: Number(row.supplyPrice || 0),
    retail_price: Number(row.retailPrice || 0),
    lowest_price: Number(row.lowestPrice || 0),
    online_price: Number(row.onlinePrice || row.livePrice || 0),
  };

  const { error } = await supabase.from("main_products").upsert(payload);
  if (error) throw new Error(error.message);
}

export async function deleteMainProduct(id) {
  const { error } = await supabase.from("main_products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function upsertOrder(order) {
  const payload = {
    id: safeId(order.id),
    order_number: order.orderNumber || order.id,
    influencer_name: order.sellerName || "",
    seller_name: order.sellerName || "",
    order_source: order.orderSource || "WEB",
    status: order.status || "DRAFT",
    customer_name: order.customerName || "",
    recipient_name: order.recipientName || "",
    phone: order.phone || "",
    country: order.country || "",
    city: order.city || "",
    postal_code: order.postalCode || "",
    address_main: order.addressMain || "",
    address_detail: order.addressDetail || "",
    save_address_book: !!order.saveAddressBook,
    delivery_memo: order.deliveryMemo || "",
    address: order.address || "",
    shipping_method: order.shippingMethod || "택배",
    courier: order.courier || "",
    tracking_number: order.trackingNumber || "",
    paid_at: order.paidAt || null,
    shipped_at: order.shippedAt || null,
    delivered_at: order.deliveredAt || null,
    notes: order.notes || "",
    seller_submitted: !!order.sellerSubmitted,
    seller_submitted_at: order.sellerSubmittedAt || null,
    created_at: order.createdAt || new Date().toISOString(),
  };

  const { error } = await supabase.from("orders").upsert(payload);
  if (error) throw new Error(error.message);
}

export async function deleteOrderWithItems(orderId) {
  const itemsRes = await supabase.from("order_items").delete().eq("order_id", orderId);
  if (itemsRes.error) throw new Error(itemsRes.error.message);

  const orderRes = await supabase.from("orders").delete().eq("id", orderId);
  if (orderRes.error) throw new Error(orderRes.error.message);
}

export async function replaceOrderItems(orderId, items) {
  const del = await supabase.from("order_items").delete().eq("order_id", orderId);
  if (del.error) throw new Error(del.error.message);

  if (!items.length) return;

  const insertRows = items.map((r) => ({
    id: safeId(r.id),
    order_id: orderId,
    item_type: r.itemType || "PRODUCT",
    item_code: r.itemCode || r.sku || "",
    item_name: r.itemName || r.officialName || "",
    sku: r.sku || "",
    product_name: r.officialName || r.itemName || "",
    product_code: r.productCode || "",
    brand_code: r.brandCode || "",
    matched_alias: r.matchedAlias || "",
    match_type: r.matchType || "",
    quantity: Number(r.qty || 0),
    supply_price: Number(r.supplyPrice || 0),
    sale_price: Number(r.salePrice || 0),
    created_at: r.createdAt || new Date().toISOString(),
  }));

  const ins = await supabase.from("order_items").insert(insertRows);
  if (ins.error) throw new Error(ins.error.message);
}
