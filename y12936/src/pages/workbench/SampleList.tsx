import { useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { MATERIAL_META, STATUS_META, fmtPct } from "@/lib/domain";
import type { MaterialType, SampleStatus } from "@/types";
import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/ui/StatusBadge";

type StatusFilter = "all" | SampleStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "dirty", label: "脏数据" },
  { key: "leak", label: "泄漏" },
  { key: "fixed", label: "已修正" },
  { key: "clean", label: "干净" },
];

export function SampleList() {
  const samples = useAppStore((s) => s.samples);
  const selectedId = useAppStore((s) => s.selectedSampleId);
  const selectSample = useAppStore((s) => s.selectSample);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [materialFilter, setMaterialFilter] = useState<MaterialType | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return samples.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (materialFilter !== "all" && !s.materials.some((m) => m.type === materialFilter))
        return false;
      if (query && !`${s.id} ${s.question} ${s.group}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [samples, statusFilter, materialFilter, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2.5 border-b border-ink-800 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索 ID / 问题 / 分组"
            className="w-full rounded-md border border-ink-800 bg-ink-950/60 py-1.5 pl-8 pr-2 font-mono text-xs text-ink-200 placeholder:text-ink-600 focus:border-signal-500/50 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                "rounded border px-1.5 py-0.5 font-mono text-[10px] transition-colors",
                statusFilter === f.key
                  ? "border-signal-500/40 bg-signal-500/15 text-signal-200"
                  : "border-ink-800 text-ink-500 hover:text-ink-300",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3 w-3 text-ink-600" />
          <select
            value={materialFilter}
            onChange={(e) => setMaterialFilter(e.target.value as MaterialType | "all")}
            className="flex-1 rounded border border-ink-800 bg-ink-950/60 px-1.5 py-1 font-mono text-[10px] text-ink-400 focus:outline-none focus:border-signal-500/50"
          >
            <option value="all">全部材料类型</option>
            <option value="old_table">旧表</option>
            <option value="supplementary">补录备注</option>
            <option value="missing_unit">漏填单位</option>
            <option value="clean">干净材料</option>
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {filtered.map((s) => {
            const active = s.id === selectedId;
            return (
              <button
                key={s.id}
                onClick={() => selectSample(s.id)}
                className={cn(
                  "group w-full rounded-lg border p-2.5 text-left transition-colors",
                  active
                    ? "border-signal-500/40 bg-signal-500/10"
                    : "border-transparent hover:border-ink-700 hover:bg-ink-850",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={s.status} />
                    <span className="font-mono text-[11px] text-ink-300">{s.id}</span>
                    <span className="chip border-ink-700 text-ink-500">{s.group}</span>
                  </div>
                  <span
                    className={cn(
                      "num font-mono text-[10px]",
                      STATUS_META[s.status].text,
                    )}
                  >
                    {fmtPct(s.offlineMetric, 0)}/{fmtPct(s.onlineMetric, 0)}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-ink-400 group-hover:text-ink-300">
                  {s.question}
                </p>
                {s.stuckMaterial && (
                  <div className="mt-1.5 flex items-center gap-1">
                    <span className={cn("chip", MATERIAL_META.old_table.chip)}>
                      卡住 · {s.stuckCount}
                    </span>
                    <span className="truncate font-mono text-[9px] text-ink-600">
                      {s.stuckMaterial}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-10 text-center font-mono text-[11px] text-ink-600">
              无匹配样本
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
