import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";

const config: Record<string, { label: string; className: string }> = {
  usable: {
    label: "✓ 直接可用",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  review_needed: {
    label: "⚠ 待复核",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  reviewed_ok: {
    label: "✓ 复核通过",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  reviewed_failed: {
    label: "✗ 复核未通过",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  pending: {
    label: "待处理",
    className: "bg-slate-50 text-slate-700 border-slate-200",
  },
  approved: {
    label: "复核通过",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  rejected: {
    label: "复核驳回",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const role = useStore((s) => s.role);
  const cfg = config[status] ?? {
    label: status ?? "未知",
    className: "bg-slate-50 text-slate-700 border-slate-200",
  };
  const { label, className: badgeClass } = cfg;
  const showTooltip = role === "student" && status === "review_needed";

  return (
    <span className="relative group inline-block">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
          badgeClass,
          className
        )}
      >
        {label}
      </span>
      {showTooltip && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-3 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          此记录需实验室技师复核后使用
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </span>
      )}
    </span>
  );
}
