export default function StatusBadge({ status }) {
  const value = (status || "DRAFT").toUpperCase();

  const cls =
    value === "CONFIRMED"
      ? "statusBadge confirmed"
      : value === "PACKED"
      ? "statusBadge packed"
      : value === "SHIPPED"
      ? "statusBadge shipped"
      : value === "DELIVERED"
      ? "statusBadge delivered"
      : value === "CANCELLED"
      ? "statusBadge cancelled"
      : "statusBadge draft";

  return <span className={cls}>{value}</span>;
}