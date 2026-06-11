import type { Availability, RiskLevel, EntityStatus } from "@/types";

export function ResultBadge({
  availability,
  size = "md",
}: {
  availability: Availability;
  size?: "sm" | "md" | "lg";
}) {
  const map = {
    AVAILABLE: {
      label: "可用",
      dot: "bg-availability-available",
      chip: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    },
    PENDING: {
      label: "暂缓",
      dot: "bg-availability-pending",
      chip: "bg-amber-50 text-amber-700 border border-amber-200",
    },
    RECOLLECT: {
      label: "重采",
      dot: "bg-availability-recollect",
      chip: "bg-red-50 text-red-700 border border-red-200",
    },
  } as const;
  const cfg = map[availability];
  const sizes = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${cfg.chip} ${sizes[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
      {cfg.label}
    </span>
  );
}

export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  const map = {
    LOW: { label: "低风险", cls: "bg-sky-50 text-sky-700 border border-sky-200" },
    MEDIUM: {
      label: "中风险",
      cls: "bg-amber-50 text-amber-700 border border-amber-200",
    },
    HIGH: { label: "高风险", cls: "bg-red-50 text-red-700 border border-red-200" },
  } as const;
  const cfg = map[level];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: EntityStatus }) {
  const map = {
    DRAFT: { label: "草稿", cls: "bg-slate-50 text-slate-600 border-slate-200" },
    PENDING_CONFIRM: {
      label: "待确认",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
    },
    APPROVED: {
      label: "已通过",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    REJECTED: { label: "已驳回", cls: "bg-red-50 text-red-700 border-red-200" },
  } as const;
  const cfg = map[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

export function NeedsReviewChip({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
      有 {count} 项待复核
    </span>
  );
}

export function TinyDot({ color }: { color: "green" | "amber" | "red" | "slate" }) {
  const cls = {
    green: "bg-availability-available",
    amber: "bg-availability-pending",
    red: "bg-availability-recollect",
    slate: "bg-slate-400",
  }[color];
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${cls}`} />;
}
