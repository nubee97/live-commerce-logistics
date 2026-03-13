import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initialState } from "./store.js";
import { loadAppData } from "../lib/db.js";

const StoreCtx = createContext(null);


export function StoreProvider({ children }) {
  const [state, setState] = useState(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        const data = await loadAppData();
        if (mounted) setState(data);
      } catch (err) {
        console.error("Failed to load app data:", err);
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
      updateTable(tableKey, updater) {
        setState((prev) => ({ ...prev, [tableKey]: updater(prev[tableKey]) }));
      },
      updateOne(tableKey, id, patch) {
        setState((prev) => ({
          ...prev,
          [tableKey]: prev[tableKey].map((r) =>
            r.id === id ? { ...r, ...patch } : r
          ),
        }));
      },
      addRow(tableKey, row) {
        setState((prev) => ({ ...prev, [tableKey]: [row, ...(prev[tableKey] || [])] }));
      },
      deleteRow(tableKey, id) {
        setState((prev) => ({
          ...prev,
          [tableKey]: (prev[tableKey] || []).filter((r) => r.id !== id),
        }));
      },
    };
  }, [state, isLoaded]);

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const v = useContext(StoreCtx);
  if (!v) throw new Error("useStore must be used within StoreProvider");
  return v;
}