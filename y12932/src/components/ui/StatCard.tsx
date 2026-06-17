import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export function StatCard({
  label,
  value,
  suffix = "",
  decimals = 0,
  tone = "neutral",
  trend,
  hint,
  icon,
}: {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  tone?: "neutral" | "signal" | "safe" | "critical" | "info";
  trend?: { dir: "up" | "down" | "flat"; delta: string; good?: boolean };
  hint?: string;
  icon?: ReactNode;
}) {
  const animated = useCountUp(value);
  const toneText =
    tone === "signal"
      ? "text-amber-300"
      : tone === "safe"
        ? "text-emerald-300"
        : tone === "critical"
          ? "text-rose-300"
          : tone === "info"
            ? "text-sky-300"
            : "text-cream";

  const TrendIcon = trend?.dir === "up" ? ArrowUpRight : trend?.dir === "down" ? ArrowDownRight : Minus;

  return (
    <div className="card grain relative overflow-hidden p-4">
      <div className="flex items-start justify-between">
        <span className="eyebrow">{label}</span>
        {icon && <span className="text-faint">{icon}</span>}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className={cn("font-mono text-3xl font-medium tabular tracking-tightish", toneText)}>
          {(decimals > 0 ? animated.toFixed(decimals) : Math.round(animated).toLocaleString())}
          {suffix}
        </span>
        {trend && (
          <span
            className={cn(
              "mb-1 inline-flex items-center gap-0.5 font-mono text-xs",
              trend.good ? "text-emerald-400" : "text-rose-400",
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {trend.delta}
          </span>
        )}
      </div>
      {hint && <p className="mt-2 text-xs text-faint">{hint}</p>}
    </div>
  );
}
