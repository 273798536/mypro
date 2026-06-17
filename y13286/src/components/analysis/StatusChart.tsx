import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { useReviewStore } from "@/store/reviewStore";

export default function StatusChart() {
  const points = useReviewStore((s) => s.points);

  const counts = useMemo(
    () =>
      points.reduce(
        (acc, p) => {
          acc.all += 1;
          if (p.status === "processed") acc.processed += 1;
          else if (p.status === "pending_site") acc.pending_site += 1;
          else if (p.status === "conflict") acc.conflict += 1;
          return acc;
        },
        { all: 0, processed: 0, pending_site: 0, conflict: 0 },
      ),
    [points],
  );

  const max = Math.max(counts.processed, counts.pending_site, counts.conflict, 1);

  const data = [
    { label: "已处理", value: counts.processed, color: "#15803d", bg: "bg-moss-600", light: "bg-moss-100" },
    { label: "待现场看", value: counts.pending_site, color: "#d97706", bg: "bg-amber-600", light: "bg-amber-100" },
    { label: "冲突记录", value: counts.conflict, color: "#b03421", bg: "bg-clay-600", light: "bg-clay-100" },
  ];

  return (
    <div className="bg-white rounded border border-ink-200 p-5 animate-fade-in-up">
      <h3 className="font-serif text-base font-semibold text-ink-800 mb-5 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-ink-600" />
        点位状态分布
      </h3>

      <div className="flex items-end justify-around gap-6 h-56 px-4 border-b border-l border-ink-200 relative">
        {data.map((d, i) => {
          const h = (d.value / max) * 80;
          return (
            <div key={d.label} className="flex flex-col items-center gap-2 flex-1 animate-fade-in-up" style={{ animationDelay: `${i * 120}ms` }}>
              <span className="text-2xl font-bold" style={{ color: d.color }}>
                {d.value}
              </span>
              <div
                className={`w-full max-w-[100px] ${d.bg} rounded-t transition-all duration-500`}
                style={{ height: `${h}%` }}
              />
              <div className={`w-full max-w-[100px] h-2 ${d.light} rounded-b`} />
              <span className="text-sm font-medium text-ink-700">{d.label}</span>
              <span className="text-xs text-slate-500">
                {((d.value / counts.all) * 100 || 0).toFixed(0)}%
              </span>
            </div>
          );
        })}

        <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-ink-400" />
        <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-ink-400" />
      </div>

      <div className="mt-4 pt-3 border-t border-ink-100 text-xs text-slate-500 text-center">
        合计 <span className="font-bold text-ink-700">{counts.all}</span> 个菜场卸货点位
      </div>
    </div>
  );
}
