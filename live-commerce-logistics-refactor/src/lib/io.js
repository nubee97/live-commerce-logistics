import * as XLSX from "xlsx";
import { newId } from "../data/store.js";
import {
  generateCatalogProducts,
  generateCatalogEvents,
  buildDefaultAliases,
  uniqueBy,
} from "./catalog.js";

function readSheet(wb, names) {
  for (const name of names) {
    const ws = wb.Sheets[name];
    if (ws) {
      return XLSX.utils.sheet_to_json(ws, { defval: "" });
    }
  }
  return [];
}

function pickValue(row, keys = []) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== "") {
      return row[key];
    }
  }
  return "";
}

function toMoney(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Math.round(value);

  const cleaned = String(value)
    .replace(/[^\d.-]/g, "")
    .trim();

  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function toBool(value, fallback = true) {
  if (value === "" || value === null || value === undefined) return fallback;
  if (typeof value === "boolean") return value;

  const v = String(value).trim().toLowerCase();
  if (["false", "no", "0", "inactive"].includes(v)) return false;
  if (["true", "yes", "1", "active"].includes(v)) return true;
  return fallback;
}

export function exportInventoryToXlsx(
  state,
  filename = "Livecommerce.xlsx"
) {
  const wb = XLSX.utils.book_new();

  const productsSheet = (state.catalogProducts || []).map((r) => ({
    "Brand Code": r.brandCode,
    "Brand Name": r.brandName,
    "Product Code": r.productCode,
    SKU: r.sku,
    "Official Product Name": r.productName,
    "Product Image": r.productImage,
    Advantage: r.advantage,
    Stock: r.stock,
    공급가: r.supplyPrice,
    소비자가: r.consumerPrice,
    최저가: r.lowestPrice,
    라이브판매가: r.livePrice,
    Active: r.active,
  }));

  const eventProductsSheet = (state.catalogEvents || []).map((r) => ({
    eventSKU: r.eventSku,
    eventCode: r.eventCode,
    productName: r.productName,
    image: r.productImage,
    supplyPrice: r.supplyPrice,
    salePrice: r.salePrice,
    consumerPrice: r.consumerPrice,
    active: r.active,
  }));

  const giftsSheet = (state.catalogGifts || state.gifts || []).map((r) => ({
    GiftName: r.giftName,
    GiftCode: r.giftCode,
    Stock: r.stock,
  }));

  const aliasSheet = (state.aliasTable || []).map((r) => ({
    AliasName: r.aliasName,
    TargetType: r.targetType,
    TargetSKU: r.targetSku,
    OfficialName: r.officialName,
    Active: r.active,
  }));

  const brands = (state.brands || []).map((r) => ({
    BrandCode: r.brandCode,
    BrandName: r.brandName,
  }));

  const legacyMain = (state.mainProducts || []).map((r) => ({
    BrandName: r.brandName,
    ProductName: r.productName,
    ProductCode: r.productCode,
    Stock: r.stock,
    SupplyPrice: r.supplyPrice,
    RetailPrice: r.retailPrice,
    LowestPrice: r.lowestPrice,
    OnlinePrice: r.livePrice ?? r.onlinePrice ?? 0,
  }));

  const legacySets = (state.setProducts || []).map((r) => ({
    SetName: r.setName,
    SetCode: r.setCode,
    ProductsInside: r.productsInside || "",
  }));

  const legacyComps = (state.setComponents || []).map((r) => ({
    SetCode: r.setCode,
    ProductCode: r.productCode,
    QtyPerSet: r.qtyPerSet,
  }));

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(productsSheet),
    "Products"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(eventProductsSheet),
    "Event Products"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(giftsSheet),
    "Gifts"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(aliasSheet),
    "Alias Mapping"
  );

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(brands), "Brands");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(legacyMain),
    "MainProducts"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(legacySets),
    "SetProducts"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(legacyComps),
    "SetComponents"
  );

  XLSX.writeFile(wb, filename);
}

export async function importInventoryFromXlsx(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf);

  // 1) Current master workbook format
  const productsSheet = readSheet(wb, ["Products"]).map((r) => ({
    brandCode: String(pickValue(r, ["Brand Code", "BrandCode"]) || "").trim(),
    brandName: String(pickValue(r, ["Brand Name", "BrandName"]) || "").trim(),
    productCode: String(
      pickValue(r, ["Product Code", "ProductCode"]) || ""
    ).trim(),
    sku: String(pickValue(r, ["SKU"]) || "").trim(),
    productName: String(
      pickValue(r, ["Official Product Name", "ProductName"]) || ""
    ).trim(),
    productImage: String(
      pickValue(r, ["Product Image", "ProductImage"]) || ""
    ).trim(),
    advantage: String(pickValue(r, ["Advantage"]) || "").trim(),
    stock: toMoney(pickValue(r, ["Stock"])),
    supplyPrice: toMoney(pickValue(r, ["공급가", "SupplyPrice"])),
    consumerPrice: toMoney(pickValue(r, ["소비자가", "ConsumerPrice"])),
    lowestPrice: toMoney(pickValue(r, ["최저가", "LowestPrice"])),
    livePrice: toMoney(
      pickValue(r, ["라이브판매가", "라이브 판매가", "LivePrice", "OnlinePrice"])
    ),
    active: toBool(pickValue(r, ["Active"]), true),
  }));

  const eventProductsSheet = readSheet(wb, ["Event Products"]).map((r) => ({
    eventSku: String(pickValue(r, ["eventSKU", "EventSKU"]) || "").trim(),
    eventCode: String(pickValue(r, ["eventCode", "EventCode"]) || "").trim(),
    productName: String(
      pickValue(r, ["productName", "ProductName"]) || ""
    ).trim(),
    productImage: String(
      pickValue(r, ["image", "ProductImage"]) || ""
    ).trim(),
    supplyPrice: toMoney(pickValue(r, ["supplyPrice", "SupplyPrice"])),
    salePrice: toMoney(pickValue(r, ["salePrice", "SalePrice"])),
    consumerPrice: toMoney(
      pickValue(r, ["consumerPrice", "ConsumerPrice"])
    ),
    active: toBool(pickValue(r, ["active", "Active"]), true),
  }));

  const aliasMappingSheet = readSheet(wb, ["Alias Mapping", "Aliases"])
    .map((r) => ({
      id: newId(),
      aliasName: String(pickValue(r, ["AliasName"]) || "").trim(),
      targetType: String(pickValue(r, ["TargetType"]) || "PRODUCT").trim(),
      targetSku: String(pickValue(r, ["TargetSKU"]) || "").trim(),
      officialName: String(pickValue(r, ["OfficialName"]) || "").trim(),
      active: toBool(pickValue(r, ["Active"]), true),
    }))
    .filter((r) => r.aliasName && r.targetSku);

  const giftsSheet = readSheet(wb, ["Gifts"])
    .map((r) => ({
      id: `g_${Math.random().toString(16).slice(2)}`,
      giftName: String(pickValue(r, ["GiftName", "giftName"]) || "").trim(),
      giftCode: String(pickValue(r, ["GiftCode", "giftCode"]) || "").trim(),
      stock: toMoney(pickValue(r, ["Stock", "stock"])),
    }))
    .filter((r) => r.giftCode);

  // 2) Older Korean source workbook format
  const koreanProductSheet = readSheet(wb, ["제품", "Products"]).map((r) => ({
    brandName: String(pickValue(r, ["브랜드 BRAND", "Brand Name"]) || "").trim(),
    productImage: String(
      pickValue(r, ["제품 이미지 PRODUCT IMAGE", "Product Image"]) || ""
    ).trim(),
    productName: String(
      pickValue(r, ["제품명 PRODUCT NAME", "Official Product Name", "ProductName"]) || ""
    ).trim(),
    advantage: String(
      pickValue(r, ["특  장  점 Advantage", "Advantage"]) || ""
    ).trim(),
    supplyPrice: toMoney(
      pickValue(r, ["공급가 (vat별도)", "공급가", "SupplyPrice"])
    ),
    consumerPrice: toMoney(
      pickValue(r, ["소비자가", "ConsumerPrice"])
    ),
    lowestPrice: toMoney(
      pickValue(r, ["최저가", "LowestPrice"])
    ),
    livePrice: toMoney(
      pickValue(r, ["라이브 판매가", "라이브판매가", "LivePrice", "OnlinePrice"])
    ),
    stock: toMoney(pickValue(r, ["Stock"])) || 0,
  }));

  const koreanEventSheet = readSheet(wb, ["이벤트", "Event Products"]).map((r) => ({
    eventCode: String(pickValue(r, ["NO", "eventCode", "EventCode"]) || "").trim(),
    productName: String(
      pickValue(r, ["제품명 PRODUCT NAME", "productName", "ProductName"]) || ""
    ).trim(),
    productImage: String(
      pickValue(r, ["제품 이미지 PRODUCT IMAGE", "image", "ProductImage"]) || ""
    ).trim(),
    supplyPrice: toMoney(
      pickValue(r, ["공급가 (vat 별도)", "supplyPrice", "SupplyPrice"])
    ),
    salePrice: toMoney(
      pickValue(r, ["판매가", "salePrice", "SalePrice"])
    ),
    consumerPrice: toMoney(
      pickValue(r, ["소비자가", "consumerPrice", "ConsumerPrice"])
    ),
  }));

  // 3) App-exported / legacy fallback
  const catalogProductsSheet = readSheet(wb, ["CatalogProducts"]).map((r) => ({
    brandCode: String(pickValue(r, ["BrandCode"]) || "").trim(),
    brandName: String(pickValue(r, ["BrandName"]) || "").trim(),
    productCode: String(pickValue(r, ["ProductCode"]) || "").trim(),
    sku: String(pickValue(r, ["SKU"]) || "").trim(),
    productName: String(pickValue(r, ["ProductName"]) || "").trim(),
    productImage: String(pickValue(r, ["ProductImage"]) || "").trim(),
    advantage: String(pickValue(r, ["Advantage"]) || "").trim(),
    stock: toMoney(pickValue(r, ["Stock"])),
    supplyPrice: toMoney(pickValue(r, ["SupplyPrice"])),
    consumerPrice: toMoney(pickValue(r, ["ConsumerPrice"])),
    lowestPrice: toMoney(pickValue(r, ["LowestPrice"])),
    livePrice: toMoney(pickValue(r, ["LivePrice", "OnlinePrice"])),
    active: toBool(pickValue(r, ["Active"]), true),
  }));

  const catalogEventsSheet = readSheet(wb, ["CatalogEvents"]).map((r) => ({
    eventSku: String(pickValue(r, ["EventSKU"]) || "").trim(),
    eventCode: String(pickValue(r, ["EventCode"]) || "").trim(),
    productName: String(pickValue(r, ["ProductName"]) || "").trim(),
    productImage: String(pickValue(r, ["ProductImage"]) || "").trim(),
    supplyPrice: toMoney(pickValue(r, ["SupplyPrice"])),
    salePrice: toMoney(pickValue(r, ["SalePrice"])),
    consumerPrice: toMoney(pickValue(r, ["ConsumerPrice"])),
    active: toBool(pickValue(r, ["Active"]), true),
  }));

  const legacyMain = readSheet(wb, ["MainProducts"]).map((r) => ({
    brandName: String(r.BrandName || "").trim(),
    productName: String(r.ProductName || "").trim(),
    productCode: String(r.ProductCode || "").trim(),
    stock: toMoney(r.Stock),
    supplyPrice: toMoney(r.SupplyPrice),
    consumerPrice: toMoney(r.RetailPrice),
    lowestPrice: toMoney(r.LowestPrice),
    livePrice: toMoney(r.OnlinePrice),
  }));

  let brands = [];
  let catalogProducts = [];
  let catalogEvents = [];
  let aliasTable = [];
  let catalogGifts = giftsSheet;

  // Products priority: current master -> app export -> korean raw -> legacy
  if (productsSheet.length > 0) {
    brands = uniqueBy(
      productsSheet
        .filter((p) => p.brandCode && p.brandName)
        .map((p) => ({
          id: `brand_${p.brandCode}`,
          brandCode: p.brandCode,
          brandName: p.brandName,
        })),
      (b) => b.brandCode
    );

    catalogProducts = productsSheet
      .filter((p) => p.productName)
      .map((p) => ({
        id: newId(),
        brandCode: p.brandCode,
        brandName: p.brandName,
        productCode: p.productCode,
        sku: p.sku || `${p.brandCode}-${p.productCode}`,
        productName: p.productName,
        productImage: p.productImage,
        advantage: p.advantage,
        stock: p.stock,
        supplyPrice: p.supplyPrice,
        consumerPrice: p.consumerPrice,
        lowestPrice: p.lowestPrice,
        livePrice: p.livePrice,
        active: p.active,
      }));
  } else if (catalogProductsSheet.length > 0) {
    const normalized = generateCatalogProducts(catalogProductsSheet);
    brands = normalized.brands;
    catalogProducts = normalized.products.map((p, idx) => ({
      ...p,
      stock: catalogProductsSheet[idx]?.stock ?? p.stock ?? 0,
      supplyPrice: catalogProductsSheet[idx]?.supplyPrice ?? p.supplyPrice ?? 0,
      consumerPrice:
        catalogProductsSheet[idx]?.consumerPrice ?? p.consumerPrice ?? 0,
      lowestPrice: catalogProductsSheet[idx]?.lowestPrice ?? p.lowestPrice ?? 0,
      livePrice: catalogProductsSheet[idx]?.livePrice ?? p.livePrice ?? 0,
      active: catalogProductsSheet[idx]?.active ?? p.active ?? true,
    }));
  } else if (koreanProductSheet.length > 0) {
    const normalized = generateCatalogProducts(koreanProductSheet);
    brands = normalized.brands;
    catalogProducts = normalized.products.map((p, idx) => ({
      ...p,
      stock: koreanProductSheet[idx]?.stock ?? p.stock ?? 0,
      supplyPrice: koreanProductSheet[idx]?.supplyPrice ?? p.supplyPrice ?? 0,
      consumerPrice:
        koreanProductSheet[idx]?.consumerPrice ?? p.consumerPrice ?? 0,
      lowestPrice: koreanProductSheet[idx]?.lowestPrice ?? p.lowestPrice ?? 0,
      livePrice: koreanProductSheet[idx]?.livePrice ?? p.livePrice ?? 0,
    }));
  } else if (legacyMain.length > 0) {
    const normalized = generateCatalogProducts(legacyMain);
    brands = normalized.brands;
    catalogProducts = normalized.products.map((p, idx) => ({
      ...p,
      stock: Number(legacyMain[idx]?.stock || 0),
      supplyPrice: Number(legacyMain[idx]?.supplyPrice || 0),
      consumerPrice: Number(legacyMain[idx]?.consumerPrice || 0),
      lowestPrice: Number(legacyMain[idx]?.lowestPrice || 0),
      livePrice: Number(legacyMain[idx]?.livePrice || 0),
    }));
  }

  // Events priority: current master -> app export -> korean raw
  if (eventProductsSheet.length > 0) {
    catalogEvents = eventProductsSheet
      .filter((e) => e.productName)
      .map((e, idx) => ({
        id: newId(),
        eventSku: e.eventSku || `EVT-${String(idx + 1).padStart(3, "0")}`,
        eventCode: e.eventCode || String(idx + 1).padStart(3, "0"),
        productName: e.productName,
        productImage: e.productImage,
        supplyPrice: e.supplyPrice,
        salePrice: e.salePrice,
        consumerPrice: e.consumerPrice,
        active: e.active,
      }));
  } else if (catalogEventsSheet.length > 0) {
    catalogEvents = generateCatalogEvents(catalogEventsSheet).map((e, idx) => ({
      ...e,
      supplyPrice: catalogEventsSheet[idx]?.supplyPrice ?? e.supplyPrice ?? 0,
      salePrice: catalogEventsSheet[idx]?.salePrice ?? e.salePrice ?? 0,
      consumerPrice:
        catalogEventsSheet[idx]?.consumerPrice ?? e.consumerPrice ?? 0,
      active: catalogEventsSheet[idx]?.active ?? e.active ?? true,
    }));
  } else if (koreanEventSheet.length > 0) {
    catalogEvents = generateCatalogEvents(koreanEventSheet).map((e, idx) => ({
      ...e,
      eventCode: koreanEventSheet[idx]?.eventCode || e.eventCode,
      supplyPrice: koreanEventSheet[idx]?.supplyPrice ?? e.supplyPrice ?? 0,
      salePrice: koreanEventSheet[idx]?.salePrice ?? e.salePrice ?? 0,
      consumerPrice:
        koreanEventSheet[idx]?.consumerPrice ?? e.consumerPrice ?? 0,
    }));
  }

  if (aliasMappingSheet.length > 0) {
    aliasTable = uniqueBy(
      aliasMappingSheet,
      (a) => `${a.aliasName}__${a.targetSku}`
    );
  } else {
    aliasTable = buildDefaultAliases(catalogProducts);
  }

  const mainProducts = catalogProducts.map((p) => ({
    id: p.id,
    brandName: p.brandName,
    productName: p.productName,
    productCode: p.sku,
    stock: p.stock,
    supplyPrice: p.supplyPrice,
    retailPrice: p.consumerPrice,
    lowestPrice: p.lowestPrice,
    onlinePrice: p.livePrice,
    livePrice: p.livePrice,
  }));

  const setProducts = catalogEvents.map((e) => ({
    id: e.id,
    setName: e.productName,
    setCode: e.eventSku,
    productsInside: "",
  }));

  return {
    brands,
    catalogProducts,
    catalogEvents,
    catalogGifts,
    aliasTable,

    // legacy compatibility
    mainProducts,
    setProducts,
    setComponents: [],
    gifts: catalogGifts,
  };
}

export function exportJson(state, filename = "LiveCommerce_Backup.json") {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importJson(file) {
  const text = await file.text();
  return JSON.parse(text);
}