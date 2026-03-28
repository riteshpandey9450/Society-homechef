import { STATUS_LABELS, STATUS_COLORS } from "../../utils/helpers";

export default function StatusBadge({ status, size = "sm" }) {
  const label = STATUS_LABELS[status] || status;
  const colorClass =
    STATUS_COLORS[status] || "bg-white/10 text-white/50 border border-white/10";

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold tracking-wide ${colorClass} ${
        size === "sm" ? "text-[11px] px-2.5 py-0.5" : "text-xs px-3 py-1"
      }`}
    >
      {label}
    </span>
  );
}
