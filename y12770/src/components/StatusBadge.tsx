import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import type { RecordStatus } from "@/types";

interface StatusBadgeProps {
  status: RecordStatus;
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  success: {
    label: "可直接使用",
    className: "status-success",
    icon: CheckCircle2,
  },
  pending: {
    label: "需复核",
    className: "status-warning",
    icon: Clock,
  },
  bad: {
    label: "数据异常",
    className: "status-danger",
    icon: AlertTriangle,
  },
};

export default function StatusBadge({
  status,
  showIcon = true,
  className = "",
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={`${config.className} ${className}`}>
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      {config.label}
    </span>
  );
}
