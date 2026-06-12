import { WaterQualityWarning } from "@/types";
import FormulaBlock from "./FormulaBlock";
import { AlertTriangle, AlertCircle, CheckCircle2, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  warning: WaterQualityWarning;
  expanded: boolean;
  onToggle: () => void;
}

const severityStyles = {
  high: {
    border: "border-quality-recollect/50",
    glow: "animate-glow-border",
    header: "bg-quality-recollect/15",
    text: "text-quality-recollect",
  },
  medium: {
    border: "border-quality-pending/50",
    glow: "",
    header: "bg-quality-pending/15",
    text: "text-quality-pending",
  },
  low: {
    border: "border-ocean-500/30",
    glow: "",
    header: "bg-ocean-600/20",
    text: "text-ocean-300",
  },
};

export default function WarningCard({ warning, expanded, onToggle }: Props) {
  const triggered = warning.isTriggered;
  const style = triggered
    ? severityStyles[warning.severity]
    : severityStyles.low;

  const exceedRatio =
    warning.threshold && !isNaN(warning.threshold)
      ? (warning.currentValue / warning.threshold).toFixed(2)
      : "—";

  return (
    <div
      className={cn(
        "glass-card glass-card-hover overflow-hidden border-2 transition-all",
        style.border,
        triggered && warning.severity === "high" && style.glow
      )}
    >
      <div
        className={cn(
          "px-5 py-4 border-b border-ocean-600/20 flex items-start justify-between gap-4",
          style.header
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {triggered ? (
              warning.severity === "high" ? (
                <AlertCircle size={16} className={style.text} />
              ) : (
                <AlertTriangle size={16} className={style.text} />
              )
            ) : (
              <CheckCircle2 size={16} className="text-quality-available" />
            )}
            <h3 className="font-serif text-base font-semibold text-ocean-50">
              {warning.indicatorName}
            </h3>
            <span className="font-mono text-xs text-ocean-400">
              {warning.indicatorCode}
            </span>
            {triggered && (
              <span
                className={cn(
                  "tag",
                  warning.severity === "high"
                    ? "bg-quality-recollect/20 text-quality-recollect"
                    : "bg-quality-pending/20 text-quality-pending"
                )}
              >
                {warning.severity === "high" ? "高度预警" : "中度预警"}
              </span>
            )}
            {!triggered && (
              <span className="tag bg-quality-available/15 text-quality-available">
                正常
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-3 mt-2 flex-wrap">
            <div>
              <span className={cn("text-3xl font-bold font-mono", style.text)}>
                {Number.isNaN(warning.currentValue) ? "—" : warning.currentValue}
              </span>
              <span className="text-sm text-ocean-400 ml-1">{warning.unit}</span>
            </div>
            {!Number.isNaN(warning.threshold) && (
              <div className="text-xs text-ocean-400/70">
                阈值：<span className="font-mono text-ocean-300">{warning.threshold}</span>
                <span className="ml-1">{warning.unit}</span>
              </div>
            )}
            {triggered && !Number.isNaN(warning.threshold) && (
              <div className="text-xs text-ocean-400/70">
                超标倍数：
                <span className={cn("font-mono", style.text)}>×{exceedRatio}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 p-2.5 rounded-xl bg-ocean-900/40 border border-ocean-600/20">
          <Gauge size={24} className={triggered ? style.text : "text-quality-available"} />
        </div>
      </div>

      <div className="px-5 py-4">
        <FormulaBlock warning={warning} expanded={expanded} onToggle={onToggle} />
      </div>
    </div>
  );
}
