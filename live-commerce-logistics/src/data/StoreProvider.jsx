import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initialState } from "./store.js";
import { loadAppData } from "../lib/db.js";

const StoreCtx = createContext(null);

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeOrder(order = {}) {
  return {
    ...order,

    id: order.id || "",

    orderNumber:
      order.orderNumber ||
      order.order_number ||
      order.id ||
      "",

    createdAt:
      order.createdAt ||
      order.created_at ||
      "",

    paidAt:
      order.paidAt ||
      order.paid_at ||
      "",

    sellerSubmittedAt:
      order.sellerSubmittedAt ||
      order.seller_submitted_at ||
      "",

    shippedAt:
      order.shippedAt ||
      order.shipped_at ||
      "",

    deliveredAt:
      order.deliveredAt ||
      order.delivered_at ||
      "",

    excelConfirmedAt:
      order.excelConfirmedAt ||
      order.excel_confirmed_at ||
      order.excel_confirmed ||
      "",

    deliveryCompletedAt:
      order.deliveryCompletedAt ||
      order.delivery_completed_at ||
      order.deliveredAt ||
      order.delivered_at ||
      "",

    status:
      order.status || "DRAFT",

    sellerName:
      order.sellerName ||
      order.seller_name ||
      order.influencer_name ||
      "",

    customerName:
      order.customerName ||
      order.customer_name ||
      "",

    recipientName:
      order.recipientName ||
      order.recipient_name ||
      "",

    phone:
      order.phone || "",

    country:
      order.country || "",

    city:
      order.city || "",

    postalCode:
      order.postalCode ||
      order.postal_code ||
      "",

    addressMain:
      order.addressMain ||
      order.address_main ||
      "",

    addressDetail:
      order.addressDetail ||
      order.address_detail ||
      "",

    address:
      order.address || "",

    saveAddressBook:
      typeof order.saveAddressBook === "boolean"
        ? order.saveAddressBook
        : !!order.save_address_book,

    deliveryMemo:
      order.deliveryMemo ||
      order.delivery_memo ||
      "",

    shippingMethod:
      order.shippingMethod ||
      order.shipping_method ||
      "택배",

    courier:
      order.courier || "",

    trackingNumber:
      order.trackingNumber ||
      order.tracking_number ||
      "",

    notes:
      order.notes || "",

    sellerSubmitted:
      typeof order.sellerSubmitted === "boolean"
        ? order.sellerSubmitted
        : !!order.seller_submitted,

    orderSource:
      order.orderSource ||
      order.order_source ||
      "",

    lastModified:
      order.lastModified ||
      order.last_modified ||
      order.updated_at ||
      order.createdAt ||
      order.created_at ||
      "",

    nickname:
      order.nickname ||
      order.customerName ||
      order.customer_name ||
      "",
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

export function StoreProvider({ children }) {
  const [state, setStateRaw] = useState(initialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");

  function setState(next) {
    if (typeof next === "function") {
      setStateRaw((prev) => normalizeState(next(prev)));
      return;
    }
    setStateRaw(normalizeState(next));
  }

  async function refresh() {
    try {
      setLoadError("");
      const data = await loadAppData();
      setState(data);
      return { ok: true, data };
    } catch (err) {
      const message = err?.message || "Failed to load app data.";
      console.error("Failed to refresh app data:", err);
      setLoadError(message);
      return { ok: false, error: message };
    }
  }

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        const data = await loadAppData();
        if (!mounted) return;
        setState(data);
        setLoadError("");
      } catch (err) {
        if (!mounted) return;
        console.error("Failed to load app data:", err);
        setLoadError(err?.message || "Failed to load app data.");
      } finally {
        if (mounted) setIsLoaded(true);
      }
    }

    boot();

    return () => {
      mounted = false;
    };
  }, []);

  const api = useMemo(() => {
    return {
      state,
      setState,
      isLoaded,
      loadError,
      refresh,

      updateTable(tableKey, updater) {
        setState((prev) => {
          const currentRows =
            tableKey === "gifts"
              ? ensureArray(prev.catalogGifts)
              : ensureArray(prev[tableKey]);

          const nextRows =
            typeof updater === "function" ? updater(currentRows) : currentRows;

          if (tableKey === "gifts" || tableKey === "catalogGifts") {
            return {
              ...prev,
              gifts: ensureArray(nextRows),
              catalogGifts: ensureArray(nextRows),
            };
          }

          return {
            ...prev,
            [tableKey]: ensureArray(nextRows),
          };
        });
      },

      updateOne(tableKey, id, patch) {
        setState((prev) => {
          const sourceRows =
            tableKey === "gifts"
              ? ensureArray(prev.catalogGifts)
              : ensureArray(prev[tableKey]);

          const nextRows = sourceRows.map((r) =>
            r.id === id ? { ...r, ...patch } : r
          );

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
        });
      },

      addRow(tableKey, row) {
        setState((prev) => {
          const sourceRows =
            tableKey === "gifts"
              ? ensureArray(prev.catalogGifts)
              : ensureArray(prev[tableKey]);

          const nextRows = [row, ...sourceRows];

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
        });
      },

      deleteRow(tableKey, id) {
        setState((prev) => {
          const sourceRows =
            tableKey === "gifts"
              ? ensureArray(prev.catalogGifts)
              : ensureArray(prev[tableKey]);

          const nextRows = sourceRows.filter((r) => r.id !== id);

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
        });
      },
    };
  }, [state, isLoaded, loadError]);

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const v = useContext(StoreCtx);
  if (!v) throw new Error("useStore must be used within StoreProvider");
  return v;
}