import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  FilterX,
  AlertTriangle,
  ChevronRight,
  AlertOctagon,
  ShieldCheck,
  Clock,
  CheckCircle2,
  RefreshCw,
  FilePlus,
  UserCheck,
} from "lucide-react";
import { useRouteStore } from "@/store/routeStore";
import { RiskBadge, AnomalyBadge, StatusBar } from "@/components/Badges";
import type { RiskLevel, AnomalyType, ConfirmationStatus } from "@/types";
import { RISK_LABELS, ANOMALY_LABELS, STATUS_LABELS } from "@/types";

const riskLevels: RiskLevel[] = ["low", "medium", "high", "critical"];
const anomalyTypes: AnomalyType[] = [
  "camera_view_lost",
  "height_deviation",
  "coordinate_missing",
  "risk_note_conflict",
  "profile_incomplete",
];
const statuses: ConfirmationStatus[] = [
  "pending",
  "rerun_done",
  "supplemented",
  "manually_confirmed",
  "all_completed",
];

export default function RouteListPage() {
  const navigate = useNavigate();
  const {
    filters,
    toggleRiskFilter,
    toggleAnomalyFilter,
    toggleStatusFilter,
    setSearchQuery,
    setOnlyAnomalies,
    clearFilters,
    getFilteredRoutes,
  } = useRouteStore();

  const filtered = useMemo(() => getFilteredRoutes(), [getFilteredRoutes, filters]);

  const statusStepIcon = (s: ConfirmationStatus) => {
    switch (s) {
      case "rerun_done":
        return <RefreshCw className="w-3 h-3" />;
      case "supplemented":
        return <FilePlus className="w-3 h-3" />;
      case "manually_confirmed":
        return <UserCheck className="w-3 h-3" />;
      case "all_completed":
        return <CheckCircle2 className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const statusColor = (s: ConfirmationStatus) =>
    s === "all_completed"
      ? "tag-safe"
      : s === "pending"
      ? "tag-pending"
      : "tag-warning";

  return (
    <div className="min-h-screen bg-industrial-bg">
      <header className="px-6 py-4 border-b border-industrial-border/60 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold text-industrial-text">航线总览</h1>
          <p className="text-xs text-industrial-muted mt-0.5">
            共 {filtered.length} 条 · 筛选后显示
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-industrial-muted" />
            <input
              value={filters.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索航线编号 / 任务名称 / 数据源..."
              className="input-field !py-1.5 pl-8 pr-3 w-72 text-xs"
            />
          </div>
          <button
            onClick={() => navigate("/import")}
            className="btn btn-primary"
          >
            导入数据
          </button>
        </div>
      </header>

      <div className="px-6 py-3 border-b border-industrial-border/60 bg-industrial-panel/30">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer mr-2">
            <input
              type="checkbox"
              checked={filters.onlyAnomalies}
              onChange={(e) => setOnlyAnomalies(e.target.checked)}
              className="accent-status-danger"
            />
            <span className="text-xs text-industrial-text">仅显示异常</span>
          </label>

          <div className="w-px h-4 bg-industrial-border mx-1" />

          <span className="text-[10px] font-mono text-industrial-muted tracking-wider mr-1">
            风险
          </span>
          {riskLevels.map((l) => (
            <button
              key={l}
              onClick={() => toggleRiskFilter(l)}
              className={`tag font-mono text-xs transition-colors ${
                filters.riskLevels.includes(l)
                  ? l === "low"
                    ? "bg-status-safe/20 border-status-safe/50 text-status-safe"
                    : l === "medium"
                    ? "bg-status-warning/20 border-status-warning/50 text-status-warning"
                    : l === "high"
                    ? "bg-status-danger/20 border-status-danger/50 text-status-danger"
                    : "bg-status-critical/20 border-status-critical/50 text-status-critical"
                  : "bg-industrial-panel border-industrial-border text-industrial-muted hover:text-industrial-text"
              }`}
            >
              {RISK_LABELS[l]}
            </button>
          ))}

          <div className="w-px h-4 bg-industrial-border mx-1" />

          <span className="text-[10px] font-mono text-industrial-muted tracking-wider mr-1">
            异常
          </span>
          {anomalyTypes.map((t) => (
            <button
              key={t}
              onClick={() => toggleAnomalyFilter(t)}
              className={`tag font-mono text-xs transition-colors ${
                filters.anomalyTypes.includes(t)
                  ? "bg-status-danger/20 border-status-danger/50 text-status-danger"
                  : "bg-industrial-panel border-industrial-border text-industrial-muted hover:text-industrial-text"
              }`}
            >
              {ANOMALY_LABELS[t]}
            </button>
          ))}

          <div className="w-px h-4 bg-industrial-border mx-1" />

          <span className="text-[10px] font-mono text-industrial-muted tracking-wider mr-1">
            状态
          </span>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatusFilter(s)}
              className={`tag font-mono text-xs transition-colors ${
                filters.statuses.includes(s)
                  ? "bg-status-warning/20 border-status-warning/50 text-status-warning"
                  : "bg-industrial-panel border-industrial-border text-industrial-muted hover:text-industrial-text"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}

          {(filters.riskLevels.length > 0 ||
            filters.anomalyTypes.length > 0 ||
            filters.statuses.length > 0 ||
            filters.searchQuery ||
            filters.onlyAnomalies) && (
            <button
              onClick={clearFilters}
              className="ml-2 btn btn-default !py-1 !px-2 text-xs flex items-center gap-1"
            >
              <FilterX className="w-3 h-3" />
              清除筛选
            </button>
          )}
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-industrial-bg/60 text-xs text-industrial-muted font-mono">
                <th className="text-left px-4 py-2.5 w-1"></th>
                <th className="text-left px-2 py-2.5 font-medium">航线编号</th>
                <th className="text-left px-2 py-2.5 font-medium">任务名称</th>
                <th className="text-left px-2 py-2.5 font-medium">数据源</th>
                <th className="text-right px-2 py-2.5 font-medium">高度偏差</th>
                <th className="text-left px-2 py-2.5 font-medium">风险等级</th>
                <th className="text-left px-2 py-2.5 font-medium">异常</th>
                <th className="text-left px-2 py-2.5 font-medium">复核状态</th>
                <th className="text-right px-4 py-2.5 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => (
                <tr
                  key={r.id}
                  className={`border-t border-industrial-border/50 group hover:bg-industrial-border/20 cursor-pointer transition-colors ${
                    idx % 2 === 1 ? "bg-industrial-bg/30" : ""
                  }`}
                  onClick={() => navigate(`/routes/${r.id}`)}
                >
                  <td className="py-0">
                    <StatusBar level={r.anomalyTypes.length > 0 ? r.riskLevel : "default"} />
                  </td>
                  <td className="px-2 py-2.5 font-mono text-xs text-industrial-text">
                    {r.routeCode}
                  </td>
                  <td className="px-2 py-2.5 text-industrial-text">{r.missionName}</td>
                  <td className="px-2 py-2.5 text-xs text-industrial-muted max-w-[220px] truncate">
                    {r.dataSource}
                  </td>
                  <td
                    className={`px-2 py-2.5 text-right font-mono text-xs font-bold ${
                      r.heightDeviation > 15
                        ? "text-status-danger"
                        : r.heightDeviation > 8
                        ? "text-status-warning"
                        : "text-status-safe"
                    }`}
                  >
                    {r.heightDeviation > 15 ? (
                      <AlertOctagon className="w-3 h-3 inline mr-1" />
                    ) : r.heightDeviation > 8 ? (
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                    ) : (
                      <ShieldCheck className="w-3 h-3 inline mr-1" />
                    )}
                    {r.heightDeviation} m
                  </td>
                  <td className="px-2 py-2.5">
                    <RiskBadge level={r.riskLevel} />
                  </td>
                  <td className="px-2 py-2.5">
                    {r.anomalyTypes.length === 0 ? (
                      <span className="text-[10px] text-industrial-muted">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {r.anomalyTypes.slice(0, 2).map((t) => (
                          <AnomalyBadge key={t} type={t} />
                        ))}
                        {r.anomalyTypes.length > 2 && (
                          <span className="tag tag-danger font-mono">
                            +{r.anomalyTypes.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    <span className={`tag ${statusColor(r.status)} font-mono flex items-center gap-1 w-fit`}>
                      {statusStepIcon(r.status)}
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/routes/${r.id}`);
                      }}
                      className="text-industrial-muted hover:text-industrial-text transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-industrial-muted text-sm">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <div>没有符合筛选条件的航线数据</div>
                    <div className="text-xs mt-1">请调整筛选条件或导入新数据</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
