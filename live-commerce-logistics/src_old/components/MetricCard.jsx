export default function MetricCard({ label, value, hint, tone = "default" }) {
  return (
    <div className={`metricCard ${tone}`}>
      <div className="metricLabel">{label}</div>
      <div className="metricValue">{value}</div>
      {hint ? <div className="metricHint">{hint}</div> : null}
    </div>
  );
}