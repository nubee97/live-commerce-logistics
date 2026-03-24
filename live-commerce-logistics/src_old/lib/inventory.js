export function parseProductsInside(input) {
  if (!input) return [];

  const parts = String(input)
    .split(/[\n;,]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const items = [];

  for (const p of parts) {
    const m = p.match(/^(.+?)(?:\s*[:xX\*]\s*)(\d+)\s*$/);
    if (m) {
      items.push({ productCode: m[1].trim(), qty: Number(m[2]) || 1 });
    } else {
      items.push({ productCode: p.trim(), qty: 1 });
    }
  }

  const merged = new Map();
  for (const it of items) {
    if (!it.productCode) continue;
    merged.set(it.productCode, (merged.get(it.productCode) || 0) + (Number(it.qty) || 1));
  }

  return Array.from(merged.entries()).map(([productCode, qty]) => ({ productCode, qty }));
}

function findMainProduct(state, code) {
  return (
    (state.catalogProducts || []).find(
      (p) => p.sku === code || p.productCode === code
    ) ||
    (state.mainProducts || []).find(
      (p) => p.productCode === code
    )
  );
}

function findSetProduct(state, code) {
  return (
    (state.catalogEvents || []).find(
      (s) => s.eventSku === code || s.eventCode === code
    ) ||
    (state.setProducts || []).find(
      (s) => s.setCode === code
    )
  );
}

function findGift(state, code) {
  return (
    (state.catalogGifts || []).find((g) => g.giftCode === code) ||
    (state.gifts || []).find((g) => g.giftCode === code)
  );
}

export function computeSetStock(state, setCode) {
  const set = (state.setProducts || []).find((s) => s.setCode === setCode);
  if (!set) return 0;

  const items = parseProductsInside(set.productsInside);
  if (items.length === 0) return 0;

  let min = Infinity;

  for (const it of items) {
    const p = findMainProduct(state, it.productCode);
    const stock = Number(p?.stock || 0);
    const need = Number(it.qty || 1);
    const possible = need > 0 ? Math.floor(stock / need) : 0;
    min = Math.min(min, possible);
  }

  return min === Infinity ? 0 : min;
}

// export function computePickList(state, orderId) {
//   const lines = (state.orderLines || []).filter((l) => l.orderId === orderId);
//   const pick = new Map();

//   for (const l of lines) {
//     const qty = Number(l.qty) || 0;
//     if (qty <= 0) continue;

//     const effectiveCode = l.sku || l.itemCode || "";

//     if (l.itemType === "PRODUCT") {
//       if (!effectiveCode) continue;
//       pick.set(effectiveCode, (pick.get(effectiveCode) || 0) + qty);
//     } else if (l.itemType === "SET") {
//       const set = (state.setProducts || []).find(
//         (s) => s.setCode === effectiveCode || s.setCode === l.itemCode
//       );

//       const items = parseProductsInside(set?.productsInside);

//       for (const it of items) {
//         const add = qty * (Number(it.qty) || 1);
//         pick.set(it.productCode, (pick.get(it.productCode) || 0) + add);
//       }
//     }
//   }

//   return Array.from(pick.entries()).map(([productCode, qty]) => {
//     const p = findMainProduct(state, productCode);
//     return {
//       productCode: p?.sku || p?.productCode || productCode,
//       productName: p?.productName || "(Missing product)",
//       brandName: p?.brandName || "",
//       qty,
//       stock: Number(p?.stock ?? 0),
//     };
//   });
// }

export function computePickList(state, orderId) {
  const lines = (state.orderLines || []).filter((l) => l.orderId === orderId);
  const pick = new Map();

  for (const l of lines) {
    const qty = Number(l.qty) || 0;
    if (qty <= 0) continue;

    const effectiveCode = l.sku || l.itemCode || "";

    if (l.itemType === "PRODUCT") {
      if (!effectiveCode) continue;
      pick.set(effectiveCode, (pick.get(effectiveCode) || 0) + qty);
    } else if (l.itemType === "SET") {
      const set = (state.setProducts || []).find(
        (s) => s.setCode === effectiveCode || s.setCode === l.itemCode
      );

      const items = parseProductsInside(set?.productsInside);

      if (items.length > 0) {
        for (const it of items) {
          const add = qty * (Number(it.qty) || 1);
          pick.set(it.productCode, (pick.get(it.productCode) || 0) + add);
        }
      } else {
        // fallback: treat event/set itself as one warehouse item
        if (effectiveCode) {
          pick.set(effectiveCode, (pick.get(effectiveCode) || 0) + qty);
        }
      }
    }
  }

  return Array.from(pick.entries()).map(([productCode, qty]) => {
    const p = findMainProduct(state, productCode);
    const set = findSetProduct(state, productCode);

    return {
      productCode:
        p?.sku || p?.productCode || set?.eventSku || set?.setCode || productCode,
      productName:
        p?.productName || set?.productName || set?.setName || "(Missing product)",
      brandName: p?.brandName || "",
      qty,
      stock: Number(p?.stock ?? 999999), // fallback so events don't fail stock check
    };
  });
}

export function computeGiftList(state, orderId) {
  const lines = (state.orderLines || []).filter(
    (l) => l.orderId === orderId && l.itemType === "GIFT"
  );
  const map = new Map();

  for (const l of lines) {
    const qty = Number(l.qty) || 0;
    if (qty <= 0) continue;
    const code = l.sku || l.itemCode || "";
    if (!code) continue;
    map.set(code, (map.get(code) || 0) + qty);
  }

  return Array.from(map.entries()).map(([giftCode, qty]) => {
    const g = findGift(state, giftCode);
    return {
      giftCode: g?.giftCode || giftCode,
      giftName: g?.giftName || "(Missing gift)",
      qty,
      stock: Number(g?.stock ?? 0),
    };
  });
}

export function canConfirmOrder(state, orderId) {
  const pick = computePickList(state, orderId);
  const gifts = computeGiftList(state, orderId);

  const productOk = pick.every((r) => (Number(r.stock) || 0) >= (Number(r.qty) || 0));
  const giftOk = gifts.every((r) => (Number(r.stock) || 0) >= (Number(r.qty) || 0));

  return { ok: productOk && giftOk, pick, gifts };
}

export function confirmOrder(state, orderId) {
  const { ok, pick, gifts } = canConfirmOrder(state, orderId);
  if (!ok) {
    return {
      next: state,
      error: "Insufficient stock for one or more products/gifts.",
      pick,
      gifts,
    };
  }

  const nextCatalogProducts = (state.catalogProducts || []).map((p) => {
    const row = pick.find(
      (x) => x.productCode === p.sku || x.productCode === p.productCode
    );
    if (!row) return p;
    return { ...p, stock: (Number(p.stock) || 0) - (Number(row.qty) || 0) };
  });

  const nextMain = (state.mainProducts || []).map((p) => {
    const row = pick.find(
      (x) => x.productCode === p.productCode
    );
    if (!row) return p;
    return { ...p, stock: (Number(p.stock) || 0) - (Number(row.qty) || 0) };
  });

  const nextCatalogGifts = (state.catalogGifts || []).map((g) => {
    const row = gifts.find((x) => x.giftCode === g.giftCode);
    if (!row) return g;
    return { ...g, stock: (Number(g.stock) || 0) - (Number(row.qty) || 0) };
  });

  const nextGifts = (state.gifts || []).map((g) => {
    const row = gifts.find((x) => x.giftCode === g.giftCode);
    if (!row) return g;
    return { ...g, stock: (Number(g.stock) || 0) - (Number(row.qty) || 0) };
  });

  const nowIso = new Date().toISOString();

  const nextOrders = (state.orders || []).map((o) =>
    o.id === orderId
      ? { ...o, status: "CONFIRMED", paidAt: o.paidAt || nowIso }
      : o
  );

  return {
    next: {
      ...state,
      catalogProducts: nextCatalogProducts,
      mainProducts: nextMain,
      catalogGifts: nextCatalogGifts,
      gifts: nextGifts,
      orders: nextOrders,
    },
    error: null,
    pick,
    gifts,
  };
}

export function cancelOrder(state, orderId) {
  const order = (state.orders || []).find((o) => o.id === orderId);
  if (!order) return { next: state, error: "Order not found." };
  if (order.status === "SHIPPED") {
    return { next: state, error: "Cannot cancel SHIPPED order." };
  }

  if (order.status === "CONFIRMED" || order.status === "PACKED") {
    const pick = computePickList(state, orderId);
    const gifts = computeGiftList(state, orderId);

    const nextCatalogProducts = (state.catalogProducts || []).map((p) => {
      const row = pick.find(
        (x) => x.productCode === p.sku || x.productCode === p.productCode
      );
      if (!row) return p;
      return { ...p, stock: (Number(p.stock) || 0) + (Number(row.qty) || 0) };
    });

    const nextMain = (state.mainProducts || []).map((p) => {
      const row = pick.find((x) => x.productCode === p.productCode);
      if (!row) return p;
      return { ...p, stock: (Number(p.stock) || 0) + (Number(row.qty) || 0) };
    });

    const nextCatalogGifts = (state.catalogGifts || []).map((g) => {
      const row = gifts.find((x) => x.giftCode === g.giftCode);
      if (!row) return g;
      return { ...g, stock: (Number(g.stock) || 0) + (Number(row.qty) || 0) };
    });

    const nextGifts = (state.gifts || []).map((g) => {
      const row = gifts.find((x) => x.giftCode === g.giftCode);
      if (!row) return g;
      return { ...g, stock: (Number(g.stock) || 0) + (Number(row.qty) || 0) };
    });

    const nextOrders = (state.orders || []).map((o) =>
      o.id === orderId ? { ...o, status: "CANCELLED" } : o
    );

    return {
      next: {
        ...state,
        catalogProducts: nextCatalogProducts,
        mainProducts: nextMain,
        catalogGifts: nextCatalogGifts,
        gifts: nextGifts,
        orders: nextOrders,
      },
      error: null,
    };
  }

  const nextOrders = (state.orders || []).map((o) =>
    o.id === orderId ? { ...o, status: "CANCELLED" } : o
  );

  return { next: { ...state, orders: nextOrders }, error: null };
}

// export function expandOrderForPacking(state, orderId) {
//   const orderLines = (state.orderLines || []).filter((l) => l.orderId === orderId);

//   const pickMap = new Map();
//   const giftMap = new Map();

//   for (const line of orderLines) {
//     const qty = Number(line.qty || 0);
//     if (qty <= 0) continue;

//     const effectiveCode = line.sku || line.itemCode || "";

//     if (line.itemType === "PRODUCT") {
//       const product = findMainProduct(state, effectiveCode);

//       const code = product?.sku || product?.productCode || effectiveCode;
//       const name = product?.productName || line.officialName || line.itemName || "(Missing product)";
//       const prev = pickMap.get(code) || {
//         productCode: code,
//         productName: name,
//         qty: 0,
//       };

//       prev.qty += qty;
//       pickMap.set(code, prev);
//     }

//     if (line.itemType === "SET") {
//       const components = (state.setComponents || []).filter(
//         (c) => c.setCode === effectiveCode || c.setCode === line.itemCode
//       );

//       for (const comp of components) {
//         const product = findMainProduct(state, comp.productCode);

//         const code = product?.sku || product?.productCode || comp.productCode || "";
//         const name = product?.productName || "(Missing product)";
//         const prev = pickMap.get(code) || {
//           productCode: code,
//           productName: name,
//           qty: 0,
//         };

//         prev.qty += qty * Number(comp.qtyPerSet || 0);
//         pickMap.set(code, prev);
//       }
//     }

//     if (line.itemType === "GIFT") {
//       const gift = findGift(state, effectiveCode);
//       const code = gift?.giftCode || effectiveCode;
//       const prev = giftMap.get(code) || {
//         giftCode: code,
//         giftName: gift?.giftName || line.officialName || line.itemName || "(Missing gift)",
//         qty: 0,
//       };
//       prev.qty += qty;
//       giftMap.set(code, prev);
//     }
//   }

//   return {
//     pick: Array.from(pickMap.values()),
//     gifts: Array.from(giftMap.values()),
//   };
// }

export function expandOrderForPacking(state, orderId) {
  const orderLines = (state.orderLines || []).filter((l) => l.orderId === orderId);

  const pickMap = new Map();
  const giftMap = new Map();

  for (const line of orderLines) {
    const qty = Number(line.qty || 0);
    if (qty <= 0) continue;

    const effectiveCode = line.sku || line.itemCode || "";

    if (line.itemType === "PRODUCT") {
      const product = findMainProduct(state, effectiveCode);

      const code = product?.sku || product?.productCode || effectiveCode;
      const name =
        product?.productName ||
        line.officialName ||
        line.itemName ||
        "(Missing product)";

      const prev = pickMap.get(code) || {
        productCode: code,
        productName: name,
        qty: 0,
      };

      prev.qty += qty;
      pickMap.set(code, prev);
    }

    if (line.itemType === "SET") {
      const set = findSetProduct(state, effectiveCode);

      const setFromLegacy = (state.setProducts || []).find(
        (s) => s.setCode === effectiveCode || s.setCode === line.itemCode
      );

      const parsedItems = parseProductsInside(setFromLegacy?.productsInside);

      if (parsedItems.length > 0) {
        for (const comp of parsedItems) {
          const product = findMainProduct(state, comp.productCode);

          const code =
            product?.sku || product?.productCode || comp.productCode || "";
          const name = product?.productName || "(Missing product)";

          const prev = pickMap.get(code) || {
            productCode: code,
            productName: name,
            qty: 0,
          };

          prev.qty += qty * Number(comp.qty || 0);
          pickMap.set(code, prev);
        }
      } else {
        // fallback: event/set itself becomes pick row
        const code = set?.eventSku || set?.setCode || effectiveCode;
        const name =
          set?.productName ||
          set?.setName ||
          line.officialName ||
          line.itemName ||
          "(Missing set)";

        const prev = pickMap.get(code) || {
          productCode: code,
          productName: name,
          qty: 0,
        };

        prev.qty += qty;
        pickMap.set(code, prev);
      }
    }

    if (line.itemType === "GIFT") {
      const gift = findGift(state, effectiveCode);
      const code = gift?.giftCode || effectiveCode;

      const prev = giftMap.get(code) || {
        giftCode: code,
        giftName:
          gift?.giftName ||
          line.officialName ||
          line.itemName ||
          "(Missing gift)",
        qty: 0,
      };

      prev.qty += qty;
      giftMap.set(code, prev);
    }
  }

  return {
    pick: Array.from(pickMap.values()),
    gifts: Array.from(giftMap.values()),
  };
}