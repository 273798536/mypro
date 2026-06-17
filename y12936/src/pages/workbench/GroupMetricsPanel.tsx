import { useMemo } from "react";
import { Layers } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import type { GroupMetric } from "@/types";
import { MetricTrack } from "@/components/ui/MetricTrack";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { cn } from "@/lib/utils";

function computeGroups(samples: ReturnType<typeof useAppStore.getState>["samples"]): GroupMetric[] {
  const map = new Map<string, GroupMetric>();
  for (const s of samples) {
    const g = map.get(s.group) ?? {
      group: s.group,
      offlineScore: 0,
      onlineScore: 0,
      gap: 0,
      dirtyCount: 0,
      total: 0,
    };
    g.offlineScore += s.offlineMetric;
    g.onlineScore += s.onlineMetric;
    g.dirtyCount += s.status === "dirty" || s.status === "leak" ? 1 : 0;
    g.total += 1;
    map.set(s.group, g);
  }
  return Array.from(map.values()).map((g) => {
    const off = g.offlineScore / g.total;
    const on = g.onlineScore / g.total;
    return { ...g, offlineScore: off, onlineScore: on, gap: off - on };
  });
}

export function GroupMetricsPanel() {
  const samples = useAppStore((s) => s.samples);
  const groups = useMemo(() => computeGroups(samples), [samples]);

  const worstGap = Math.max(...groups.map((g) => Math.abs(g.gap)));

  return (
    <div className="space-y-3">
      <SectionLabel right={<Layers className="h-3 w-3 text-ink-600" />}>分组指标</SectionLabel>
      <div className="space-y-2">
        {groups.map((g) => {
          const dirty = g.dirtyCount;
          return (
            <div key={g.group} className="panel-tight p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-200">{g.group}</span>
                <div className="flex items-center gap-1.5">
                  {dirty > 0 && (
                    <span className="chip border-warn-400/30 bg-warn-400/10 text-warn-300">
                      脏 {dirty}
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-ink-600">n={g.total}</span>
                </div>
              </div>
              <div className="mt-2">
                <MetricTrack offline={g.offlineScore} online={g.onlineScore} compact />
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink-800">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      Math.abs(g.gap) === worstGap ? "bg-danger-400" : "bg-warn-400/70",
                    )}
                    style={{ width: `${Math.min(100, Math.abs(g.gap) * 400)}%` }}
                  />
                </div>
                <span className="font-mono text-[9px] text-ink-600">差距条</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
