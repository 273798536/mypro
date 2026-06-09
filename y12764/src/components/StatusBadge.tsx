import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { RecordStatus } from "@/types";

interface StatusBadgeProps {
  status: RecordStatus;
  size?: "sm" | "md";
}

const statusConfig: Record<RecordStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  success: {
    label: "顺利",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  pending: {
    label: "待确认",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: AlertTriangle,
  },
  bad: {
    label: "坏数据",
    className: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
};

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  const iconSize = size === "sm" ? 14 : 16;
  const padding = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 ${padding} ${textSize} font-medium border rounded ${cfg.className}`}
    >
      <Icon width={iconSize} height={iconSize} />
      {cfg.label}
    </span>
  );
}
