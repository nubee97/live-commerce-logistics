import { newId } from "../../data/store.js";
import { buildAddressText } from "./orders-form-utils.js";
import { findCatalogProductBySku, findGiftByCode } from "../../lib/catalog.js";

export function buildDraftOrder({ isAdmin, influencerName = "", source = "WEB" }) {
  const id = newId();
  const sellerName = isAdmin ? "" : influencerName || "";

  return {
    id,
    orderNumber: id,
    orderSource: source,
    createdAt: new Date().toISOString(),
    paidAt: "",
    status: "DRAFT",
    sellerName,
    customerName: "",
    recipientName: "",
    phone: "",
    country: "",
    city: "",
    postalCode: "",
    addressMain: "",
    addressDetail: "",
    saveAddressBook: false,
    deliveryMemo: "",
    address: "",
    shippingMethod: "택배",
    courier: "",
    trackingNumber: "",
    shippedAt: "",
    deliveredAt: "",
    notes: "",
    sellerSubmitted: false,
    sellerSubmittedAt: "",
  };
}

export function buildExcelDraftOrder(session) {
  const order = buildDraftOrder({
    isAdmin: false,
    influencerName: session?.influencerName || session?.userId || "",
    source: "EXCEL",
  });

  return {
    ...order,
    sellerName: session?.influencerName || session?.userId || "",
  };
}

export function createImportedOrderLines(rows = [], orderId) {
  return rows.map((row) => ({
    id: newId(),
    orderId,
    itemType: row.itemType || "PRODUCT",
    itemCode: row.itemCode,
    itemName: row.itemName,
    sku: row.itemCode || "",
    officialName: row.itemName || "",
    qty: Number(row.qty || 1),
    salePrice: Number(row.salePrice || 0),
    supplyPrice: Number(row.supplyPrice || 0),
    createdAt: new Date().toISOString(),
  }));
}

export function createEmptyOrderLine(orderId, type = "PRODUCT") {
  return {
    id: newId(),
    orderId,
    itemType: type,
    itemCode: "",
    itemName: "",
    sku: "",
    officialName: "",
    brandCode: "",
    productCode: "",
    matchedAlias: "",
    matchType: "",
    qty: 1,
    supplyPrice: 0,
    salePrice: 0,
    createdAt: new Date().toISOString(),
  };
}

export function mergeOrderWithForm(baseOrder, formState) {
  const merged = { ...baseOrder, ...formState };
  return { ...merged, address: buildAddressText(merged) };
}

export function getFilteredOrders({ orders = [], isAdmin, influencerName = "", search = "", statusFilter = "ALL" }) {
  let nextOrders = [...orders];

  if (!isAdmin) {
    nextOrders = nextOrders.filter((order) => (order.sellerName || "") === influencerName);
  }

  const query = search.trim().toLowerCase();
  if (query) {
    nextOrders = nextOrders.filter((order) => {
      const haystack = [order.customerName, order.sellerName, order.phone, order.id]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return haystack.includes(query);
    });
  }

  if (statusFilter !== "ALL") {
    nextOrders = nextOrders.filter((order) => (order.status || "DRAFT") === statusFilter);
  }

  return nextOrders.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export function getFormCompletion(effectiveOrder, lines = []) {
  if (!effectiveOrder) return 0;

  const checks = [
    !!effectiveOrder.sellerName,
    !!effectiveOrder.customerName,
    !!effectiveOrder.recipientName,
    !!effectiveOrder.phone,
    !!effectiveOrder.shippingMethod,
    !!effectiveOrder.postalCode,
    !!effectiveOrder.addressMain,
    !!effectiveOrder.addressDetail,
    !!effectiveOrder.deliveryMemo,
    lines.length > 0,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function getInvalidLineCount(lines = []) {
  return lines.filter((line) => !(line.sku || line.itemCode) || !(line.officialName || line.itemName) || !(Number(line.qty) > 0)).length;
}

export function buildOrderSummary(lines = [], confirmPreview = { pick: [] }) {
  const totalLines = lines.length;
  const totalQty = lines.reduce((sum, line) => sum + (Number(line.qty) || 0), 0);
  const productLines = lines.filter((line) => line.itemType === "PRODUCT").length;
  const setLines = lines.filter((line) => line.itemType === "SET").length;
  const giftLines = lines.filter((line) => line.itemType === "GIFT").length;
  const warnings = (confirmPreview.pick || []).filter((row) => (Number(row.stock) || 0) < (Number(row.qty) || 0)).length;

  return {
    totalLines,
    totalQty,
    productLines,
    setLines,
    giftLines,
    warnings,
  };
}

export function buildOrderedItemsSummary(lines = []) {
  const map = new Map();

  for (const line of lines) {
    const code = line.sku || line.itemCode || "";
    const key = `${line.itemType}_${code}`;
    const previous = map.get(key) || {
      itemType: line.itemType,
      itemCode: code,
      itemName: line.officialName || line.itemName || "(Unselected item)",
      qty: 0,
    };

    previous.qty += Number(line.qty) || 0;
    map.set(key, previous);
  }

  return Array.from(map.values());
}

export function getMissingFields(effectiveOrder, lines = [], invalidLineCount = 0) {
  if (!effectiveOrder) return [];

  const missing = [];
  if (!effectiveOrder.customerName) missing.push("Customer Name");
  if (!effectiveOrder.recipientName) missing.push("Recipient Name");
  if (!effectiveOrder.phone) missing.push("Phone");
  if (!effectiveOrder.shippingMethod) missing.push("Shipping Method");
  if (!effectiveOrder.addressMain) missing.push("Address");
  if (!effectiveOrder.addressDetail) missing.push("Address Detail");
  if (lines.length === 0) missing.push("Order Items");
  if (invalidLineCount > 0) missing.push("Incomplete Item Lines");
  return missing;
}

export function buildSelectionPatch(state, rowType, code) {
  if (rowType === "PRODUCT") {
    const product = findCatalogProductBySku(state, code) || (state.mainProducts || []).find((item) => item.productCode === code);

    if (!product) {
      return {
        itemCode: code,
        itemName: "",
        sku: code,
        officialName: "",
        brandCode: "",
        productCode: "",
        matchedAlias: "",
        matchType: "MANUAL",
        supplyPrice: 0,
        salePrice: 0,
      };
    }

    return {
      itemCode: product.sku || product.productCode || code,
      itemName: product.productName || "",
      sku: product.sku || product.productCode || code,
      officialName: product.productName || "",
      brandCode: product.brandCode || "",
      productCode: product.productCode || "",
      matchedAlias: "",
      matchType: "EXACT",
      supplyPrice: Number(product.supplyPrice || 0),
      salePrice: Number(product.livePrice || product.onlinePrice || product.consumerPrice || product.retailPrice || 0),
    };
  }

  if (rowType === "SET") {
    const setProduct = (state.setProducts || []).find((item) => item.setCode === code);
    return {
      itemCode: setProduct?.setCode || code,
      itemName: setProduct?.setName || "",
      sku: setProduct?.setCode || code,
      officialName: setProduct?.setName || "",
      brandCode: "",
      productCode: setProduct?.setCode || "",
      matchedAlias: "",
      matchType: "EXACT",
      supplyPrice: 0,
      salePrice: 0,
    };
  }

  const gift = findGiftByCode(state, code) || (state.gifts || []).find((item) => item.giftCode === code);
  return {
    itemCode: gift?.giftCode || code,
    itemName: gift?.giftName || "",
    sku: gift?.giftCode || code,
    officialName: gift?.giftName || "",
    brandCode: "",
    productCode: gift?.giftCode || "",
    matchedAlias: "",
    matchType: "EXACT",
    supplyPrice: 0,
    salePrice: 0,
  };
}

export function getSetComponents(state, code) {
  if (!code) return [];

  const components = (state.setComponents || []).filter((component) => component.setCode === code);
  return components.map((component) => {
    const product =
      (state.catalogProducts || []).find((item) => item.sku === component.productCode || item.productCode === component.productCode) ||
      (state.mainProducts || []).find((item) => item.productCode === component.productCode);

    return {
      name: product?.productName || component.productCode,
      qty: Number(component.qtyPerSet || 1),
    };
  });
}
