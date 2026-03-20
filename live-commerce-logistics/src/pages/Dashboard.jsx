import React, { useMemo, useRef, useState } from "react";
import { useStore } from "../data/StoreProvider.jsx";
import { newId, initialState } from "../data/store.js";
import EditableTable from "../components/EditableTable.jsx";
import Tabs from "../components/Tabs.jsx";
import PageHeader from "../components/PageHeader.jsx";
import MetricCard from "../components/MetricCard.jsx";
import { computeSetStock, parseProductsInside } from "../lib/inventory.js";
import {
  exportInventoryToXlsx,
  importInventoryFromXlsx,
  exportJson,
  importJson,
} from "../lib/io.js";
import { useNavigate } from "react-router-dom";
import {
  loadAppData,
  replaceCatalogData,
  upsertCatalogProduct,
  deleteCatalogProduct,
  upsertMainProduct,
  deleteMainProduct,
  upsertOrder,
  replaceOrderItems,
} from "../lib/db.js";
import { supabase } from "../lib/supabase.js";

function normalizeLoadedState(data) {
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

function normalizeImportedState(data) {
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

function withTimestamp(row, patch = {}) {
  return {
    ...row,
    ...patch,
    lastModified: new Date().toISOString(),
  };
}

function getGiftRows(state) {
  if (Array.isArray(state.catalogGifts) && state.catalogGifts.length) {
    return state.catalogGifts;
  }
  return Array.isArray(state.gifts) ? state.gifts : [];
}

export default function Dashboard() {
  const { state, setState } = useStore();
  const [active, setActive] = useState("main");
  const [isBusy, setIsBusy] = useState(false);
  const fileRefXlsx = useRef(null);
  const fileRefJson = useRef(null);
  const nav = useNavigate();

  const giftRows = useMemo(() => getGiftRows(state), [state]);

  const tabs = [
    { key: "main", label: "Main Products" },
    { key: "catalog", label: "Master Catalog" },
    { key: "events", label: "Event Products" },
    { key: "aliases", label: "Aliases" },
    { key: "sets", label: "Set Products" },
    { key: "comps", label: "Set Components" },
    { key: "gifts", label: "Gifts" },
  ];

  const orderMetrics = useMemo(() => {
    const orders = state.orders || [];

    return {
      total: orders.length,
      draft: orders.filter((o) => (o.status || "DRAFT") === "DRAFT").length,
      confirmed: orders.filter((o) => (o.status || "") === "CONFIRMED").length,
      packed: orders.filter((o) => (o.status || "") === "PACKED").length,
      shipped: orders.filter((o) => (o.status || "") === "SHIPPED").length,
    };
  }, [state.orders]);

  const lowStockCount = useMemo(() => {
    return (
      state.catalogProducts?.length
        ? state.catalogProducts
        : state.mainProducts || []
    ).filter((p) => Number(p.stock || 0) < 50).length;
  }, [state.catalogProducts, state.mainProducts]);

  const sortedMainProducts = useMemo(() => {
    return [...(state.mainProducts || [])].sort((a, b) =>
      (a.productName || "").localeCompare(b.productName || "", "ko")
    );
  }, [state.mainProducts]);

  const sortedCatalogProducts = useMemo(() => {
    return [...(state.catalogProducts || [])].sort((a, b) =>
      (a.productName || "").localeCompare(b.productName || "", "ko")
    );
  }, [state.catalogProducts]);

  const mainCols = [
    { key: "productName", label: "Product Name", minWidth: 180 },
    { key: "supplyPrice", label: "Supply Price", type: "number" },
    { key: "retailPrice", label: "Consumer Price", type: "number" },
    { key: "lowestPrice", label: "Lowest Price", type: "number" },
    { key: "onlinePrice", label: "Live Sale Price", type: "number" },
    {
      key: "lastModified",
      label: "Last Modified",
      render: (row) =>
        row.lastModified ? new Date(row.lastModified).toLocaleString() : "-",
    },
  ];

  const catalogCols = [
    { key: "sku", label: "SKU" },
    { key: "productName", label: "Official Product Name" },
    { key: "supplyPrice", label: "Supply Price", type: "number" },
    { key: "consumerPrice", label: "Consumer Price", type: "number" },
    { key: "lowestPrice", label: "Lowest Price", type: "number" },
    { key: "livePrice", label: "Live Sale Price", type: "number" },
    {
      key: "lastModified",
      label: "Last Modified",
      render: (row) =>
        row.lastModified ? new Date(row.lastModified).toLocaleString() : "-",
    },
  ];

  const eventCols = [
    { key: "eventCode", label: "Event Code" },
    { key: "eventSku", label: "Event SKU" },
    { key: "productName", label: "Event Product Name" },
    { key: "supplyPrice", label: "공급가", type: "number" },
    { key: "salePrice", label: "판매가", type: "number" },
    { key: "consumerPrice", label: "소비자가", type: "number" },
    {
      key: "lastModified",
      label: "Last Modified",
      render: (row) =>
        row.lastModified ? new Date(row.lastModified).toLocaleString() : "-",
    },
  ];

  const aliasCols = [
    { key: "aliasName", label: "Seller Alias Name" },
    { key: "targetType", label: "Target Type" },
    { key: "targetSku", label: "Target SKU" },
    { key: "officialName", label: "Official Product Name" },
    {
      key: "active",
      label: "Active",
      render: (row) => <span>{row.active ? "Yes" : "No"}</span>,
    },
    {
      key: "lastModified",
      label: "Last Modified",
      render: (row) =>
        row.lastModified ? new Date(row.lastModified).toLocaleString() : "-",
    },
  ];

  const setCols = [
    { key: "setName", label: "Set Product Name" },
    { key: "setCode", label: "Set Code" },
    {
      key: "productsInside",
      label: "SetProducts",
      placeholder: "CODE:1;CODE:2",
    },
    {
      key: "namesInside",
      label: "Names inside set",
      render: (row) => {
        const items = parseProductsInside(row.productsInside);
        if (items.length === 0) return "-";

        return items.map((it) => `${it.productCode} x${it.qty}`).join(", ");
      },
    },
    {
      key: "stockComputed",
      label: "Stock",
      render: (row) => computeSetStock(state, row.setCode),
    },
    {
      key: "lastModified",
      label: "Last Modified",
      render: (row) =>
        row.lastModified ? new Date(row.lastModified).toLocaleString() : "-",
    },
  ];

  const compCols = [
    { key: "setCode", label: "Set Code" },
    { key: "productCode", label: "Product Code / SKU" },
    { key: "qtyPerSet", label: "Qty per Set", type: "number" },
    {
      key: "lastModified",
      label: "Last Modified",
      render: (row) =>
        row.lastModified ? new Date(row.lastModified).toLocaleString() : "-",
    },
  ];

  const giftCols = [
    { key: "giftName", label: "Gift Name" },
    { key: "stock", label: "Stock", type: "number" },
    { key: "giftCode", label: "Gift Code" },
    {
      key: "lastModified",
      label: "Last Modified",
      render: (row) =>
        row.lastModified ? new Date(row.lastModified).toLocaleString() : "-",
    },
  ];

  function requireSupabase() {
    if (!supabase) {
      throw new Error("Supabase is not configured. Check your .env values.");
    }
  }

  function setTableRows(tableKey, nextRows) {
    setState((prev) => {
      if (tableKey === "gifts") {
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
  }

  function updateRowLocal(tableKey, rowId, patch) {
    setState((prev) => {
      const sourceRows =
        tableKey === "gifts" ? getGiftRows(prev) : prev[tableKey] || [];

      const nextRows = sourceRows.map((row) =>
        row.id === rowId ? withTimestamp(row, patch) : row
      );

      if (tableKey === "gifts") {
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
  }

  function prependRowLocal(tableKey, row) {
    setState((prev) => {
      const sourceRows =
        tableKey === "gifts" ? getGiftRows(prev) : prev[tableKey] || [];
      const nextRows = [row, ...sourceRows];

      if (tableKey === "gifts") {
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
  }

  function deleteRowLocal(tableKey, rowId) {
    setState((prev) => {
      const sourceRows =
        tableKey === "gifts" ? getGiftRows(prev) : prev[tableKey] || [];
      const nextRows = sourceRows.filter((row) => row.id !== rowId);

      if (tableKey === "gifts") {
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
  }

  async function refreshFromDb() {
    const fresh = await loadAppData();
    setState(normalizeLoadedState(fresh));
  }

  async function persistRow(tableKey, row) {
    requireSupabase();

    if (tableKey === "catalogProducts") {
      await upsertCatalogProduct(row);
      return;
    }

    if (tableKey === "mainProducts") {
      await upsertMainProduct(row);
      return;
    }

    if (tableKey === "catalogEvents") {
      const { error } = await supabase.from("event_products").upsert({
        id: row.id,
        event_sku: row.eventSku || "",
        event_code: row.eventCode || "",
        product_name: row.productName || "",
        image: row.productImage || "",
        supply_price: Number(row.supplyPrice || 0),
        sale_price: Number(row.salePrice || 0),
        consumer_price: Number(row.consumerPrice || 0),
        active: row.active !== false,
      });
      if (error) throw new Error(error.message);
      return;
    }

    if (tableKey === "aliasTable") {
      const { error } = await supabase.from("alias_mapping").upsert({
        id: row.id,
        alias_name: row.aliasName || "",
        target_type: row.targetType || "PRODUCT",
        target_sku: row.targetSku || "",
        official_name: row.officialName || "",
        active: row.active !== false,
      });
      if (error) throw new Error(error.message);
      return;
    }

    if (tableKey === "setProducts") {
      const { error } = await supabase.from("set_products").upsert({
        id: row.id,
        set_name: row.setName || "",
        set_code: row.setCode || "",
        products_inside: row.productsInside || "",
      });
      if (error) throw new Error(error.message);
      return;
    }

    if (tableKey === "setComponents") {
      const { error } = await supabase.from("set_components").upsert({
        id: row.id,
        set_code: row.setCode || "",
        product_code: row.productCode || "",
        qty_per_set: Number(row.qtyPerSet || 0),
      });
      if (error) throw new Error(error.message);
      return;
    }

    if (tableKey === "gifts") {
      const { error } = await supabase.from("gifts").upsert({
        id: row.id,
        gift_name: row.giftName || "",
        gift_code: row.giftCode || "",
        stock: Number(row.stock || 0),
      });
      if (error) throw new Error(error.message);
      return;
    }

    throw new Error(`Unsupported table key: ${tableKey}`);
  }

  async function deleteRowFromDb(tableKey, id) {
    requireSupabase();

    if (tableKey === "catalogProducts") {
      await deleteCatalogProduct(id);
      return;
    }

    if (tableKey === "mainProducts") {
      await deleteMainProduct(id);
      return;
    }

    const tableNameMap = {
      catalogEvents: "event_products",
      aliasTable: "alias_mapping",
      setProducts: "set_products",
      setComponents: "set_components",
      gifts: "gifts",
    };

    const tableName = tableNameMap[tableKey];
    if (!tableName) {
      throw new Error(`Unsupported delete table key: ${tableKey}`);
    }

    const { error } = await supabase.from(tableName).delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async function handleAdd(tableKey, row) {
    const nextRow = withTimestamp(row);
    prependRowLocal(tableKey, nextRow);

    try {
      await persistRow(tableKey, nextRow);
    } catch (error) {
      alert(error?.message || "Add failed.");
      await refreshFromDb();
    }
  }

  async function handleUpdate(tableKey, id, patch) {
    const currentRows = tableKey === "gifts" ? giftRows : state[tableKey] || [];
    const currentRow = currentRows.find((row) => row.id === id);
    if (!currentRow) return;

    const nextRow = withTimestamp(currentRow, patch);
    updateRowLocal(tableKey, id, patch);

    try {
      await persistRow(tableKey, nextRow);
    } catch (error) {
      alert(error?.message || "Update failed.");
      await refreshFromDb();
    }
  }

  async function handleDelete(tableKey, id) {
    deleteRowLocal(tableKey, id);

    try {
      await deleteRowFromDb(tableKey, id);
    } catch (error) {
      alert(error?.message || "Delete failed.");
      await refreshFromDb();
    }
  }

  async function clearOrdersOnly() {
    requireSupabase();

    const itemsRes = await supabase
      .from("order_items")
      .delete()
      .not("id", "is", null);
    if (itemsRes.error) throw new Error(itemsRes.error.message);

    const ordersRes = await supabase.from("orders").delete().not("id", "is", null);
    if (ordersRes.error) throw new Error(ordersRes.error.message);
  }

  async function clearAllSupabaseData() {
    requireSupabase();

    const deleteTargets = [
      "order_items",
      "orders",
      "products",
      "event_products",
      "gifts",
      "alias_mapping",
      "main_products",
      "set_components",
      "set_products",
      "brands",
    ];

    for (const table of deleteTargets) {
      const { error } = await supabase.from(table).delete().not("id", "is", null);
      if (error) throw new Error(error.message || `Failed clearing ${table}`);
    }
  }

  async function importFullJsonToSupabase(imported) {
    const normalized = normalizeImportedState(imported);

    await replaceCatalogData(normalized);

    if (normalized.orders.length || normalized.orderLines.length) {
      await clearOrdersOnly();

      for (const order of normalized.orders) {
        await upsertOrder(order);
        const items = normalized.orderLines.filter((line) => line.orderId === order.id);
        await replaceOrderItems(order.id, items);
      }
    }

    await refreshFromDb();
  }

  return (
    <div className="dashboardPage">
      <PageHeader
        title="Dashboard"
        subtitle="Manage inventory, catalog, events, aliases and logistics."
        actions={
          <>
            <button className="btn" onClick={() => nav("/order-list")} disabled={isBusy}>
              Order List
            </button>

            <button
              className="btn"
              onClick={() => exportInventoryToXlsx(state)}
              disabled={isBusy}
            >
              Export Excel
            </button>

            <button
              className="btn"
              onClick={() => fileRefXlsx.current?.click()}
              disabled={isBusy}
            >
              Import Excel
            </button>

            <button
              className="btn"
              onClick={() => exportJson(state)}
              disabled={isBusy}
            >
              Export JSON
            </button>

            <button
              className="btn"
              onClick={() => fileRefJson.current?.click()}
              disabled={isBusy}
            >
              Import JSON
            </button>

            <button
              className="btn danger"
              disabled={isBusy}
              onClick={async () => {
                if (!window.confirm("Reset ALL data in Supabase?")) return;

                try {
                  setIsBusy(true);
                  await clearAllSupabaseData();
                  setState(normalizeLoadedState(initialState));
                } catch (error) {
                  alert(error?.message || "Reset failed.");
                  await refreshFromDb();
                } finally {
                  setIsBusy(false);
                }
              }}
            >
              {isBusy ? "Working..." : "Reset"}
            </button>
          </>
        }
      />

      <div className="metricsGrid">
        <MetricCard label="Total Orders" value={orderMetrics.total} />
        <MetricCard label="Draft Orders" value={orderMetrics.draft} />
        <MetricCard label="Confirmed" value={orderMetrics.confirmed} />
        <MetricCard label="Packed" value={orderMetrics.packed} />
        <MetricCard label="Shipped" value={orderMetrics.shipped} />
        <MetricCard label="Low Stock" value={lowStockCount} />
      </div>

      <Tabs tabs={tabs} active={active} onChange={setActive} />

      {active === "main" && (
        <EditableTable
          rows={sortedMainProducts}
          columns={mainCols}
          addLabel="Add Main Product"
          onAdd={() =>
            handleAdd("mainProducts", {
              id: newId(),
              brandName: "",
              productName: "",
              productCode: "",
              stock: 0,
              supplyPrice: 0,
              retailPrice: 0,
              lowestPrice: 0,
              onlinePrice: 0,
            })
          }
          onUpdate={(id, patch) => handleUpdate("mainProducts", id, patch)}
          onDelete={(id) => handleDelete("mainProducts", id)}
        />
      )}

      {active === "catalog" && (
        <EditableTable
          rows={sortedCatalogProducts}
          columns={catalogCols}
          addLabel="Add Catalog Product"
          onAdd={() =>
            handleAdd("catalogProducts", {
              id: newId(),
              brandCode: "",
              brandName: "",
              productCode: "",
              sku: "",
              productName: "",
              productImage: "",
              advantage: "",
              supplyPrice: 0,
              consumerPrice: 0,
              lowestPrice: 0,
              livePrice: 0,
              stock: 0,
              active: true,
            })
          }
          onUpdate={(id, patch) => handleUpdate("catalogProducts", id, patch)}
          onDelete={(id) => handleDelete("catalogProducts", id)}
        />
      )}

      {active === "events" && (
        <EditableTable
          rows={state.catalogEvents || []}
          columns={eventCols}
          addLabel="Add Event Product"
          onAdd={() =>
            handleAdd("catalogEvents", {
              id: newId(),
              eventCode: "",
              eventSku: "",
              productName: "",
              productImage: "",
              supplyPrice: 0,
              salePrice: 0,
              consumerPrice: 0,
              active: true,
            })
          }
          onUpdate={(id, patch) => handleUpdate("catalogEvents", id, patch)}
          onDelete={(id) => handleDelete("catalogEvents", id)}
        />
      )}

      {active === "aliases" && (
        <EditableTable
          rows={state.aliasTable || []}
          columns={aliasCols}
          addLabel="Add Alias"
          onAdd={() =>
            handleAdd("aliasTable", {
              id: newId(),
              aliasName: "",
              targetType: "PRODUCT",
              targetSku: "",
              officialName: "",
              active: true,
            })
          }
          onUpdate={(id, patch) => handleUpdate("aliasTable", id, patch)}
          onDelete={(id) => handleDelete("aliasTable", id)}
        />
      )}

      {active === "sets" && (
        <EditableTable
          rows={state.setProducts || []}
          columns={setCols}
          addLabel="Add Set Product"
          onAdd={() =>
            handleAdd("setProducts", {
              id: newId(),
              setName: "",
              setCode: "",
              productsInside: "",
            })
          }
          onUpdate={(id, patch) => handleUpdate("setProducts", id, patch)}
          onDelete={(id) => handleDelete("setProducts", id)}
        />
      )}

      {active === "comps" && (
        <EditableTable
          rows={state.setComponents || []}
          columns={compCols}
          addLabel="Add Set Component"
          onAdd={() =>
            handleAdd("setComponents", {
              id: newId(),
              setCode: "",
              productCode: "",
              qtyPerSet: 1,
            })
          }
          onUpdate={(id, patch) => handleUpdate("setComponents", id, patch)}
          onDelete={(id) => handleDelete("setComponents", id)}
        />
      )}

      {active === "gifts" && (
        <EditableTable
          rows={giftRows}
          columns={giftCols}
          addLabel="Add Gift"
          onAdd={() =>
            handleAdd("gifts", {
              id: newId(),
              giftName: "",
              giftCode: "",
              stock: 0,
            })
          }
          onUpdate={(id, patch) => handleUpdate("gifts", id, patch)}
          onDelete={(id) => handleDelete("gifts", id)}
        />
      )}

      <input
        ref={fileRefXlsx}
        type="file"
        accept=".xlsx"
        style={{ display: "none" }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;

          try {
            setIsBusy(true);
            const inventoryPayload = await importInventoryFromXlsx(f);
            const fresh = await replaceCatalogData(inventoryPayload);
            setState(normalizeLoadedState(fresh));
          } catch (error) {
            alert(error?.message || "Excel import failed.");
            await refreshFromDb();
          } finally {
            setIsBusy(false);
            e.target.value = "";
          }
        }}
      />

      <input
        ref={fileRefJson}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;

          try {
            setIsBusy(true);
            const imported = await importJson(f);
            await importFullJsonToSupabase(imported);
          } catch (error) {
            alert(error?.message || "JSON import failed.");
            await refreshFromDb();
          } finally {
            setIsBusy(false);
            e.target.value = "";
          }
        }}
      />
    </div>
  );
}