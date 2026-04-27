import { initialState, newId } from "../../data/store.js";
import { supabase } from "../supabase.js";

export { initialState, newId, supabase };

export function ensureSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Check your environment variables.");
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

export function safeId(value) {
  return isUuid(value) ? String(value).trim() : newId();
}

export function mapRows(rows, mapper = (x) => x) {
  return Array.isArray(rows) ? rows.map(mapper) : [];
}

export function byCreatedDesc(a, b, key = "createdAt") {
  return String(b?.[key] || "").localeCompare(String(a?.[key] || ""));
}

export function toText(value) {
  return value == null ? "" : String(value);
}

export function toTrimmedText(value) {
  return toText(value).trim();
}

export function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function toBoolActive(value) {
  return value !== false;
}

export function pickLastModified(row) {
  return row?.updated_at || row?.last_modified || row?.modified_at || row?.created_at || "";
}

export function normalizeProductsInside(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";

  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export function uniqueBy(list, keyFn) {
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

export async function deleteAllRows(tableName) {
  ensureSupabase();
  const { error } = await supabase.from(tableName).delete().not("id", "is", null);
  if (error) throw new Error(error.message || `Failed clearing ${tableName}`);
}

export async function ensureBrandExists({ brandCode, brandName }) {
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

export function buildBrandRows(payload) {
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
