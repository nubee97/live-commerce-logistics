import { initialState } from "../../data/store.js";
import {
  importFullCatalogAndOrders,
  loadAppData,
  replaceCatalogData,
  resetAllAppData,
  upsertCatalogProduct,
  deleteCatalogProduct,
  upsertMainProduct,
  deleteMainProduct,
} from "../../lib/db.js";
import { supabase } from "../../lib/supabase.js";
import { exportInventoryToXlsx, importInventoryFromXlsx, exportJson, importJson } from "../../lib/io.js";

export function assertSupabaseReady() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Check your .env values.");
  }
}

export async function loadDashboardState() {
  return loadAppData();
}

export async function persistDashboardRow(tableKey, row) {
  assertSupabaseReady();

  if (tableKey === "catalogProducts") {
    await upsertCatalogProduct(row);
    return;
  }

  if (tableKey === "mainProducts") {
    await upsertMainProduct(row);
    return;
  }

  if (tableKey === "catalogEvents") {
    const { error } = await supabase.from("event_products").upsert({
      id: row.id,
      event_sku: row.eventSku || "",
      event_code: row.eventCode || "",
      product_name: row.productName || "",
      image: row.productImage || "",
      supply_price: Number(row.supplyPrice || 0),
      sale_price: Number(row.salePrice || 0),
      consumer_price: Number(row.consumerPrice || 0),
      active: row.active !== false,
    });
    if (error) throw new Error(error.message);
    return;
  }

  if (tableKey === "aliasTable") {
    const { error } = await supabase.from("alias_mapping").upsert({
      id: row.id,
      alias_name: row.aliasName || "",
      target_type: row.targetType || "PRODUCT",
      target_sku: row.targetSku || "",
      official_name: row.officialName || "",
      active: row.active !== false,
    });
    if (error) throw new Error(error.message);
    return;
  }

  if (tableKey === "setProducts") {
    const { error } = await supabase.from("set_products").upsert({
      id: row.id,
      set_name: row.setName || "",
      set_code: row.setCode || "",
      products_inside: row.productsInside || "",
    });
    if (error) throw new Error(error.message);
    return;
  }

  if (tableKey === "setComponents") {
    const { error } = await supabase.from("set_components").upsert({
      id: row.id,
      set_code: row.setCode || "",
      product_code: row.productCode || "",
      qty_per_set: Number(row.qtyPerSet || 0),
    });
    if (error) throw new Error(error.message);
    return;
  }

  if (tableKey === "gifts") {
    const { error } = await supabase.from("gifts").upsert({
      id: row.id,
      gift_name: row.giftName || "",
      gift_code: row.giftCode || "",
      stock: Number(row.stock || 0),
    });
    if (error) throw new Error(error.message);
    return;
  }

  throw new Error(`Unsupported table key: ${tableKey}`);
}

export async function deleteDashboardRow(tableKey, id) {
  assertSupabaseReady();

  if (tableKey === "catalogProducts") {
    await deleteCatalogProduct(id);
    return;
  }

  if (tableKey === "mainProducts") {
    await deleteMainProduct(id);
    return;
  }

  const tableNameMap = {
    catalogEvents: "event_products",
    aliasTable: "alias_mapping",
    setProducts: "set_products",
    setComponents: "set_components",
    gifts: "gifts",
  };

  const tableName = tableNameMap[tableKey];
  if (!tableName) {
    throw new Error(`Unsupported delete table key: ${tableKey}`);
  }

  const { error } = await supabase.from(tableName).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function replaceDashboardCatalogFromExcel(file) {
  const inventoryPayload = await importInventoryFromXlsx(file);
  return replaceCatalogData(inventoryPayload);
}

export async function importDashboardStateFromJson(file, normalizeImportedState) {
  const imported = normalizeImportedState(await importJson(file));
  return importFullCatalogAndOrders(imported);
}

export async function resetDashboardState() {
  await resetAllAppData();
  return initialState;
}

export function exportDashboardInventory(state) {
  exportInventoryToXlsx(state);
}

export function exportDashboardJson(state) {
  exportJson(state);
}
