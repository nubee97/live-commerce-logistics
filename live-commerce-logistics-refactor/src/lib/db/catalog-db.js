import {
  ensureBrandExists,
  ensureSupabase,
  safeId,
  supabase,
  toBoolActive,
  toNumber,
  toText,
  toTrimmedText,
} from "./shared.js";

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
