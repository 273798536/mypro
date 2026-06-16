import { useAppStore } from "@/store/useAppStore";
import type { MergeStatus, RiskLevel } from "@/types";
import { STATUS_LABEL } from "@/types";
import { useFilteredGroups, useUniqueOperators } from "@/hooks/useFilter";
import { Filter, X, Download, RefreshCw, ListChecks } from "lucide-react";
import clsx from "clsx";

const ALL_STATUS: MergeStatus[] = ["merged", "pending", "doubtful", "risk"];
const ALL_RISK: RiskLevel[] = ["none", "low", "high"];
const STATUS_COLOR_DOT: Record<MergeStatus, string> = {
  merged: "bg-evidence-500",
  pending: "bg-warning-500",
  doubtful: "bg-late-500",
  risk: "bg-risk-500",
};

export function WorkbenchFilter() {
  const filter = useAppStore((s) => s.filter);
  const setFilter = useAppStore((s) => s.setFilter);
  const resetFilter = useAppStore((s) => s.resetFilter);
  const filtered = useFilteredGroups();
  const operators = useUniqueOperators();
  const selectAll = useAppStore((s) => s.selectAllFiltered);
  const selected = useAppStore((s) => s.selectedGroupIds);

  const toggleStatus = (s: MergeStatus) =>
    setFilter({
      statuses: filter.statuses.includes(s)
        ? filter.statuses.filter((x) => x !== s)
        : [...filter.statuses, s],
    });
  const toggleRisk = (r: RiskLevel) =>
    setFilter({
      riskLevels: filter.riskLevels.includes(r)
        ? filter.riskLevels.filter((x) => x !== r)
        : [...filter.riskLevels, r],
    });
  const toggleOperator = (o: string) =>
    setFilter({
      operators: filter.operators.includes(o)
        ? filter.operators.filter((x) => x !== o)
        : [...filter.operators, o],
    });

  const activeChips = [
    ...filter.statuses.map((s) => ({ key: `s-${s}`, label: STATUS_LABEL[s], onRemove: () => toggleStatus(s) })),
    ...filter.riskLevels.map((r) => ({ key: `r-${r}`, label: `风险:${r === "none" ? "无" : r === "low" ? "低" : "高"}`, onRemove: () => toggleRisk(r) })),
    ...filter.operators.map((o) => ({ key: `o-${o}`, label: `操作人:${o}`, onRemove: () => toggleOperator(o) })),
  ];

  return (
    <div className="card-base p-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-civic-600" />
        <span className="font-semibold text-sm text-neutral-800">筛选条件</span>
        <span className="text-xs text-neutral-500">
          共匹配 <span className="font-mono text-civic-600 font-bold">{filtered.length}</span> 条
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => selectAll(filtered.map((g) => g.groupId))}
            disabled={filtered.length === 0}
            className="btn-outline text-xs py-1.5"
          >
            <ListChecks className="w-3.5 h-3.5" />
            全选 ({selected.length}/{filtered.length})
          </button>
          <button
            onClick={() => {
              resetFilter();
            }}
            className="btn-outline text-xs py-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            重置
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-start gap-3">
          <span className="text-xs text-neutral-500 w-16 shrink-0 pt-1.5">归并状态</span>
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {ALL_STATUS.map((s) => {
              const active = filter.statuses.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={clsx(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-civic border text-xs transition-all",
                    active
                      ? "border-civic-400 bg-civic-50 text-civic-700 shadow-sm"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  <span className={clsx("w-2 h-2 rounded-full", STATUS_COLOR_DOT[s])} />
                  {STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-xs text-neutral-500 w-16 shrink-0 pt-1.5">风险等级</span>
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {ALL_RISK.map((r) => {
              const label = r === "none" ? "无风险" : r === "low" ? "低风险" : "高风险";
              const active = filter.riskLevels.includes(r);
              return (
                <button
                  key={r}
                  onClick={() => toggleRisk(r)}
                  className={clsx(
                    "px-2.5 py-1 rounded-civic border text-xs transition-all",
                    active
                      ? "border-civic-400 bg-civic-50 text-civic-700 shadow-sm"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-xs text-neutral-500 w-16 shrink-0 pt-1.5">操作人</span>
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {operators.map((o) => {
              const active = filter.operators.includes(o);
              return (
                <button
                  key={o}
                  onClick={() => toggleOperator(o)}
                  className={clsx(
                    "px-2.5 py-1 rounded-civic border text-xs transition-all",
                    active
                      ? "border-civic-400 bg-civic-50 text-civic-700 shadow-sm"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="mt-3 pt-3 border-t border-dashed border-neutral-200 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-neutral-400">已选条件:</span>
          {activeChips.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-civic-50 border border-civic-200 text-civic-700 text-xs rounded-civic"
            >
              {c.label}
              <button onClick={c.onRemove} className="hover:bg-civic-100 rounded-full">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
