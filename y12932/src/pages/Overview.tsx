import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboardStore } from "@/store/useDashboardStore";
import {
  deriveOverviewKpi,
  deriveVersionTrend,
  deriveGroupMetrics,
  anomalyTypeLabel,
  type GroupRow,
} from "@/store/selectors";
import { StatCard } from "@/components/ui/StatCard";
import { MiniTrend, type TrendMetric } from "@/components/ui/MiniTrend";
import { Badge } from "@/components/ui/Badge";
import { ShieldAlert, Activity, GitCompare, Boxes, ArrowRight } from "lucide-react";

function HeatCell({ value, kind }: { value: number; kind: "rate" | "count" }) {
  if (kind === "count" && value === 0) {
    return <span className="font-mono text-faint">0</span>;
  }
  const intensity = kind === "rate" ? value : Math.min(1, value / 3);
  const bg =
    kind === "rate"
      ? `rgba(245,165,36,${0.08 + intensity * 0.32})`
      : value > 0
        ? `rgba(244,63,94,${0.1 + intensity * 0.3})`
        : "transparent";
  const textColor = kind === "rate" && value >= 0.5 ? "#fcd34d" : "#f4ede2";
  return (
    <span
      className="inline-flex min-w-[2.5rem] justify-center rounded px-2 py-0.5 font-mono text-xs tabular"
      style={{ background: bg, color: textColor }}
    >
      {kind === "rate" ? `${Math.round(value * 100)}%` : value}
    </span>
  );
}

export default function Overview() {
  const navigate = useNavigate();
  const versions = useDashboardStore((s) => s.versions);
  const samples = useDashboardStore((s) => s.samples);
  const anomalies = useDashboardStore((s) => s.anomalies);
  const currentId = useDashboardStore((s) => s.currentVersionId);

  const [trendMetric, setTrendMetric] = useState<TrendMetric>("boundaryCount");

  const trend = useMemo(() => deriveVersionTrend(versions, samples), [versions, samples]);
  const currentIdx = trend.findIndex((t) => t.versionId === currentId);
  const prev = currentIdx > 0 ? trend[currentIdx - 1] : undefined;
  const curr = trend[currentIdx];

  const kpi = useMemo(() => deriveOverviewKpi(currentId, samples), [currentId, samples]);
  const groups = useMemo(() => deriveGroupMetrics(currentId, samples), [currentId, samples]);
  const versionAnomalies = anomalies.filter((a) => a.versionId === currentId);

  const trendFor = (m: "boundaryCount" | "leakageCount" | "correctionRate" | "refusalRate") => {
    if (!prev) return undefined;
    const cur = curr[m];
    const p = prev[m];
    const diff = cur - p;
    const good =
      m === "refusalRate" || m === "correctionRate"
        ? diff >= 0
        : diff <= 0;
    return {
      dir: diff > 0 ? "up" : diff < 0 ? "down" : "flat",
      delta:
        m === "boundaryCount" || m === "leakageCount"
          ? `${diff > 0 ? "+" : ""}${diff}`
          : `${diff > 0 ? "+" : ""}${Math.round(diff * 100)}%`,
      good,
    } as const;
  };

  const metricButtons: { key: TrendMetric; label: string }[] = [
    { key: "boundaryCount", label: "边界样本" },
    { key: "refusalRate", label: "拒答率" },
    { key: "correctionRate", label: "修正率" },
    { key: "leakageCount", label: "泄漏样本" },
  ];

  return (
    <div className="mx-auto max-w-[1280px] animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Refusal Boundary · Overview</div>
          <h1 className="mt-1 font-display text-3xl tracking-tightish text-cream">
            总览看板
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            {versions.find((v) => v.id === currentId)?.notes}
          </p>
        </div>
        <Badge tone="signal" dot>
          当前版本 {currentId}
        </Badge>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 stagger">
        <StatCard
          label="拒答率"
          value={kpi.refusalRate * 100}
          suffix="%"
          decimals={0}
          tone="safe"
          icon={<Activity className="h-4 w-4" />}
          trend={trendFor("refusalRate")}
          hint={`共 ${kpi.total} 条样本`}
        />
        <StatCard
          label="边界样本数"
          value={kpi.boundaryCount}
          tone="signal"
          icon={<GitCompare className="h-4 w-4" />}
          trend={trendFor("boundaryCount")}
          hint="|分数−0.5| ≤ 0.06 视为边界"
        />
        <StatCard
          label="人工修正率"
          value={kpi.correctionRate * 100}
          suffix="%"
          decimals={0}
          tone="info"
          icon={<ArrowRight className="h-4 w-4" />}
          trend={trendFor("correctionRate")}
          hint={`待修正 ${kpi.pendingCount} 条`}
        />
        <StatCard
          label="泄漏样本数"
          value={kpi.leakageCount}
          tone="critical"
          icon={<ShieldAlert className="h-4 w-4" />}
          trend={trendFor("leakageCount")}
          hint="命中训练验证泄漏"
        />
      </div>

      {/* Trend + Anomalies */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-cream">版本趋势</h2>
            <div className="flex flex-wrap gap-1">
              {metricButtons.map((b) => (
                <button
                  key={b.key}
                  onClick={() => setTrendMetric(b.key)}
                  className={
                    "rounded-md border px-2.5 py-1 font-mono text-xs transition-colors " +
                    (trendMetric === b.key
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                      : "border-edge2 text-muted hover:text-cream")
                  }
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <MiniTrend points={trend} metric={trendMetric} />
          </div>
        </div>

        {/* Anomaly list */}
        <div className="card flex flex-col p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-cream">异常清单</h2>
            <Badge tone="critical">{versionAnomalies.length}</Badge>
          </div>
          <p className="mt-1 text-xs text-faint">点击顺着异常往回查样本与处理意见</p>
          <div className="mt-3 flex-1 space-y-2">
            {versionAnomalies.length === 0 && (
              <p className="py-8 text-center text-sm text-faint">本版本无异常</p>
            )}
            {versionAnomalies.map((a) => {
              const sample = samples.find((s) => s.id === a.sampleId);
              return (
                <button
                  key={a.id}
                  onClick={() => navigate(`/samples/${a.sampleId}`)}
                  className="row-hover group flex w-full items-start gap-3 rounded-lg border border-edge2/50 p-3 text-left"
                >
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-cream">{a.id}</span>
                      <Badge tone="muted">{anomalyTypeLabel(a.type)}</Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted">{a.description}</p>
                    <p className="mt-1 font-mono text-[0.65rem] text-faint">
                      样本 {sample?.id} · {sample?.group}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-amber-300" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Group metrics matrix */}
      <div className="card p-5">
        <div className="flex items-center gap-2">
          <Boxes className="h-4 w-4 text-amber-300" />
          <h2 className="font-display text-lg text-cream">分组指标矩阵</h2>
        </div>
        <p className="mt-1 text-xs text-faint">按业务线/风险类目拆分，数值越大颜色越深</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-edge2/60 text-left">
                <th className="py-2.5 pr-4 eyebrow !text-muted">分组</th>
                <th className="px-3 py-2.5 eyebrow !text-muted">样本数</th>
                <th className="px-3 py-2.5 eyebrow !text-muted">拒答率</th>
                <th className="px-3 py-2.5 eyebrow !text-muted">修正率</th>
                <th className="px-3 py-2.5 eyebrow !text-muted">边界数</th>
                <th className="px-3 py-2.5 eyebrow !text-muted">泄漏数</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g: GroupRow) => (
                <tr key={g.group} className="row-hover border-b border-edge2/30">
                  <td className="py-2.5 pr-4">
                    <span className="text-cream">{g.group}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-muted">{g.total}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <HeatCell value={g.refusalRate} kind="rate" />
                  </td>
                  <td className="px-3 py-2.5">
                    <HeatCell value={g.correctionRate} kind="rate" />
                  </td>
                  <td className="px-3 py-2.5">
                    <HeatCell value={g.boundaryCount} kind="count" />
                  </td>
                  <td className="px-3 py-2.5">
                    <HeatCell value={g.leakageCount} kind="count" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
