import { Search, X, RotateCcw } from "lucide-react";
import { useTopologyStore, statusLabel, changeSourceLabel } from "../store/topologyStore";
import { useMemo } from "react";

export default function FilterBar() {
  const { filters, setFilters, resetFilters, records } = useTopologyStore();

  const parameterVersions = useMemo(
    () => Array.from(new Set(records.map((r) => r.parameterVersion))).sort(),
    [records]
  );
  const materialBatches = useMemo(
    () => Array.from(new Set(records.map((r) => r.materialBatch))).sort(),
    [records]
  );

  const statusOpts = [
    { v: "all", l: "全部状态" },
    { v: "pending", l: statusLabel("pending") },
    { v: "verified", l: statusLabel("verified") },
    { v: "warning", l: statusLabel("warning") },
    { v: "error", l: statusLabel("error") },
    { v: "re_run", l: statusLabel("re_run") },
  ];
  const changeSourceOpts = [
    { v: "all", l: "全部变化来源" },
    { v: "unit", l: changeSourceLabel("unit") },
    { v: "parameter", l: changeSourceLabel("parameter") },
    { v: "sample", l: changeSourceLabel("sample") },
    { v: "unknown", l: changeSourceLabel("unknown") },
  ];
  const boolOpts: Array<{ v: boolean | "all"; l: string }> = [
    { v: "all", l: "不限" },
    { v: true, l: "是" },
    { v: false, l: "否" },
  ];

  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (k === "keyword") return v !== "";
    return v !== "all";
  }).length;

  const selectCls =
    "h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400";

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={filters.keyword}
            onChange={(e) => setFilters({ keyword: e.target.value })}
            placeholder="搜索样本编号 / 路径 / 拓扑名称 / 材料批次 / 操作人..."
            className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white transition"
          />
          {filters.keyword && (
            <button
              onClick={() => setFilters({ keyword: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value as typeof filters.status })}
          className={selectCls}
        >
          {statusOpts.map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>

        <select
          value={filters.changeSource}
          onChange={(e) =>
            setFilters({ changeSource: e.target.value as typeof filters.changeSource })
          }
          className={selectCls}
        >
          {changeSourceOpts.map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>

        <select
          value={filters.parameterVersion}
          onChange={(e) => setFilters({ parameterVersion: e.target.value })}
          className={selectCls}
        >
          <option value="all">全部参数版本</option>
          {parameterVersions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>

        <select
          value={filters.hasLateAttachment as string}
          onChange={(e) =>
            setFilters({
              hasLateAttachment:
                e.target.value === "all" ? "all" : e.target.value === "true",
            })
          }
          className={selectCls}
        >
          <option value="all">含晚到附件</option>
          {boolOpts.map((o) => (
            <option key={String(o.v)} value={String(o.v)}>
              {o.l}
            </option>
          ))}
        </select>

        <select
          value={filters.hasNoConflict as string}
          onChange={(e) =>
            setFilters({
              hasNoConflict:
                e.target.value === "all" ? "all" : e.target.value === "true",
            })
          }
          className={selectCls}
        >
          <option value="all">编号一致性</option>
          <option value="true">仅无冲突</option>
          <option value="false">仅编号冲突</option>
        </select>

        <select
          value={filters.materialBatch}
          onChange={(e) => setFilters({ materialBatch: e.target.value })}
          className={selectCls}
        >
          <option value="all">全部材料批次</option>
          {materialBatches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          {activeCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              已启用 {activeCount} 个筛选条件
            </span>
          )}
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" /> 重置
          </button>
        </div>
      </div>
    </section>
  );
}
