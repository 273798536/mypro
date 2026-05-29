import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiffHighlightProps {
  oldValue?: number | string | null;
  newValue?: number | string | null;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function DiffHighlight({
  oldValue,
  newValue,
  prefix = "",
  suffix = "",
  className,
}: DiffHighlightProps) {
  const oldNum = typeof oldValue === "number" ? oldValue : parseFloat(String(oldValue || "0"));
  const newNum = typeof newValue === "number" ? newValue : parseFloat(String(newValue || "0"));

  const diff = newNum - oldNum;
  const isIncrease = diff > 0;
  const isDecrease = diff < 0;
  const isEqual = diff === 0;

  const formatValue = (val: number | string | null | undefined) => {
    if (val === null || val === undefined || val === "") return "-";
    if (typeof val === "number") {
      return val.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return String(val);
  };

  const formatDiff = (diff: number) => {
    const absDiff = Math.abs(diff);
    return absDiff.toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-[13px] text-gray-500 line-through">
        {prefix}
        {formatValue(oldValue)}
        {suffix}
      </span>
      <span className="text-[13px] font-medium text-gray-900">
        {prefix}
        {formatValue(newValue)}
        {suffix}
      </span>
      {!isEqual && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-[12px] font-medium",
            isIncrease ? "text-green-600" : "text-red-600"
          )}
        >
          {isIncrease ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {isIncrease ? "+" : "-"}
          {prefix}
          {formatDiff(diff)}
          {suffix}
        </span>
      )}
      {isEqual && (
        <span className="inline-flex items-center gap-0.5 text-[12px] text-gray-400">
          <Minus className="h-3 w-3" />
          无变化
        </span>
      )}
    </div>
  );
}
