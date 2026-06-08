import { ANOMALY_META } from "../../shared/constants";
import type { AnomalyType } from "../../shared/types";
import { cn } from "@/lib/utils";

interface AnomalyBadgeProps {
  anomalyType: AnomalyType;
  className?: string;
}

export default function AnomalyBadge({ anomalyType, className }: AnomalyBadgeProps) {
  const meta = ANOMALY_META[anomalyType];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-slate-700", className)}>
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: meta.color }}
      />
      {meta.name}
    </span>
  );
}
