// src/components/Tabs.jsx
export default function Tabs({ tabs = [], active, onChange }) {
  const safeTabs = Array.isArray(tabs) ? tabs : [];

  return (
    <div className="toolbar" style={{ justifyContent: "flex-start" }}>
      {safeTabs.length === 0 ? (
        <div className="small">No tabs configured.</div>
      ) : (
        safeTabs.map((t) => (
          <button
            key={t.key}
            className={`btn ${active === t.key ? "primary" : "ghost"}`}
            onClick={() => onChange?.(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))
      )}
    </div>
  );
}