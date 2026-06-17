import { gapSeverity, fmtPct } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function MetricTrack({
  offline,
  online,
  compact = false,
}: {
  offline: number;
  online: number;
  compact?: boolean;
}) {
  const gap = offline - online;
  const sev = gapSeverity(gap);
  const lo = Math.min(offline, online);
  const hi = Math.max(offline, online);

  return (
    <div className={cn("w-full", compact ? "space-y-1" : "space-y-1.5")}>
      <div className="flex items-center justify-between font-mono text-[11px]">
        <span className="text-ink-400">
          离线 <span className="num text-ink-200">{fmtPct(offline)}</span>
        </span>
        <span className={cn("num", sev.color)}>
          Δ {(gap >= 0 ? "+" : "") + (gap * 100).toFixed(1)}
        </span>
        <span className="text-ink-400">
          在线 <span className="num text-ink-200">{fmtPct(online)}</span>
        </span>
      </div>
      <div className="relative h-1.5 w-full rounded-full bg-ink-800">
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full"
          style={{
            left: `${lo * 100}%`,
            width: `${Math.max(0.6, (hi - lo) * 100)}%`,
            backgroundColor:
              sev.label === "对齐"
                ? "rgba(190,242,100,0.55)"
                : sev.label === "轻微偏离"
                  ? "rgba(251,191,36,0.6)"
                  : "rgba(251,113,133,0.6)",
          }}
        />
        <span
          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal-400 ring-2 ring-ink-950"
          style={{ left: `${offline * 100}%` }}
        />
        <span
          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-info-300 ring-2 ring-ink-950"
          style={{ left: `${online * 100}%` }}
        />
      </div>
    </div>
  );
}
