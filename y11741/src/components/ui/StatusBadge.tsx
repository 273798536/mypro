import { cn } from "@/lib/utils";

type StatusType = "normal" | "anomaly" | "pending";
type SeverityType = "error" | "warning" | "info";

interface StatusBadgeProps {
  status?: StatusType;
  severity?: SeverityType;
  label: string;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  normal: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
  anomaly: "border-l-amber-500 bg-amber-50 text-amber-700",
  pending: "border-l-neutral-400 bg-neutral-50 text-neutral-600",
};

const severityStyles: Record<SeverityType, string> = {
  error: "border-l-rose-500 bg-rose-50 text-rose-700",
  warning: "border-l-amber-500 bg-amber-50 text-amber-700",
  info: "border-l-blue-500 bg-blue-50 text-blue-700",
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  severity,
  label,
  className,
}) => {
  const colorClass = severity
    ? severityStyles[severity]
    : status
    ? statusStyles[status]
    : statusStyles.pending;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-xs font-medium rounded border-l-2",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
};
