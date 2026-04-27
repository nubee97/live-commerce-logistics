// src/data/store.js

export const initialState = {
  mainProducts: [],
  setProducts: [],
  setComponents: [],
  gifts: [],
  orders: [],
  orderLines: [],
  brands: [],
  catalogProducts: [],
  catalogEvents: [],
  catalogGifts: [],
  aliasTable: [],
};

export function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function loadState() {
  return { ...initialState };
}

export function saveState() {
  // Intentionally disabled.
  // All persistent app data must be stored in Supabase, not localStorage.
}

export function resetState() {
  // Intentionally disabled.
  // Resets must be handled through Supabase delete/reset functions in src/lib/db.js.
}