import { cn } from "@/lib/utils";

// 边界分数条：0~1，越接近 0.5 越在拒答边界
export function ScoreBar({
  score,
  className,
  showValue = true,
}: {
  score: number;
  className?: string;
  showValue?: boolean;
}) {
  const dist = Math.abs(score - 0.5);
  const isBoundary = dist <= 0.06;
  const tone = isBoundary ? "bg-amber-400" : score > 0.5 ? "bg-emerald-400" : "bg-rose-400";
  const fill = Math.round(score * 100);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-edge2/60">
        {/* 边界区高亮带 */}
        <div className="absolute inset-y-0 left-[44%] w-[12%] bg-amber-400/15" />
        <div
          className={cn("relative h-full rounded-full transition-all duration-500", tone)}
          style={{ width: `${fill}%` }}
        />
      </div>
      {showValue && (
        <span
          className={cn(
            "tabular font-mono text-xs",
            isBoundary ? "text-amber-300" : "text-muted",
          )}
        >
          {score.toFixed(2)}
        </span>
      )}
    </div>
  );
}
