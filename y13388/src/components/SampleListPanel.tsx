import { useDashboardStore } from "@/store/dashboardStore";
import { CONCLUSION_STATUS, CONCLUSION_COLORS, POLLUTION_COLORS, POLLUTION_STATUS } from "@/utils/constants";
import type { ConclusionKey, PollutionKey } from "@/utils/constants";
import { formatDate, formatScore } from "@/utils/formatters";
import { AlertTriangle, CheckCircle2, ExternalLink, FilterX, Gauge, Search, ShieldAlert, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SampleListPanel() {
  const nav = useNavigate();
  const {
    filters,
    versions,
    grayConfigs,
    setVersion,
    setGrayConfig,
    togglePollution,
    toggleConclusion,
    setBoundaryOnly,
    setCoveredOnly,
    setKeyword,
    resetFilters,
    getFilteredSamples,
  } = useDashboardStore();
  const samples = getFilteredSamples();
  const versionMap = Object.fromEntries(versions.map((v) => [v.id, v]));
  const grayMap = Object.fromEntries(grayConfigs.map((g) => [g.id, g]));

  const activeFilterCount =
    (filters.versionId ? 1 : 0) +
    (filters.grayConfigId ? 1 : 0) +
    filters.pollutionStatuses.length +
    filters.conclusionStatuses.length +
    (filters.isBoundaryOnly ? 1 : 0) +
    (filters.isCoveredByMeanOnly ? 1 : 0) +
    (filters.keyword ? 1 : 0);

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-ink-700/60 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="section-title">
            <Gauge size={15} className="text-signal-cyan" />
            样本流水线
          </div>
          <div className="mt-1 text-xs text-ink-500">
            共 <span className="font-mono text-slate-300">{samples.length}</span> 条样本，算法判断别抢戏 · 人工结论才拍板
          </div>
        </div>
        <div className="relative flex-1 md:max-w-md">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            className="input-field pl-8"
            placeholder="搜索样本ID / 来源 / 原因..."
            value={filters.keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 border-b border-ink-700/40 p-4 md:grid-cols-6">
        <FilterGroup label="模型版本">
          <Select
            placeholder="全部版本"
            value={filters.versionId ?? ""}
            onChange={(v) => setVersion(v || null)}
            options={[
              { value: "", label: "全部版本" },
              ...versions.map((v) => ({ value: v.id, label: `${v.id} · 阈值${v.threshold.toFixed(2)}` })),
            ]}
          />
        </FilterGroup>
        <FilterGroup label="灰度策略">
          <Select
            placeholder="全部策略"
            value={filters.grayConfigId ?? ""}
            onChange={(v) => setGrayConfig(v || null)}
            options={[
              { value: "", label: "全部策略" },
              ...grayConfigs.map((g) => ({
                value: g.id,
                label: `${g.name} · w=${g.windowSize}d`,
              })),
            ]}
          />
        </FilterGroup>
        <FilterGroup label="污染状态">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(POLLUTION_STATUS) as PollutionKey[]).map((key) => {
              const active = filters.pollutionStatuses.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => togglePollution(key)}
                  className={`rounded-md border px-2 py-1 text-[11px] transition ${
                    active ? POLLUTION_COLORS[key] : "border-ink-600/60 bg-ink-800/40 text-ink-500 hover:border-signal-slate/40 hover:text-slate-300"
                  }`}
                >
                  {POLLUTION_STATUS[key]}
                </button>
              );
            })}
          </div>
        </FilterGroup>
        <FilterGroup label="结论状态">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CONCLUSION_STATUS) as ConclusionKey[]).map((key) => {
              const active = filters.conclusionStatuses.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleConclusion(key)}
                  className={`rounded-md border px-2 py-1 text-[11px] transition ${
                    active ? CONCLUSION_COLORS[key] : "border-ink-600/60 bg-ink-800/40 text-ink-500 hover:border-signal-slate/40 hover:text-slate-300"
                  }`}
                >
                  {CONCLUSION_STATUS[key]}
                </button>
              );
            })}
          </div>
        </FilterGroup>
        <FilterGroup label="快速开关">
          <div className="flex flex-wrap gap-2">
            <ToggleChip label="仅边界样本" active={filters.isBoundaryOnly} onChange={setBoundaryOnly} />
            <ToggleChip label="被均值盖住" active={filters.isCoveredByMeanOnly} onChange={setCoveredOnly} />
          </div>
        </FilterGroup>
        <div className="flex items-end justify-between">
          <div className="text-[11px] text-ink-500">
            已选 <span className="font-mono text-slate-300">{activeFilterCount}</span> 项
          </div>
          <button onClick={resetFilters} className="btn-ghost !py-1 !text-xs" disabled={activeFilterCount === 0}>
            <FilterX size={13} />
            重置
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[960px] text-xs">
          <div className="sticky top-0 z-10 grid grid-cols-12 gap-3 border-b border-ink-700/60 bg-ink-900/80 px-4 py-2.5 font-semibold uppercase tracking-wider text-ink-500 backdrop-blur">
            <div className="col-span-2">样本 ID</div>
            <div className="col-span-2">版本 · 灰度</div>
            <div className="col-span-1 text-right">算法评分</div>
            <div className="col-span-1 text-center">边界</div>
            <div className="col-span-1 text-center">被均值盖住</div>
            <div className="col-span-1 text-center">污染</div>
            <div className="col-span-2">最终结论</div>
            <div className="col-span-1 text-right pr-1">操作</div>
          </div>
          <div>
            {samples.length === 0 && (
              <div className="py-16 text-center text-sm text-ink-500">
                <ShieldAlert size={28} className="mx-auto mb-2 text-ink-500/60" />
                没有匹配的样本，试试重置筛选条件
              </div>
            )}
            {samples.map((s, i) => {
              const latest = s.algoScores[s.algoScores.length - 1];
              const ver = versionMap[s.versionId];
              const gray = grayMap[s.grayConfigId];
              const nearThreshold = ver && latest ? Math.abs(latest.score - ver.threshold) < 0.04 : false;
              return (
                <div
                  key={s.id}
                  className={`data-row group items-center ${i % 2 ? "bg-ink-900/20" : ""} ${s.pollutionStatus === "CONFIRMED" ? "!border-l-4 !pl-2 !border-l-signal-red" : ""}`}
                >
                  <div className="col-span-2 flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm text-slate-200">{s.id}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-ink-500 truncate">
                      {s.source} · {formatDate(s.sampledAt)}
                    </div>
                  </div>
                  <div className="col-span-2 flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded border border-signal-violet/40 bg-signal-violet/10 px-1.5 py-0.5 font-mono text-[11px] text-signal-violet">
                        {s.versionId}
                      </span>
                      <span className="rounded border border-signal-cyan/30 bg-signal-cyan/10 px-1.5 py-0.5 font-mono text-[10px] text-signal-cyan">
                        阈值 {ver?.threshold.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[11px] text-ink-500">
                      灰度 <span className="font-mono text-slate-400">{gray?.name ?? "—"}</span> · 窗口 {gray?.windowSize}d
                    </div>
                  </div>
                  <div className="col-span-1 flex flex-col items-end gap-1 pr-1">
                    <div className={`font-mono text-sm font-bold ${nearThreshold ? "text-signal-amber" : "text-slate-100"}`}>
                      {formatScore(latest?.score ?? 0)}
                    </div>
                    {ver && (
                      <div className="text-[10px] text-ink-500">
                        差阈值 {(latest?.score ?? 0) - ver.threshold > 0 ? "+" : ""}
                        {((latest?.score ?? 0) - ver.threshold).toFixed(3)}
                      </div>
                    )}
                  </div>
                  <div className="col-span-1 text-center">
                    {s.isBoundary ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-signal-amber/15 px-2 py-0.5 text-[10px] font-semibold text-signal-amber" title="边界样本：评分接近阈值">
                        <AlertTriangle size={10} />
                        边界
                      </span>
                    ) : (
                      <span className="text-[10px] text-ink-600">—</span>
                    )}
                  </div>
                  <div className="col-span-1 text-center">
                    {s.coveredByMean ? (
                      <div
                        className="mx-auto inline-flex cursor-help items-center gap-1 rounded-md border border-signal-amber/50 bg-signal-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-signal-amber"
                        title={`小样本被${gray?.windowSize ?? "?"}天窗口的平均数盖住，原始分与平滑分存在明显差异`}
                      >
                        <span className="font-mono">Σ̸</span> 盖住
                      </div>
                    ) : (
                      <span className="text-[10px] text-ink-600">正常</span>
                    )}
                  </div>
                  <div className="col-span-1 text-center">
                    <span className={POLLUTION_COLORS[s.pollutionStatus]}>
                      {s.pollutionStatus === "CONFIRMED" && <ShieldAlert size={10} />}
                      {POLLUTION_STATUS[s.pollutionStatus]}
                    </span>
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <span className={CONCLUSION_COLORS[s.conclusion]}>
                      {s.conclusion === "PASSED" && <CheckCircle2 size={10} />}
                      {s.conclusion === "MANUAL_OVERRIDDEN" && <ShieldAlert size={10} />}
                      {CONCLUSION_STATUS[s.conclusion]}
                    </span>
                    <div className="truncate text-[11px] text-ink-500" title={s.conclusionReason}>
                      {s.conclusionReason.slice(0, 36)}
                      {s.conclusionReason.length > 36 ? "…" : ""}
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end gap-1 pr-1">
                    <button
                      onClick={() => nav(`/sample/${s.id}`)}
                      className="btn-ghost !px-2 !py-1 !text-[11px] opacity-70 transition group-hover:opacity-100"
                      title="查看详情"
                    >
                      详情 <ExternalLink size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{label}</div>
      {children}
    </div>
  );
}

function Select({
  placeholder,
  value,
  onChange,
  options,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field !py-1.5 !text-xs appearance-none pr-7 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-ink-900">
            {o.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-500">▾</div>
      {value && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChange("");
          }}
          className="absolute right-6 top-1/2 -translate-y-1/2 grid h-4 w-4 place-items-center rounded-full text-ink-500 hover:text-slate-200"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}

function ToggleChip({ label, active, onChange }: { label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`rounded-md border px-2 py-1 text-[11px] transition ${
        active
          ? "border-signal-amber/60 bg-signal-amber/10 text-signal-amber"
          : "border-ink-600/60 bg-ink-800/40 text-ink-500 hover:border-signal-slate/40 hover:text-slate-300"
      }`}
    >
      {label}
    </button>
  );
}
