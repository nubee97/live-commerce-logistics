import { initialState, newId } from "../../data/store.js";

export const DASHBOARD_TABS = [
  { key: "mainProducts", label: "Main Products", subtitle: "메인 상품", kind: "product" },
  { key: "catalogProducts", label: "Master Catalog", subtitle: "마스터 카탈로그", kind: "product" },
  { key: "catalogEvents", label: "Event Products", subtitle: "행사 상품", kind: "product" },
  { key: "aliasTable", label: "Aliases", subtitle: "별칭 매핑", kind: "meta" },
  { key: "setProducts", label: "Set Products", subtitle: "세트 상품", kind: "product" },
  { key: "setComponents", label: "Set Components", subtitle: "구성품", kind: "meta" },
  { key: "gifts", label: "Gifts", subtitle: "사은품", kind: "product" },
];

export function normalizeLoadedState(data) {
  const catalogGifts = Array.isArray(data?.catalogGifts)
    ? data.catalogGifts
    : Array.isArray(data?.gifts)
    ? data.gifts
    : [];

  return {
    ...initialState,
    ...data,
    catalogGifts,
    gifts: catalogGifts,
  };
}

export function normalizeImportedState(data) {
  const catalogGifts = Array.isArray(data?.catalogGifts)
    ? data.catalogGifts
    : Array.isArray(data?.gifts)
    ? data.gifts
    : [];

  return {
    ...initialState,
    ...data,
    catalogGifts,
    gifts: catalogGifts,
    orders: Array.isArray(data?.orders) ? data.orders : [],
    orderLines: Array.isArray(data?.orderLines) ? data.orderLines : [],
  };
}

export function withTimestamp(row, patch = {}) {
  return {
    ...row,
    ...patch,
    lastModified: new Date().toISOString(),
  };
}

export function getGiftRows(state) {
  if (Array.isArray(state.catalogGifts) && state.catalogGifts.length) {
    return state.catalogGifts;
  }
  return Array.isArray(state.gifts) ? state.gifts : [];
}

function hashColor(text = "") {
  const palette = [
    ["#eff6ff", "#2563eb"],
    ["#ecfeff", "#0891b2"],
    ["#f0fdf4", "#16a34a"],
    ["#fff7ed", "#ea580c"],
    ["#faf5ff", "#9333ea"],
    ["#fdf2f8", "#db2777"],
  ];

  let hash = 0;
  const source = String(text || "product");
  for (let i = 0; i < source.length; i += 1) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash);
  }

  return palette[Math.abs(hash) % palette.length];
}

export function makePlaceholderImage(label = "Product") {
  const [bg, fg] = hashColor(label);
  const safe = String(label || "Product").slice(0, 20);
  const initials =
    safe
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "P";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <rect width="160" height="160" rx="24" fill="${bg}"/>
      <circle cx="80" cy="66" r="28" fill="${fg}" opacity="0.12"/>
      <text x="80" y="78" text-anchor="middle" font-size="26" font-family="Arial, sans-serif" font-weight="700" fill="${fg}">
        ${initials}
      </text>
      <text x="80" y="118" text-anchor="middle" font-size="13" font-family="Arial, sans-serif" fill="${fg}">
        ${safe.replace(/&/g, "&amp;")}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "-";
}

export function getTableRows(state, giftRows, tableKey) {
  if (tableKey === "gifts") return giftRows;
  return Array.isArray(state[tableKey]) ? state[tableKey] : [];
}

export function getPrimaryText(row, tableKey) {
  if (tableKey === "mainProducts" || tableKey === "catalogProducts" || tableKey === "catalogEvents") {
    return row.productName || "";
  }
  if (tableKey === "aliasTable") return row.aliasName || "";
  if (tableKey === "setProducts") return row.setName || "";
  if (tableKey === "setComponents") return row.productCode || "";
  if (tableKey === "gifts") return row.giftName || "";
  return "";
}

export function getCodeText(row, tableKey) {
  if (tableKey === "mainProducts") return row.productCode || "";
  if (tableKey === "catalogProducts") return row.sku || row.productCode || "";
  if (tableKey === "catalogEvents") return row.eventSku || row.eventCode || "";
  if (tableKey === "aliasTable") return row.targetSku || "";
  if (tableKey === "setProducts") return row.setCode || "";
  if (tableKey === "setComponents") return row.productCode || "";
  if (tableKey === "gifts") return row.giftCode || "";
  return "";
}

export function findLinkedCatalogImage(state, row, tableKey, parseProductsInside) {
  if (tableKey === "catalogProducts") return row.productImage || "";
  if (tableKey === "catalogEvents") return row.productImage || "";

  if (tableKey === "mainProducts") {
    const match = (state.catalogProducts || []).find(
      (item) =>
        (item.productCode && item.productCode === row.productCode) ||
        (item.productName && item.productName === row.productName)
    );
    return match?.productImage || "";
  }

  if (tableKey === "setProducts") {
    const firstItem = parseProductsInside(row.productsInside)?.[0]?.productCode;
    if (!firstItem) return "";
    const match = (state.catalogProducts || []).find(
      (item) => item.productCode === firstItem || item.sku === firstItem
    );
    return match?.productImage || "";
  }

  return "";
}

export function getDisplayImage(state, row, tableKey, giftRows, parseProductsInside) {
  const linked = findLinkedCatalogImage(state, row, tableKey, parseProductsInside);
  if (linked) return linked;
  return makePlaceholderImage(
    getPrimaryText(row, tableKey) || getCodeText(row, tableKey) || "Product"
  );
}

export function createEmptyRow(tableKey) {
  const baseId = newId();

  switch (tableKey) {
    case "mainProducts":
      return { id: baseId, productCode: "", productName: "", supplyPrice: 0, retailPrice: 0, lowestPrice: 0, onlinePrice: 0, stock: 0, productImage: "" };
    case "catalogProducts":
      return { id: baseId, sku: "", brandCode: "", brandName: "", productCode: "", productName: "", productImage: "", advantage: "", supplyPrice: 0, consumerPrice: 0, lowestPrice: 0, livePrice: 0, stock: 0, active: true };
    case "catalogEvents":
      return { id: baseId, eventSku: "", eventCode: "", productName: "", productImage: "", supplyPrice: 0, salePrice: 0, consumerPrice: 0, active: true };
    case "aliasTable":
      return { id: baseId, aliasName: "", targetType: "PRODUCT", targetSku: "", officialName: "", active: true };
    case "setProducts":
      return { id: baseId, setName: "", setCode: "", productsInside: "" };
    case "setComponents":
      return { id: baseId, setCode: "", productCode: "", qtyPerSet: 1 };
    case "gifts":
      return { id: baseId, giftName: "", giftCode: "", stock: 0 };
    default:
      return { id: baseId };
  }
}
