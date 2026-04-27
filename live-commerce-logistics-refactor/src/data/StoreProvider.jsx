import React, { useCallback, useEffect, useMemo, useState } from "react";
import { initialState } from "./store.js";
import { loadAppData } from "../lib/db.js";
import { StoreCtx } from "./store-context.js";

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeOrder(order = {}) {
  return {
    ...order,
    id: order.id || "",
    orderNumber: order.orderNumber || order.order_number || order.id || "",
    createdAt: order.createdAt || order.created_at || "",
    paidAt: order.paidAt || order.paid_at || "",
    sellerSubmittedAt: order.sellerSubmittedAt || order.seller_submitted_at || "",
    shippedAt: order.shippedAt || order.shipped_at || "",
    deliveredAt: order.deliveredAt || order.delivered_at || "",
    excelConfirmedAt: order.excelConfirmedAt || order.excel_confirmed_at || order.excel_confirmed || "",
    deliveryCompletedAt: order.deliveryCompletedAt || order.delivery_completed_at || order.deliveredAt || order.delivered_at || "",
    status: order.status || "DRAFT",
    sellerName: order.sellerName || order.seller_name || order.influencer_name || "",
    customerName: order.customerName || order.customer_name || "",
    recipientName: order.recipientName || order.recipient_name || "",
    phone: order.phone || "",
    country: order.country || "",
    city: order.city || "",
    postalCode: order.postalCode || order.postal_code || "",
    addressMain: order.addressMain || order.address_main || "",
    addressDetail: order.addressDetail || order.address_detail || "",
    address: order.address || "",
    saveAddressBook: typeof order.saveAddressBook === "boolean" ? order.saveAddressBook : !!order.save_address_book,
    deliveryMemo: order.deliveryMemo || order.delivery_memo || "",
    shippingMethod: order.shippingMethod || order.shipping_method || "택배",
    courier: order.courier || "",
    trackingNumber: order.trackingNumber || order.tracking_number || "",
    notes: order.notes || "",
    sellerSubmitted: typeof order.sellerSubmitted === "boolean" ? order.sellerSubmitted : !!order.seller_submitted,
    orderSource: order.orderSource || order.order_source || "",
    lastModified: order.lastModified || order.last_modified || order.updated_at || order.createdAt || order.created_at || "",
    nickname: order.nickname || order.customerName || order.customer_name || "",
  };
}

function normalizeState(data) {
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
    mainProducts: ensureArray(data?.mainProducts),
    setProducts: ensureArray(data?.setProducts),
    setComponents: ensureArray(data?.setComponents),
    orders: ensureArray(data?.orders).map(normalizeOrder),
    orderLines: ensureArray(data?.orderLines),
    brands: ensureArray(data?.brands),
    catalogProducts: ensureArray(data?.catalogProducts),
    catalogEvents: ensureArray(data?.catalogEvents),
    aliasTable: ensureArray(data?.aliasTable),
  };
}

function mutateTable(prev, tableKey, updateRows) {
  const sourceRows = tableKey === "gifts" || tableKey === "catalogGifts"
    ? ensureArray(prev.catalogGifts)
    : ensureArray(prev[tableKey]);

  const nextRows = ensureArray(typeof updateRows === "function" ? updateRows(sourceRows) : updateRows);

  if (tableKey === "gifts" || tableKey === "catalogGifts") {
    return {
      ...prev,
      gifts: nextRows,
      catalogGifts: nextRows,
    };
  }

  return {
    ...prev,
    [tableKey]: nextRows,
  };
}

export function StoreProvider({ children }) {
  const [state, setStateRaw] = useState(initialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");

  const setState = useCallback((next) => {
    if (typeof next === "function") {
      setStateRaw((prev) => normalizeState(next(prev)));
      return;
    }
    setStateRaw(normalizeState(next));
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoadError("");
      const data = await loadAppData();
      setState(data);
      return { ok: true, data };
    } catch (error) {
      const message = error?.message || "Failed to load app data.";
      console.error("Failed to refresh app data:", error);
      setLoadError(message);
      return { ok: false, error: message };
    }
  }, [setState]);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        const data = await loadAppData();
        if (!mounted) return;
        setState(data);
        setLoadError("");
      } catch (error) {
        if (!mounted) return;
        console.error("Failed to load app data:", error);
        setLoadError(error?.message || "Failed to load app data.");
      } finally {
        if (mounted) setIsLoaded(true);
      }
    }

    boot();

    return () => {
      mounted = false;
    };
  }, [setState]);

  const value = useMemo(() => ({
    state,
    setState,
    isLoaded,
    loadError,
    refresh,
    refreshFromDb: refresh,

    updateTable(tableKey, updater) {
      setState((prev) => mutateTable(prev, tableKey, updater));
    },

    updateOne(tableKey, id, patch) {
      setState((prev) =>
        mutateTable(prev, tableKey, (rows) =>
          rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
        )
      );
    },

    addRow(tableKey, row) {
      setState((prev) => mutateTable(prev, tableKey, (rows) => [row, ...rows]));
    },

    deleteRow(tableKey, id) {
      setState((prev) =>
        mutateTable(prev, tableKey, (rows) => rows.filter((row) => row.id !== id))
      );
    },
  }), [isLoaded, loadError, refresh, setState, state]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
