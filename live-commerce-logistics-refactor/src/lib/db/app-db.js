import {
  buildBrandRows,
  byCreatedDesc,
  deleteAllRows,
  ensureSupabase,
  initialState,
  mapRows,
  normalizeProductsInside,
  pickLastModified,
  safeId,
  supabase,
  toBoolActive,
  toNumber,
  toText,
  toTrimmedText,
} from "./shared.js";
import { clearOrdersOnly, replaceOrderItems, upsertOrder } from "./order-db.js";

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
  const mergedGifts = Array.isArray(catalogGifts) && catalogGifts.length ? catalogGifts : gifts;

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

export async function importFullCatalogAndOrders(imported) {
  await replaceCatalogData(imported);

  if (imported.orders?.length || imported.orderLines?.length) {
    await clearOrdersOnly();

    for (const order of imported.orders || []) {
      await upsertOrder(order);
      const items = (imported.orderLines || []).filter((line) => line.orderId === order.id);
      await replaceOrderItems(order.id, items);
    }
  }

  return loadAppData();
}
