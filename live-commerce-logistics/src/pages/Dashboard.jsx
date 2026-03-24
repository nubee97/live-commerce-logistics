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

const SECTION_META = {
  main: {
    title: "메인 상품 관리",
    subtitle: "Main products used for core pricing, stock control, and daily live commerce planning.",
  },
  catalog: {
    title: "마스터 카탈로그",
    subtitle: "Reference catalog used for seller-facing naming, SKU mapping, and Excel alignment.",
  },
  events: {
    title: "행사 / 이벤트 상품",
    subtitle: "Limited or campaign items aligned to live campaigns and event-based sales sheets.",
  },
  aliases: {
    title: "셀러 별칭 매핑",
    subtitle: "Normalize seller nicknames and alternate product names into one official catalog structure.",
  },
  sets: {
    title: "세트 상품",
    subtitle: "Bundle definitions used to calculate sellable stock and warehouse pick requirements.",
  },
  comps: {
    title: "세트 구성품",
    subtitle: "Detailed set composition table so one order can expand cleanly into warehouse pick lines.",
  },
  gifts: {
    title: "사은품 관리",
    subtitle: "Gift inventory used in confirmed orders and packing sheets.",
  },
};

export default function Dashboard() {
  const { state, setState } = useStore();
  const [active, setActive] = useState("main");
  const [isBusy, setIsBusy] = useState(false);
  const fileRefXlsx = useRef(null);
  const fileRefJson = useRef(null);
  const nav = useNavigate();

  const giftRows = useMemo(() => getGiftRows(state), [state]);

  const tabs = [
    { key: "main", label: "Main Products", meta: "메인 상품" },
    { key: "catalog", label: "Master Catalog", meta: "마스터 카탈로그" },
    { key: "events", label: "Event Products", meta: "행사 상품" },
    { key: "aliases", label: "Aliases", meta: "별칭 매핑" },
    { key: "sets", label: "Set Products", meta: "세트 상품" },
    { key: "comps", label: "Set Components", meta: "구성품" },
    { key: "gifts", label: "Gifts", meta: "사은품" },
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
      state.catalogProducts?.length ? state.catalogProducts : state.mainProducts || []
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

  const activeRows = useMemo(() => {
    switch (active) {
      case "main":
        return sortedMainProducts;
      case "catalog":
        return sortedCatalogProducts;
      case "events":
        return state.catalogEvents || [];
      case "aliases":
        return state.aliasTable || [];
      case "sets":
        return state.setProducts || [];
      case "comps":
        return state.setComponents || [];
      case "gifts":
        return giftRows;
      default:
        return [];
    }
  }, [active, sortedMainProducts, sortedCatalogProducts, state.catalogEvents, state.aliasTable, state.setProducts, state.setComponents, giftRows]);

  const inventoryOverview = useMemo(
    () => [
      {
        label: "카탈로그 SKU",
        value: state.catalogProducts?.length || 0,
      },
      {
        label: "세트 상품",
        value: state.setProducts?.length || 0,
      },
      {
        label: "사은품",
        value: giftRows.length,
      },
      {
        label: "활성 별칭",
        value: (state.aliasTable || []).filter((row) => row.active !== false).length,
      },
    ],
    [state.catalogProducts, state.setProducts, state.aliasTable, giftRows.length]
  );

  const metrics = [
    { label: "전체 주문", value: orderMetrics.total, hint: "Total orders", tone: "default" },
    { label: "신규주문", value: orderMetrics.draft, hint: "Draft / 신규 등록", tone: "info" },
    { label: "발주확인", value: orderMetrics.confirmed, hint: "Confirmed orders", tone: "success" },
    { label: "배송중", value: orderMetrics.packed, hint: "Packed / in progress", tone: "warn" },
    { label: "배송완료", value: orderMetrics.shipped, hint: "Shipped / completed", tone: "default" },
    { label: "저재고", value: lowStockCount, hint: "< 50 units", tone: lowStockCount > 0 ? "danger" : "success" },
  ];

  const mainCols = [
    { key: "productName", label: "상품명 Product Name", minWidth: 220 },
    { key: "supplyPrice", label: "공급가", type: "number" },
    { key: "retailPrice", label: "소비자가", type: "number" },
    { key: "lowestPrice", label: "최저가", type: "number" },
    { key: "onlinePrice", label: "라이브가", type: "number" },
    {
      key: "lastModified",
      label: "수정일",
      render: (row) => (row.lastModified ? new Date(row.lastModified).toLocaleString() : "-"),
    },
  ];

  const catalogCols = [
    { key: "sku", label: "SKU", minWidth: 120 },
    { key: "productName", label: "공식 상품명", minWidth: 240 },
    { key: "supplyPrice", label: "공급가", type: "number" },
    { key: "consumerPrice", label: "소비자가", type: "number" },
    { key: "lowestPrice", label: "최저가", type: "number" },
    { key: "livePrice", label: "라이브가", type: "number" },
    {
      key: "lastModified",
      label: "수정일",
      render: (row) => (row.lastModified ? new Date(row.lastModified).toLocaleString() : "-"),
    },
  ];

  const eventCols = [
    { key: "eventCode", label: "행사 코드" },
    { key: "eventSku", label: "행사 SKU" },
    { key: "productName", label: "행사 상품명", minWidth: 220 },
    { key: "supplyPrice", label: "공급가", type: "number" },
    { key: "salePrice", label: "판매가", type: "number" },
    { key: "consumerPrice", label: "소비자가", type: "number" },
    {
      key: "lastModified",
      label: "수정일",
      render: (row) => (row.lastModified ? new Date(row.lastModified).toLocaleString() : "-"),
    },
  ];

  const aliasCols = [
    { key: "aliasName", label: "셀러 별칭명", minWidth: 200 },
    { key: "targetType", label: "대상 타입" },
    { key: "targetSku", label: "매핑 SKU" },
    { key: "officialName", label: "공식 상품명", minWidth: 220 },
    {
      key: "active",
      label: "활성 여부",
      render: (row) => <span className={`statusDot ${row.active ? "good" : "muted"}`}>{row.active ? "Active" : "Inactive"}</span>,
    },
    {
      key: "lastModified",
      label: "수정일",
      render: (row) => (row.lastModified ? new Date(row.lastModified).toLocaleString() : "-"),
    },
  ];

  const setCols = [
    { key: "setName", label: "세트 상품명", minWidth: 220 },
    { key: "setCode", label: "세트 코드" },
    {
      key: "productsInside",
      label: "구성 코드",
      placeholder: "CODE:1;CODE:2",
      minWidth: 180,
    },
    {
      key: "namesInside",
      label: "구성 요약",
      render: (row) => {
        const items = parseProductsInside(row.productsInside);
        if (items.length === 0) return "-";

        return items.map((it) => `${it.productCode} × ${it.qty}`).join(", ");
      },
      minWidth: 220,
    },
    {
      key: "stockComputed",
      label: "계산 재고",
      render: (row) => computeSetStock(state, row.setCode),
    },
    {
      key: "lastModified",
      label: "수정일",
      render: (row) => (row.lastModified ? new Date(row.lastModified).toLocaleString() : "-"),
    },
  ];

  const compCols = [
    { key: "setCode", label: "세트 코드" },
    { key: "productCode", label: "상품 코드 / SKU", minWidth: 180 },
    { key: "qtyPerSet", label: "세트당 수량", type: "number" },
    {
      key: "lastModified",
      label: "수정일",
      render: (row) => (row.lastModified ? new Date(row.lastModified).toLocaleString() : "-"),
    },
  ];

  const giftCols = [
    { key: "giftName", label: "사은품명", minWidth: 220 },
    { key: "stock", label: "재고", type: "number" },
    { key: "giftCode", label: "사은품 코드" },
    {
      key: "lastModified",
      label: "수정일",
      render: (row) => (row.lastModified ? new Date(row.lastModified).toLocaleString() : "-"),
    },
  ];

  function requireSupabase() {
    if (!supabase) {
      throw new Error("Supabase is not configured. Check your .env values.");
    }
  }

  function updateRowLocal(tableKey, rowId, patch) {
    setState((prev) => {
      const sourceRows = tableKey === "gifts" ? getGiftRows(prev) : prev[tableKey] || [];

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
      const sourceRows = tableKey === "gifts" ? getGiftRows(prev) : prev[tableKey] || [];
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
      const sourceRows = tableKey === "gifts" ? getGiftRows(prev) : prev[tableKey] || [];
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

    const itemsRes = await supabase.from("order_items").delete().not("id", "is", null);
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

  const activeMeta = SECTION_META[active] || SECTION_META.main;

  return (
    <div className="dashboardPage">
      <PageHeader
        kicker="메인 대시보드 · Main Dashboard"
        title="Inventory & Order Control Center"
        subtitle="Supabase-backed catalog, order, and seller operations. The UI now follows the Korean operational sheet structure more closely so daily work feels consistent with your Excel process."
        actions={
          <>
            <button className="btn secondary" onClick={() => nav("/order-list")} disabled={isBusy}>
              주문통합검색
            </button>

            <button className="btn" onClick={() => exportInventoryToXlsx(state)} disabled={isBusy}>
              Export Excel
            </button>

            <button className="btn" onClick={() => fileRefXlsx.current?.click()} disabled={isBusy}>
              Import Excel
            </button>

            <button className="btn" onClick={() => exportJson(state)} disabled={isBusy}>
              Export JSON
            </button>

            <button className="btn" onClick={() => fileRefJson.current?.click()} disabled={isBusy}>
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

      <div className="dashboardHeroGrid">
        <div className="dashboardHeroCard">
          <div className="dashboardHeroKicker">운영 현황</div>
          <h2>오늘 가장 많이 보는 숫자를 먼저 확인하세요.</h2>
          <p>
            The dashboard is arranged like an operations board: status counts first, then product master data,
            sets, aliases, and gifts.
          </p>
          <div className="dashboardSummaryPills">
            {inventoryOverview.map((item) => (
              <div key={item.label} className="summaryPill">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboardHeroCard compact">
          <div className="dashboardHeroKicker">운영 메모</div>
          <ul className="dashboardChecklist">
            <li>주문 상태 숫자는 Order List filters and packing workflow와 바로 연결됩니다.</li>
            <li>카탈로그 / 세트 / 사은품 표는 모두 Supabase 데이터를 그대로 편집합니다.</li>
            <li>한국어 운영 시트와 맞추기 위해 주요 컬럼명을 한국어 중심으로 정리했습니다.</li>
          </ul>
        </div>
      </div>

      <div className="metricsGrid">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            tone={metric.tone}
          />
        ))}
      </div>

      <div className="dashboardSection">
        <div className="sectionTopRow">
          <div>
            <div className="sectionTitle">데이터 관리 구역</div>
            <div className="sectionSubtitle">
              Switch between pricing, catalog, bundle, alias, and gift tables without leaving the dashboard.
            </div>
          </div>
          <div className="sectionMetaBadge">Rows visible: {activeRows.length}</div>
        </div>

        <Tabs tabs={tabs} active={active} onChange={setActive} />
      </div>

      <div className="dashboardSection inventorySectionCard">
        <div className="sectionTopRow">
          <div>
            <div className="sectionTitle">{activeMeta.title}</div>
            <div className="sectionSubtitle">{activeMeta.subtitle}</div>
          </div>
          <div className="sectionMetaBadge">{activeRows.length} records</div>
        </div>

        {active === "main" && (
          <EditableTable
            rows={sortedMainProducts}
            columns={mainCols}
            addLabel="메인 상품 추가"
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
            addLabel="카탈로그 상품 추가"
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
            addLabel="행사 상품 추가"
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
            addLabel="별칭 추가"
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
            addLabel="세트 상품 추가"
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
            addLabel="세트 구성품 추가"
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
            addLabel="사은품 추가"
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
      </div>

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
