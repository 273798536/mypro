import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import clsx from "clsx";

export function ProgressStack() {
  const groups = useAppStore((s) => s.groups);
  const historyRecords = useAppStore((s) => s.historyRecords);

  const { autoMerged, manualDecided, pending, total } = useMemo(() => {
    let auto = 0;
    let manual = 0;
    let pend = 0;
    groups.forEach((g) => {
      const records = historyRecords.filter((h) => h.groupId === g.groupId);
      if (g.status === "merged") {
        if (records.some((r) => r.action === "confirm" && r.operator.includes("老曹"))) {
          manual++;
        } else if (records.length > 0) {
          manual++;
        } else {
          auto++;
        }
      } else {
        pend++;
      }
    });
    return {
      autoMerged: auto,
      manualDecided: manual,
      pending: pend,
      total: groups.length,
    };
  }, [groups, historyRecords]);

  const segments = [
    { label: "算法自动归并", value: autoMerged, cls: "bg-evidence-500", text: "text-evidence-600" },
    { label: "人工判断确认", value: manualDecided, cls: "bg-warning-500", text: "text-warning-600" },
    { label: "待处理", value: pending, cls: "bg-neutral-300", text: "text-neutral-500" },
  ];
  const pct = (v: number) => Math.round((v / total) * 100);

  return (
    <div className="card-base p-5 animate-fade-up" style={{ animationDelay: "100ms" }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-serif text-lg font-semibold">归并完成度</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            区分算法自动归并与人工判断，实时反映进度
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-bold">
            <span className="text-evidence-600">{autoMerged + manualDecided}</span>
            <span className="text-neutral-300 mx-1">/</span>
            <span className="text-neutral-500">{total}</span>
          </div>
          <div className="text-xs text-neutral-500">
            完成率 {pct(autoMerged + manualDecided)}%
          </div>
        </div>
      </div>

      <div className="relative h-4 rounded-civic overflow-hidden bg-neutral-100 flex shadow-inner">
        {segments.map((seg, i) =>
          seg.value > 0 ? (
            <div
              key={i}
              className={clsx("h-full transition-all duration-500", seg.cls)}
              style={{ width: `${pct(seg.value)}%` }}
              title={`${seg.label}: ${seg.value}条`}
            />
          ) : null
        )}
      </div>

      <div className="mt-4 space-y-2 pt-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className={clsx("w-3 h-3 rounded-sm shrink-0", seg.cls)} />
            <span className="text-neutral-700 flex-1">{seg.label}</span>
            <span className={clsx("font-mono font-semibold", seg.text)}>
              {seg.value}
            </span>
            <span className="font-mono text-xs text-neutral-400 w-10 text-right">
              {pct(seg.value)}%
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-3 gap-3">
        <StatCard label="总归并组" value={total} hint="公园点位" color="civic" />
        <StatCard label="晚到附件数" value={1} hint="需人工补充核查" color="late" />
        <StatCard label="相邻风险对" value={1} hint="低于50米阈值" color="risk" />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: number;
  hint: string;
  color: "civic" | "late" | "risk";
}) {
  const colorMap = {
    civic: "border-civic-200 bg-civic-50 text-civic-700",
    late: "border-late-200 bg-late-50 text-late-700",
    risk: "border-risk-200 bg-risk-50 text-risk-700",
  } as const;
  return (
    <div className={clsx("rounded-civic border p-3", colorMap[color])}>
      <div className="text-[11px] opacity-80">{label}</div>
      <div className="font-mono text-xl font-bold mt-0.5">{value}</div>
      <div className="text-[10px] opacity-70 mt-0.5">{hint}</div>
    </div>
  );
}
