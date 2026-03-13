// const KEY = "lcl_tables_v2";

// export const initialState = {
//   // current / legacy tables
//   mainProducts: [],
//   setProducts: [],
//   setComponents: [],
//   gifts: [],
//   orders: [],
//   orderLines: [],

//   // new normalized master catalog
//   brands: [],
//   catalogProducts: [],
//   catalogEvents: [],
//   catalogGifts: [],
//   aliasTable: [],
// };

// export function newId() {
//   if (typeof crypto !== "undefined" && crypto.randomUUID) {
//     return crypto.randomUUID();
//   }
//   return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
// }

// export function loadState() {
//   try {
//     const raw = localStorage.getItem(KEY);
//     if (!raw) return initialState;
//     const parsed = JSON.parse(raw);
//     return { ...initialState, ...parsed };
//   } catch {
//     return initialState;
//   }
// }

// export function saveState(state) {
//   localStorage.setItem(KEY, JSON.stringify(state));
// }

// export function resetState() {
//   localStorage.removeItem(KEY);
// }

const KEY = "lcl_tables_v2";

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
  return initialState;
}

export function saveState() {}

export function resetState() {
  localStorage.removeItem(KEY);
}