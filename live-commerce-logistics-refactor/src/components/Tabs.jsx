export default function Tabs({ tabs = [], active, onChange }) {
  const safeTabs = Array.isArray(tabs) ? tabs : [];

  return (
    <div className="tabRow" role="tablist" aria-label="Dashboard sections">
      {safeTabs.length === 0 ? (
        <div className="small">No tabs configured.</div>
      ) : (
        safeTabs.map((t) => (
          <button
            key={t.key}
            className={`tabChip ${active === t.key ? "active" : ""}`}
            onClick={() => onChange?.(t.key)}
            type="button"
          >
            <span>{t.label}</span>
            {t.meta ? <small>{t.meta}</small> : null}
          </button>
        ))
      )}
    </div>
  );
}
