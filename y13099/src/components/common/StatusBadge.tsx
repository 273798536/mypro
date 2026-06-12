import type { PlanStatus } from "@shared/types";
import { STATUS_LABEL_MAP } from "@shared/types";
import { CheckCircle, AlertTriangle, XCircle, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: PlanStatus;
  showIcon?: boolean;
  size?: "sm" | "md";
}

export function StatusBadge({ status, showIcon = true, size = "sm" }: StatusBadgeProps) {
  const iconMap = {
    pass: CheckCircle,
    supplement: AlertTriangle,
    exception: XCircle,
    withdrawn: RefreshCcw,
  };
  const Icon = iconMap[status];
  const label = STATUS_LABEL_MAP[status];
  const sizeClass = size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={cn(
        "status-badge",
        `status-${status}`,
        sizeClass,
        "gap-1.5 font-medium"
      )}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </span>
  );
}
