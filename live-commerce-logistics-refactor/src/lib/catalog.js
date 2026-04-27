import { newId } from "../data/store.js";

function pad3(n) {
  return String(n).padStart(3, "0");
}

export function buildSku(brandCode, productCode) {
  return `${brandCode}-${productCode}`;
}

export function buildEventSku(eventCode) {
  return `EVT-${pad3(eventCode)}`;
}

export function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function uniqueBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    map.set(keyFn(item), item);
  }
  return Array.from(map.values());
}

export function generateBrandMap(productRows) {
  const seen = new Map();

  for (const row of productRows) {
    const brandName = String(row.brandName || "").trim();
    const incomingBrandCode = String(row.brandCode || "").trim();

    if (!brandName) continue;

    if (!seen.has(brandName)) {
      seen.set(brandName, incomingBrandCode || "");
    }
  }

  let autoIndex = 1;

  return Array.from(seen.entries()).map(([brandName, maybeCode]) => {
    let brandCode = maybeCode;

    if (!brandCode) {
      const existingCodes = Array.from(seen.values()).filter(Boolean);

      while (existingCodes.includes(pad3(autoIndex))) {
        autoIndex++;
      }

      brandCode = pad3(autoIndex++);
    }

    return {
      id: newId(),
      brandCode,
      brandName,
    };
  });
}

export function generateCatalogProducts(productRows) {
  const brands = generateBrandMap(productRows);
  const brandCodeMap = new Map(brands.map((b) => [b.brandName, b.brandCode]));
  const perBrandCounters = {};
  const products = [];

  for (const row of productRows) {
    const brandName = String(row.brandName || "").trim();
    const productName = String(row.productName || "").trim();

    if (!brandName || !productName) continue;

    const resolvedBrandCode =
      String(row.brandCode || "").trim() || brandCodeMap.get(brandName) || "";

    if (!resolvedBrandCode) continue;

    let resolvedProductCode = String(row.productCode || "").trim();

    if (!resolvedProductCode) {
      if (!perBrandCounters[resolvedBrandCode]) {
        perBrandCounters[resolvedBrandCode] = 1;
      }
      resolvedProductCode = pad3(perBrandCounters[resolvedBrandCode]++);
    }

    const resolvedSku =
      String(row.sku || "").trim() ||
      buildSku(resolvedBrandCode, resolvedProductCode);

    products.push({
      id: newId(),
      sku: resolvedSku,
      brandCode: resolvedBrandCode,
      brandName,
      productCode: resolvedProductCode,
      productName,
      productImage: row.productImage || "",
      advantage: row.advantage || "",
      supplyPrice: parseFloat(row.supplyPrice) || 0,
      consumerPrice: parseFloat(row.consumerPrice) || 0,
      lowestPrice: parseFloat(row.lowestPrice) || 0,
      livePrice: parseFloat(row.livePrice) || 0,
      stock: parseFloat(row.stock) || 0,
      active: row.active === false ? false : true,
    });
  }

  return {
    brands,
    products: uniqueBy(products, (p) => p.sku),
  };
}

export function generateCatalogEvents(eventRows) {
  const events = [];

  for (let i = 0; i < eventRows.length; i += 1) {
    const row = eventRows[i];
    const productName = String(row.productName || "").trim();
    if (!productName) continue;

    const resolvedEventCode =
      String(row.eventCode || "").trim() || pad3(i + 1);

    const resolvedEventSku =
      String(row.eventSku || "").trim() || buildEventSku(resolvedEventCode);

    events.push({
      id: newId(),
      eventSku: resolvedEventSku,
      eventCode: resolvedEventCode,
      productName,
      productImage: row.productImage || "",
      supplyPrice: parseFloat(row.supplyPrice) || 0,
      salePrice: parseFloat(row.salePrice) || 0,
      consumerPrice: parseFloat(row.consumerPrice) || 0,
      active: row.active === false ? false : true,
    });
  }

  return uniqueBy(events, (e) => e.eventSku);
}

export function buildDefaultAliases(catalogProducts) {
  const aliases = [];

  for (const p of catalogProducts) {
    const official = String(p.productName || "").trim();
    if (!official) continue;

    aliases.push({
      id: newId(),
      aliasName: official,
      targetType: "PRODUCT",
      targetSku: p.sku,
      officialName: p.productName,
      active: true,
    });

    const brandShort = String(p.brandName || "")
      .replace(/black n gold/i, "BNG")
      .replace(/\s+/g, " ")
      .trim();

    if (brandShort) {
      aliases.push({
        id: newId(),
        aliasName: `${brandShort} ${official}`,
        targetType: "PRODUCT",
        targetSku: p.sku,
        officialName: p.productName,
        active: true,
      });
    }
  }

  return uniqueBy(
    aliases.filter((a) => a.aliasName.trim()),
    (a) => `${normalizeText(a.aliasName)}__${a.targetSku}`
  );
}

export function searchCatalogOptions(state, query = "") {
  const q = normalizeText(query);

  const aliasMap = new Map();

  (state.aliasTable || []).forEach((a) => {
    if (!a.active) return;

    if (!aliasMap.has(a.targetSku)) {
      aliasMap.set(a.targetSku, []);
    }

    aliasMap.get(a.targetSku).push(normalizeText(a.aliasName));
  });

  const productRows = (state.catalogProducts || []).map((p) => ({
    type: "PRODUCT",
    value: p.sku,
    label: `${p.productName} (${p.sku})`,
    sku: p.sku,
    officialName: p.productName,
    brandCode: p.brandCode,
    productCode: p.productCode,
    brandName: p.brandName,
    stock: parseFloat(p.stock) || 0,
  }));

  const eventRows = (state.catalogEvents || []).map((e) => ({
    type: "SET",
    value: e.eventSku,
    label: `${e.productName} (${e.eventSku})`,
    sku: e.eventSku,
    officialName: e.productName,
    brandCode: "",
    productCode: e.eventCode,
    brandName: "EVENT",
    stock: 0,
  }));

  const giftRows = (state.catalogGifts || state.gifts || []).map((g) => ({
    type: "GIFT",
    value: g.giftCode,
    label: `${g.giftName} (${g.giftCode})`,
    sku: g.giftCode,
    officialName: g.giftName,
    brandCode: "",
    productCode: g.giftCode,
    brandName: "GIFT",
    stock: parseFloat(g.stock) || 0,
  }));

  const all = [...productRows, ...eventRows, ...giftRows].sort((a, b) =>
    (a.sku || "").localeCompare(b.sku || "", undefined, { numeric: true })
  );

  if (!q) return all;

  return all.filter((row) => {
    const baseHay = normalizeText(
      `${row.officialName} ${row.brandName} ${row.sku} ${row.brandCode} ${row.productCode}`
    );

    const aliasHit = (aliasMap.get(row.sku) || []).some((a) => a.includes(q));

    return baseHay.includes(q) || aliasHit;
  });
}

export function findCatalogProductBySku(state, sku) {
  return (state.catalogProducts || []).find((p) => p.sku === sku);
}

export function findCatalogEventBySku(state, sku) {
  return (state.catalogEvents || []).find((p) => p.eventSku === sku);
}

export function findGiftByCode(state, code) {
  return (state.catalogGifts || state.gifts || []).find(
    (g) => g.giftCode === code
  );
}