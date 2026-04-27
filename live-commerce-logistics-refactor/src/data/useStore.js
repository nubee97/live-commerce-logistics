import { useContext } from "react";
import { StoreCtx } from "./store-context.js";

export function useStore() {
  const value = useContext(StoreCtx);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}
