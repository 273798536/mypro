import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  PauseCircle,
  CheckCircle2,
  History,
  ChevronRight,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { useAppStore } from "@/store";
import PageHeader from "@/components/PageHeader";
import { PlanStatusBadge } from "@/components/Badges";
import { formatDateTime } from "@/utils/helpers";

export default function Dashboard() {
  const feedbacks = useAppStore((s) => s.feedbacks);
  const plans = useAppStore((s) => s.plans);
  const pendingPairs = useAppStore((s) => s.locationPairs.filter((p) => !p.reviewed).length);
  const importFeedbacks = useAppStore((s) => s.importFeedbacks);

  const stats = useMemo(() => {
    const suspended = feedbacks.filter((f) => f.status === "suspended").length;
    const withdrawn = feedbacks.filter((f) => f.status === "withdrawn").length;
    const active = feedbacks.filter((f) => f.status === "active").length;
    const today = new Date().toDateString();
    const todayChanged = plans.filter(
      (p) => new Date(p.updatedAt).toDateString() === today,
    ).length;
    return { suspended, withdrawn, active, pendingPairs, total: feedbacks.length, todayChanged, confirmedPlans: plans.filter((p) => p.status === "confirmed" || p.status === "reviewing").length };
  }, [feedbacks, plans, pendingPairs]);

  const anomalyPlans = plans.filter((p) => p.schemes.some((s) => s.isAnomaly));

  function loadDemoData() {
    importFeedbacks([
      {
        locationName: "和平路与建设大街交叉口东北角",
        content: "路口东北角雨水口堵塞严重，下雨积水深约20cm，影响行人通行",
        source: "12345热线",
        reporterName: "张女士",
        lng: 116.407,
        lat: 39.904,
        status: "active",
      },
      {
        locationName: "和平路建设大街东北角",
        content: "和平路建设大街东北角下雨就积水，已经反映过两次了",
        source: "微信公众号",
        reporterName: "李先生",
        lng: 116.4075,
        lat: 39.9042,
        status: "active",
      },
      {
        locationName: "和平路建设大街交口东北",
        content: "上次反映的积水问题还是没彻底解决，希望能从根上处理",
        source: "现场巡查",
        lng: 116.4072,
        lat: 39.9041,
        status: "active",
      },
      {
        locationName: "人民路56号门口",
        content: "人民路56号门口雨水口被落叶和淤泥堵了，下雨满街流",
        source: "12345热线",
        reporterName: "王师傅",
        lng: 116.421,
        lat: 39.912,
        status: "active",
      },
      {
        locationName: "人民街56号门前",
        content: "门前雨水口积淤，请尽快清掏",
        source: "网格员上报",
        lng: 116.4211,
        lat: 39.9119,
        status: "active",
      },
      {
        locationName: "中山路体育大街西南角",
        content: "西南角雨水口积淤，雨天积水影响公交站台",
        source: "12345热线",
        lng: 116.395,
        lat: 39.920,
        status: "pending",
      },
    ]);
  }

  const maxCost = Math.max(...plans.flatMap((p) => p.schemes.map((s) => s.cost)), 1);

  return (
    <div>
      <PageHeader
        title="雨水口积淤方案比选 · 总览"
        subtitle="图表服务复核，点击异常点可追溯原始居民反馈与计算口径"
        actions={
          plans.length === 0 ? (
            <button onClick={loadDemoData} className="btn-primary">
              <History size={16} /> 导入演示旧材料
            </button>
          ) : null
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<MapPin size={20} />}
          color="municipal"
          label="待归并地点"
          value={stats.pendingPairs}
          hint="疑似重复名称需人工确认"
        />
        <StatCard
          icon={<PauseCircle size={20} />}
          color="warning"
          label="挂起待确认投诉"
          value={stats.suspended}
          hint="排班同事确认后可解除"
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          color="success"
          label="复核中方案"
          value={stats.confirmedPlans}
          hint={`今日变更 ${stats.todayChanged} 个`}
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          color="municipal"
          label="有效反馈总数"
          value={stats.active}
          hint={`共 ${stats.total} 条（已撤回 ${stats.withdrawn}）`}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {plans.length === 0 && (
          <div className="col-span-3 card p-12 text-center text-municipal-400">
            <p className="text-sm">暂无数据</p>
            <p className="text-xs mt-1">请点击右上角「导入演示旧材料」开始体验完整流程</p>
          </div>
        )}
        {plans.map((plan) => {
          const loc = useAppStore.getState().locations.find((l) => l.id === plan.locationId);
          return (
            <Link
              key={plan.id}
              to={`/plans/${plan.id}`}
              className="card p-5 hover:shadow-card-hover transition-shadow block"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-serif text-base font-semibold text-municipal-800 flex items-center gap-2">
                    {loc?.canonicalName ?? "未知地点"}
                    {plan.schemes.some((s) => s.isAnomaly) && (
                      <span className="inline-flex items-center gap-1 text-xs text-danger-600 bg-danger-50 px-1.5 py-0.5 rounded animate-pulse-border border border-danger-200">
                        <AlertTriangle size={12} /> 异常
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-municipal-500 mt-1 flex items-center gap-3">
                    <PlanStatusBadge status={plan.status} />
                    <span>更新于 {formatDateTime(plan.updatedAt)}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-municipal-300" />
              </div>

              <div className="space-y-2.5">
                {plan.schemes.map((scheme) => {
                  const widthPct = (scheme.cost / maxCost) * 100;
                  const isAnomaly = scheme.isAnomaly;
                  return (
                    <div
                      key={scheme.id}
                      className={`relative p-2.5 rounded border ${
                        isAnomaly
                          ? "border-danger-300 bg-danger-50/40"
                          : "border-municipal-100 bg-municipal-50/40"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className={`font-medium ${isAnomaly ? "text-danger-700" : "text-municipal-700"}`}>
                          {scheme.name}
                        </span>
                        <span className={`font-mono ${isAnomaly ? "text-danger-600" : "text-municipal-600"}`}>
                          ¥{scheme.cost.toLocaleString()} · {scheme.duration}天 · 效果{(scheme.effectiveness * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-municipal-100 rounded overflow-hidden">
                        <div
                          className={`h-full rounded ${
                            isAnomaly ? "bg-danger-500" : "bg-municipal-500"
                          }`}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      {isAnomaly && scheme.anomalyReason && (
                        <p className="text-[11px] text-danger-600 mt-1">⚠ {scheme.anomalyReason}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-municipal-100 flex items-center justify-between text-xs text-municipal-500">
                <span>风险指数 <span className="font-mono font-medium text-municipal-700">{plan.currentCalculation.parameters.riskIndex.toFixed(2)}</span></span>
                <span>基于 {plan.currentCalculation.sourceFeedbackIds.length} 条反馈</span>
              </div>
            </Link>
          );
        })}
      </div>

      {anomalyPlans.length > 0 && (
        <div className="card p-4 border-warning-300 bg-warning-50/30">
          <div className="flex items-center gap-2 text-warning-700 text-sm font-medium mb-2">
            <AlertTriangle size={16} /> 异常方案提示（{anomalyPlans.length}）
          </div>
          <ul className="text-xs text-municipal-700 space-y-1">
            {anomalyPlans.flatMap((p) =>
              p.schemes.filter((s) => s.isAnomaly).map((s) => {
                const loc = useAppStore.getState().locations.find((l) => l.id === p.locationId);
                return (
                  <li key={`${p.id}-${s.id}`} className="flex items-center gap-2">
                    <Link to={`/plans/${p.id}`} className="text-municipal-700 hover:text-municipal-500 underline underline-offset-2">
                      {loc?.canonicalName}
                    </Link>
                    <span>→</span>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-municipal-500">：{s.anomalyReason}</span>
                  </li>
                );
              }),
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  color,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  color: "municipal" | "warning" | "success" | "danger";
  label: string;
  value: number;
  hint: string;
}) {
  const colorMap = {
    municipal: { bg: "bg-municipal-600", text: "text-municipal-700", light: "bg-municipal-50" },
    warning: { bg: "bg-warning-500", text: "text-warning-700", light: "bg-warning-50" },
    success: { bg: "bg-success-500", text: "text-success-700", light: "bg-success-50" },
    danger: { bg: "bg-danger-500", text: "text-danger-700", light: "bg-danger-50" },
  }[color];
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-municipal-500 mb-1">{label}</div>
          <div className={`font-serif text-3xl font-semibold ${colorMap.text}`}>{value}</div>
          <div className="text-[11px] text-municipal-400 mt-1.5">{hint}</div>
        </div>
        <div className={`w-9 h-9 rounded ${colorMap.bg} text-white flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
