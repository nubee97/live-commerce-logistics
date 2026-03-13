import React, { useMemo, useRef, useState } from "react";
import { useStore } from "../data/StoreProvider.jsx";
import { newId, resetState, initialState } from "../data/store.js";
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
import { loadAppData, replaceCatalogData } from "../lib/db.js";
import {
  // loadAppData,
  upsertCatalogProduct,
  deleteCatalogProduct,
  upsertMainProduct,
  deleteMainProduct,
} from "../lib/db.js";

export default function Dashboard() {
  const { state, setState, addRow, updateOne, deleteRow } = useStore();
  const [active, setActive] = useState("main");
  const fileRefXlsx = useRef(null);
  const fileRefJson = useRef(null);
  const nav = useNavigate();

  const tabs = [
    { key: "main", label: "Main Products" },
    { key: "catalog", label: "Master Catalog" },
    { key: "events", label: "Event Products" },
    { key: "aliases", label: "Aliases" },
    { key: "sets", label: "Set Products" },
    { key: "comps", label: "Set Components" },
    { key: "gifts", label: "Gifts" },
  ];

  const computedSets = useMemo(() => {
    return (state.setProducts || []).map((s) => ({
      ...s,
      computedStock: computeSetStock(state, s.setCode),
    }));
  }, [state]);

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
    return (state.catalogProducts?.length ? state.catalogProducts : state.mainProducts || []).filter(
      (p) => Number(p.stock || 0) < 50
    ).length;
  }, [state.catalogProducts, state.mainProducts]);


const mainCols = [
  // { key: "brandName", label: "Brand Name", minWidth: 90, wrap: true, compact: true },
  { key: "productName", label: "Product Name", minWidth: 180, wrap: true, compact: true },
  // { key: "productCode", label: "Product Code", minWidth: 110, compact: true },
  // { key: "stock", label: "Stock", type: "number", minWidth: 80, align: "right", compact: true },
  { key: "supplyPrice", label: "Supply Price", type: "number", minWidth: 110, align: "right", compact: true },
  { key: "retailPrice", label: "Consumer Price", type: "number", minWidth: 120, align: "right", compact: true },
  { key: "lowestPrice", label: "Lowest Price", type: "number", minWidth: 110, align: "right", compact: true },
  { key: "onlinePrice", label: "Live Sale Price", type: "number", minWidth: 80, align: "right", compact: true },
];

const catalogCols = [
  // { key: "brandCode", label: "Brand Code", minWidth: 90, compact: true },
  // { key: "brandName", label: "Brand Name", minWidth: 120, wrap: true, compact: true },
  // { key: "productCode", label: "Product Code", minWidth: 100, compact: true },
  { key: "sku", label: "SKU", minWidth: 100, compact: true },
  { key: "productName", label: "Official Product Name", minWidth: 220, wrap: true, compact: true },
  // { key: "stock", label: "Stock", type: "number", minWidth: 80, align: "right", compact: true },
  { key: "supplyPrice", label: "Supply Price", type: "number", minWidth: 110, align: "right", compact: true },
  { key: "consumerPrice", label: "Consumer Price", type: "number", minWidth: 110, align: "right", compact: true },
  { key: "lowestPrice", label: "Lowest Price", type: "number", minWidth: 110, align: "right", compact: true },
  { key: "livePrice", label: "Live Sale Price", type: "number", minWidth: 110, align: "right", compact: true },
];
  const eventCols = [
    { key: "eventCode", label: "Event Code" },
    { key: "eventSku", label: "Event SKU" },
    { key: "productName", label: "Event Product Name" },
    { key: "supplyPrice", label: "공급가", type: "number" },
    { key: "salePrice", label: "판매가", type: "number" },
    { key: "consumerPrice", label: "소비자가", type: "number" },
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
      label: "Names of products inside the set",
      render: (row) => {
        const items = parseProductsInside(row.productsInside);
        if (items.length === 0) return <span className="small">-</span>;

        const text = items
          .map((it) => {
            const p =
              (state.catalogProducts || []).find(
                (x) => (x.sku || x.productCode) === it.productCode
              ) ||
              (state.mainProducts || []).find(
                (x) => x.productCode === it.productCode
              );

            return `${p?.productName || it.productCode} x${it.qty}`;
          })
          .join(", ");

        return <span>{text}</span>;
      },
    },
    {
      key: "stockComputed",
      label: "Stock",
      render: (row) => {
        const s = computeSetStock(state, row.setCode);
        return <span className="stockPill">{s}</span>;
      },
    },
  ];

  const compCols = [
    { key: "setCode", label: "Set Code" },
    { key: "productCode", label: "Product Code / SKU" },
    { key: "qtyPerSet", label: "Qty per Set", type: "number" },
  ];

  const giftCols = [
    { key: "giftName", label: "Gift Name" },
    { key: "stock", label: "Stock", type: "number" },
    { key: "giftCode", label: "Gift Code" },
  ];

  const duplicates = useMemo(() => {
    const dup = { productCode: new Set(), setCode: new Set(), giftCode: new Set() };
    const seenP = new Set();
    const seenS = new Set();
    const seenG = new Set();

    for (const p of state.mainProducts || []) {
      if (!p.productCode) continue;
      if (seenP.has(p.productCode)) dup.productCode.add(p.productCode);
      seenP.add(p.productCode);
    }

    for (const s of state.setProducts || []) {
      if (!s.setCode) continue;
      if (seenS.has(s.setCode)) dup.setCode.add(s.setCode);
      seenS.add(s.setCode);
    }

    for (const g of state.gifts || []) {
      if (!g.giftCode) continue;
      if (seenG.has(g.giftCode)) dup.giftCode.add(g.giftCode);
      seenG.add(g.giftCode);
    }

    return dup;
  }, [state]);

  function warningText() {
    const msgs = [];
    if (duplicates.productCode.size) {
      msgs.push(`Duplicate Product Codes: ${[...duplicates.productCode].join(", ")}`);
    }
    if (duplicates.setCode.size) {
      msgs.push(`Duplicate Set Codes: ${[...duplicates.setCode].join(", ")}`);
    }
    if (duplicates.giftCode.size) {
      msgs.push(`Duplicate Gift Codes: ${[...duplicates.giftCode].join(", ")}`);
    }
    return msgs.join(" • ");
  }

  function formatWon(value) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

  return (
    <div className="dashboardPage">
      <PageHeader
        title="Dashboard"
        subtitle="Manage products, aliases, events, gifts, imports, and logistics data from one operational workspace."
        actions={
          <>
            <button className="btn" onClick={() => nav("/order-list")} type="button">
              Order List
            </button>
            <button className="btn" onClick={() => exportInventoryToXlsx(state)} type="button">
              Export Excel
            </button>
            <button className="btn" onClick={() => fileRefXlsx.current?.click()} type="button">
              Import Excel
            </button>
            <button className="btn" onClick={() => exportJson(state)} type="button">
              Export JSON
            </button>
            <button className="btn" onClick={() => fileRefJson.current?.click()} type="button">
              Import JSON
            </button>
            <button
              className="btn danger"
              type="button"
              onClick={() => {
                if (!confirm("Reset ALL data? This clears local storage.")) return;
                resetState();
                setState(initialState);
              }}
            >
              Reset
            </button>
          </>
        }
      />

      <div className="metricsGrid">
        <MetricCard label="Total Orders" value={orderMetrics.total} hint="All orders in system" />
        <MetricCard label="Draft Orders" value={orderMetrics.draft} hint="Drafts created by influencers" />
        <MetricCard label="Confirmed" value={orderMetrics.confirmed} hint="Confirmed by influencers" tone="info" />
        <MetricCard label="Packed" value={orderMetrics.packed} hint="Prepared for shipping" tone="warn" />
        <MetricCard label="Shipped" value={orderMetrics.shipped} hint="Already dispatched" tone="success" />
        <MetricCard label="Low Stock Items" value={lowStockCount} hint="Products under 50 stock" tone="danger" />
      </div>

      {warningText() && (
        <div className="warningBanner">
          <span className="warningLabel">Warning</span>
          <span>{warningText()}</span>
        </div>
      )}

      <div className="dashboardSection">
        <div className="sectionTopRow">
          <div>
            <div className="sectionTitle">Inventory Tables</div>
            <div className="sectionSubtitle">
              Master catalog, event products, aliases, sets, components, and gifts.
            </div>
          </div>
        </div>

        <Tabs tabs={tabs} active={active} onChange={setActive} />

        {active === "main" && (
          <EditableTable
            rows={state.mainProducts || []}
            columns={mainCols}
            addLabel="Add Main Product"
            onAdd={() =>
              addRow("mainProducts", {
                id: newId(),
                brandName: "",
                productName: "",
                productCode: "",
                stock: 0,
                supplyPrice: 0,
                retailPrice: 0,
                onlinePrice: 0,
              })
            }
            // onUpdate={(id, patch) => updateOne("mainProducts", id, patch)}
            // onDelete={(id) => deleteRow("mainProducts", id)}
            onUpdate={async (id, patch) => {
  const row = (state.mainProducts || []).find((x) => x.id === id);
  if (!row) return;
  const next = { ...row, ...patch };
  await upsertMainProduct(next);
  setState(await loadAppData());
}}
onDelete={async (id) => {
  await deleteMainProduct(id);
  setState(await loadAppData());
}}
            emptyText="Add your first product (Brand, Name, Stock, Code)."
          />
        )}

        {active === "catalog" && (
          <EditableTable
            rows={state.catalogProducts || []}
            columns={catalogCols}
            addLabel="Add Catalog Product"
            onAdd={() =>
              addRow("catalogProducts", {
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
            // onUpdate={(id, patch) => updateOne("catalogProducts", id, patch)}
            // onDelete={(id) => deleteRow("catalogProducts", id)}
            onUpdate={async (id, patch) => {
  const row = (state.catalogProducts || []).find((x) => x.id === id);
  if (!row) return;
  const next = { ...row, ...patch };
  await upsertCatalogProduct(next);
  setState(await loadAppData());
}}
onDelete={async (id) => {
  await deleteCatalogProduct(id);
  setState(await loadAppData());
}}
            emptyText="Import the Excel master catalog or add official products here."
          />
        )}

        {active === "events" && (
          <EditableTable
            rows={state.catalogEvents || []}
            columns={eventCols}
            addLabel="Add Event Product"
            onAdd={() =>
              addRow("catalogEvents", {
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
            onUpdate={(id, patch) => updateOne("catalogEvents", id, patch)}
            onDelete={(id) => deleteRow("catalogEvents", id)}
            emptyText="Event products imported from the 이벤트 sheet will appear here."
          />
        )}

        {active === "aliases" && (
          <EditableTable
            rows={state.aliasTable || []}
            columns={aliasCols}
            addLabel="Add Alias"
            onAdd={() =>
              addRow("aliasTable", {
                id: newId(),
                aliasName: "",
                targetType: "PRODUCT",
                targetSku: "",
                officialName: "",
                active: true,
              })
            }
            onUpdate={(id, patch) => updateOne("aliasTable", id, patch)}
            onDelete={(id) => deleteRow("aliasTable", id)}
            emptyText="Add seller naming aliases here (e.g. BNG Braid → official SKU)."
          />
        )}

        {active === "sets" && (
          <EditableTable
            rows={computedSets}
            columns={setCols}
            addLabel="Add Set Product"
            onAdd={() =>
              addRow("setProducts", {
                id: newId(),
                setName: "",
                setCode: "",
                productsInside: "",
              })
            }
            onUpdate={(id, patch) => updateOne("setProducts", id, patch)}
            onDelete={(id) => deleteRow("setProducts", id)}
            emptyText="Add sets here. Then define Set Components to compute set stock."
          />
        )}

        {active === "comps" && (
          <EditableTable
            rows={state.setComponents || []}
            columns={compCols}
            addLabel="Add Set Component"
            onAdd={() =>
              addRow("setComponents", {
                id: newId(),
                setCode: "",
                productCode: "",
                qtyPerSet: 1,
              })
            }
            onUpdate={(id, patch) => updateOne("setComponents", id, patch)}
            onDelete={(id) => deleteRow("setComponents", id)}
            emptyText="Define what each set contains: SetCode, ProductCode, QtyPerSet."
          />
        )}

        {active === "gifts" && (
          <EditableTable
            rows={state.gifts || []}
            columns={giftCols}
            addLabel="Add Gift"
            onAdd={() =>
              addRow("gifts", {
                id: newId(),
                giftName: "",
                giftCode: "",
                stock: 0,
              })
            }
            onUpdate={(id, patch) => updateOne("gifts", id, patch)}
            onDelete={(id) => deleteRow("gifts", id)}
            emptyText="Add gifts here (Name, Stock, Code)."
          />
        )}
      </div>

      {/* {<input
        ref={fileRefXlsx}
        type="file"
        accept=".xlsx"
        style={{ display: "none" }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const inv = await importInventoryFromXlsx(f);
          setState((prev) => ({ ...prev, ...inv }));
          e.target.value = "";
        }}
      /> } */}
      <input
  ref={fileRefXlsx}
  type="file"
  accept=".xlsx"
  style={{ display: "none" }}
  onChange={async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    try {
      const inv = await importInventoryFromXlsx(f);
      const fresh = await replaceCatalogData(inv);
      setState(fresh);
    } catch (err) {
      console.error(err);
      alert(err.message || "Excel import failed.");
    }

    e.target.value = "";
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
          const imported = await importJson(f);
          setState((prev) => ({ ...prev, ...imported }));
          e.target.value = "";
        }}
      />
    </div>
  );
}