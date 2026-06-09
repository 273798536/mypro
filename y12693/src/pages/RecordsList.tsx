import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  AlertOctagon,
  Copy,
  Eye,
  Download,
  Search,
  FilterX,
  EyeOff,
} from "lucide-react";
import { useRecordsStore } from "../store/recordsStore";
import { api } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import { UNIT_LABELS, cn, formatDateTime } from "../lib/utils";
import type { RecordFilter } from "../../shared/types";

type FilterKey =
  | "hasUnitErrors"
  | "hasRiskNotes"
  | "hasDuplicate"
  | "isTransparentOcclusionMisread";

const FILTERS: { key: FilterKey; label: string; icon: any; color: string }[] = [
  { key: "hasUnitErrors", label: "单位换算错误", icon: AlertOctagon, color: "danger" },
  { key: "hasRiskNotes", label: "含风险备注", icon: AlertTriangle, color: "warning" },
  { key: "hasDuplicate", label: "重复导入", icon: Copy, color: "warning" },
  { key: "isTransparentOcclusionMisread", label: "透明遮挡误读", icon: EyeOff, color: "danger" },
];

export default function RecordsList() {
  const nav = useNavigate();
  const { records, filter, fetchRecords, loading } = useRecordsStore();
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const toggleFilter = (k: FilterKey) => {
    const v = filter[k] === true ? undefined : true;
    fetchRecords({ [k]: v } as RecordFilter);
  };

  const activeFilterCount = Object.values(filter).filter(Boolean).length;

  const clearFilters = () => {
    useRecordsStore.setState({ filter: {} });
    fetchRecords({});
  };

  const visible = records.filter(
    (r) =>
      !search ||
      r.fixtureName.toLowerCase().includes(search.toLowerCase()) ||
      r.coords.fixtureId.toLowerCase().includes(search.toLowerCase()) ||
      r.batchNo.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: records.length,
    errors: records.filter((r) => r.unitErrors.length > 0).length,
    dup: records.filter((r) => r.hasDuplicate).length,
    risk: records.filter((r) => r.riskNotes.length > 0).length,
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto">
      <div className="max-w-[1600px] mx-auto p-6 space-y-5">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-text-primary">
              预演记录列表
            </h1>
            <p className="text-sm text-text-secondary mt-1 font-mono">
              全量复核入口 · 按条件筛选坏记录并进入详情修正
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={api.exportUrl("csv")}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出 CSV
            </a>
            <a
              href={api.exportUrl("json")}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出 JSON
            </a>
          </div>
        </header>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "总记录数", v: stats.total, c: "text-text-primary" },
            { label: "单位换算错误", v: stats.errors, c: "text-danger" },
            { label: "风险备注", v: stats.risk, c: "text-warning" },
            { label: "重复导入", v: stats.dup, c: "text-warning" },
          ].map((s) => (
            <div key={s.label} className="panel p-4">
              <div className="text-xs text-text-muted font-mono">{s.label}</div>
              <div className={cn("font-display text-3xl font-bold mt-1", s.c)}>
                {s.v}
              </div>
            </div>
          ))}
        </div>

        <div className="panel p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                className="input-base w-full pl-10"
                placeholder="搜索灯具名称 / 编号 / 批次号..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="btn-secondary flex items-center gap-2">
                <FilterX className="w-4 h-4" />
                清除筛选 ({activeFilterCount})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter[f.key] === true;
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  onClick={() => toggleFilter(f.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm transition-all duration-200",
                    active
                      ? f.color === "danger"
                        ? "bg-danger-bg border-danger/50 text-danger shadow-glow-danger"
                        : "bg-warning-bg border-warning/50 text-warning"
                      : "bg-bg-tertiary border-border text-text-secondary hover:border-accent/50 hover:text-text-primary"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-tertiary/50 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-text-secondary w-10"></th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">灯具</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">批次</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">坐标</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">问题</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">状态</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">更新时间</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary w-16"></th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-text-muted">
                      {loading ? "加载中..." : "无匹配记录"}
                    </td>
                  </tr>
                )}
                {visible.map((r) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b border-border/60 hover:bg-bg-tertiary/40 transition-colors cursor-pointer group",
                      r.unitErrors.length > 0 &&
                        "bg-gradient-to-r from-danger-bg/40 to-transparent",
                      r.hasDuplicate && "border-l-4 border-l-warning"
                    )}
                    onClick={() => nav(`/records/${r.id}`)}
                  >
                    <td className="px-4 py-3">
                      {r.hasDuplicate && (
                        <span title="重复导入">
                          <Copy className="w-4 h-4 text-warning" />
                        </span>
                      )}
                      {r.isTransparentOcclusionMisread && (
                        <span title="透明遮挡误读记录">
                          <EyeOff className="w-4 h-4 text-danger" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-primary">{r.fixtureName}</div>
                      <div className="text-xs text-text-muted font-mono">
                        {r.coords.fixtureId}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                      {r.batchNo}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <div className="text-text-secondary">
                        X:{r.coords.x} Y:{r.coords.y} Z:{r.coords.z}
                      </div>
                      <div className="text-text-muted">{UNIT_LABELS[r.coords.unit]}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.unitErrors.length > 0 && (
                          <span className="tag border bg-danger-bg border-danger/40 text-danger">
                            <AlertOctagon className="w-3 h-3 mr-1" />
                            {r.unitErrors.length} 单位错误
                          </span>
                        )}
                        {r.riskNotes.length > 0 && (
                          <span className="tag border bg-warning-bg border-warning/40 text-warning">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {r.riskNotes.length} 风险
                          </span>
                        )}
                        {r.conclusions.length > 0 && (
                          <span className="tag border bg-success/10 border-success/30 text-success">
                            {r.conclusions.length} 结论
                          </span>
                        )}
                        {r.unitErrors.length === 0 &&
                          r.riskNotes.length === 0 &&
                          r.conclusions.length === 0 && (
                            <span className="text-text-muted text-xs">—</span>
                          )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted font-mono">
                      {formatDateTime(r.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="p-1.5 rounded hover:bg-accent/20 text-text-muted hover:text-accent transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          nav(`/records/${r.id}`);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
