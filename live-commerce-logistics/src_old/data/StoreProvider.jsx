import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initialState } from "./store.js";
import { loadAppData } from "../lib/db.js";

const StoreCtx = createContext(null);

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
    mainProducts: Array.isArray(data?.mainProducts) ? data.mainProducts : [],
    setProducts: Array.isArray(data?.setProducts) ? data.setProducts : [],
    setComponents: Array.isArray(data?.setComponents) ? data.setComponents : [],
    orders: Array.isArray(data?.orders) ? data.orders : [],
    orderLines: Array.isArray(data?.orderLines) ? data.orderLines : [],
    brands: Array.isArray(data?.brands) ? data.brands : [],
    catalogProducts: Array.isArray(data?.catalogProducts) ? data.catalogProducts : [],
    catalogEvents: Array.isArray(data?.catalogEvents) ? data.catalogEvents : [],
    aliasTable: Array.isArray(data?.aliasTable) ? data.aliasTable : [],
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
              ? Array.isArray(prev.catalogGifts)
                ? prev.catalogGifts
                : []
              : Array.isArray(prev[tableKey])
              ? prev[tableKey]
              : [];

          const nextRows =
            typeof updater === "function" ? updater(currentRows) : currentRows;

          if (tableKey === "gifts" || tableKey === "catalogGifts") {
            return {
              ...prev,
              gifts: Array.isArray(nextRows) ? nextRows : [],
              catalogGifts: Array.isArray(nextRows) ? nextRows : [],
            };
          }

          return {
            ...prev,
            [tableKey]: Array.isArray(nextRows) ? nextRows : [],
          };
        });
      },

      updateOne(tableKey, id, patch) {
        setState((prev) => {
          const sourceRows =
            tableKey === "gifts"
              ? Array.isArray(prev.catalogGifts)
                ? prev.catalogGifts
                : []
              : Array.isArray(prev[tableKey])
              ? prev[tableKey]
              : [];

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
              ? Array.isArray(prev.catalogGifts)
                ? prev.catalogGifts
                : []
              : Array.isArray(prev[tableKey])
              ? prev[tableKey]
              : [];

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
              ? Array.isArray(prev.catalogGifts)
                ? prev.catalogGifts
                : []
              : Array.isArray(prev[tableKey])
              ? prev[tableKey]
              : [];

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