import { cn } from "@/lib/utils";
import { statusLabel, sourceTypeLabel } from "@/utils/helpers";
import type { OrderStatus, SourceType } from "@/types";

interface StatusTagProps {
  status: OrderStatus;
  className?: string;
}

export function StatusTag({ status, className }: StatusTagProps) {
  const styles: Record<OrderStatus, string> = {
    pending: "bg-amber-50 text-amber-700 border border-amber-200/60",
    confirmed: "bg-moss-50 text-moss-700 border border-moss-200/60",
    revoked: "bg-crimson-50 text-crimson-700 border border-crimson-200/60",
  };
  return (
    <span className={cn("chip", styles[status], className)}>
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === "pending" && "bg-amber-500",
          status === "confirmed" && "bg-moss-500",
          status === "revoked" && "bg-crimson-500"
        )}
      />
      {statusLabel(status)}
    </span>
  );
}

interface SourceTagProps {
  source: SourceType;
  className?: string;
}

export function SourceTag({ source, className }: SourceTagProps) {
  const styles: Record<SourceType, string> = {
    online_ticket: "bg-navy-50 text-navy-700 border border-navy-100",
    anomaly: "bg-crimson-50 text-crimson-700 border border-crimson-200/60",
    supplement:
      "bg-purple-50 text-purple-700 border border-purple-200/60",
  };
  return (
    <span className={cn("chip", styles[source], className)}>
      {sourceTypeLabel(source)}
    </span>
  );
}

interface WeightTagProps {
  weight: number;
  className?: string;
}

export function WeightTag({ weight, className }: WeightTagProps) {
  const label =
    weight >= 1.8
      ? "极高影响"
      : weight >= 1.2
      ? "高影响"
      : weight >= 0.6
      ? "中影响"
      : "低影响";
  const cls =
    weight >= 1.8
      ? "bg-crimson-50 text-crimson-700 border border-crimson-200/60"
      : weight >= 1.2
      ? "bg-amber-50 text-amber-700 border border-amber-200/60"
      : weight >= 0.6
      ? "bg-navy-50 text-navy-700 border border-navy-100"
      : "bg-moss-50 text-moss-700 border border-moss-200/60";
  return (
    <span className={cn("chip", cls, className)}>
      权重 {weight.toFixed(1)} · {label}
    </span>
  );
}
