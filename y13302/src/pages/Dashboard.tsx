import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileCheck2,
  ThumbsUp,
  Undo2,
  Activity,
  ArrowRight,
  AlertCircle,
  Filter,
} from "lucide-react";
import MetricCard from "@/components/MetricCard/MetricCard";
import ThresholdAlert from "@/components/ThresholdAlert/ThresholdAlert";
import QuickNav from "@/components/QuickNav/QuickNav";
import { StatusTag, SourceTag, WeightTag } from "@/components/StatusTag/StatusTag";
import { useAppStore } from "@/store/useAppStore";
import { formatDate } from "@/utils/helpers";

export default function Dashboard() {
  const init = useAppStore((s) => s.init);
  const getMetrics = useAppStore((s) => s.getMetrics);
  const getFilteredOrders = useAppStore((s) => s.getFilteredOrders);
  const setSelectedOrderId = useAppStore((s) => s.setSelectedOrderId);
  const data = useAppStore((s) => s.data);
  const navigate = useNavigate();

  useEffect(() => {
    init();
  }, [init]);

  const metrics = useMemo(() => getMetrics(), [getMetrics, data]);
  const pendingList = useMemo(
    () => getFilteredOrders().filter((o) => o.status === "pending").slice(0, 6),
    [getFilteredOrders, data]
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <p className="text-sm text-navy-500">早会面板 · 2026年6月18日</p>
          <h2 className="mt-1 text-2xl font-serif font-semibold text-navy-800">
            客服摘要人工改判工作台
          </h2>
          <p className="mt-1 text-sm text-navy-600">
            导入、确认、撤回、截图说明统一管理，阈值漂移告警与处理指引一目了然。
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="今日改判量"
          value={metrics.today_judgement_count}
          unit="条"
          icon={FileCheck2}
          colorClass="from-navy-50 to-white"
          trend={{ direction: "up", value: "较昨日 +3", positive: true }}
          subtitle="含确认/撤回/修改"
        />
        <MetricCard
          title="确认率"
          value={metrics.confirm_rate}
          unit="%"
          icon={ThumbsUp}
          colorClass="from-moss-50 to-white"
          subtitle="人工确认后通过的比例"
        />
        <MetricCard
          title="撤回率"
          value={metrics.revoke_rate}
          unit="%"
          icon={Undo2}
          colorClass="from-crimson-50 to-white"
          subtitle="需重新判定的操作"
        />
        <MetricCard
          title="阈值健康度"
          value={metrics.threshold_health}
          unit="%"
          icon={Activity}
          colorClass="from-amber-50 to-white"
          subtitle="已处理的受影响记录占比"
          pulse={metrics.affected_by_threshold > 0}
        />
      </div>

      <ThresholdAlert affectedCount={metrics.affected_by_threshold} />

      <div>
        <h3 className="text-sm font-semibold text-navy-700 mb-3 flex items-center gap-2">
          <Filter className="w-4 h-4" strokeWidth={1.75} />
          算法值班人快速导航
        </h3>
        <QuickNav />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 card animate-fade-in-up stagger-4">
          <header className="p-5 border-b border-navy-50 flex items-center justify-between">
            <div>
              <h3 className="font-serif font-semibold text-navy-800 text-lg">
                待办改判队列
              </h3>
              <p className="mt-1 text-xs text-navy-500">
                共 {pendingList.length} 条待处理，按影响度与创建时间排序
              </p>
            </div>
            <button
              onClick={() => navigate("/workbench")}
              className="btn-secondary text-xs"
            >
              前往工作台
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </header>

          <ul className="divide-y divide-navy-50">
            {pendingList.length === 0 && (
              <li className="p-10 text-center text-sm text-navy-500">
                🎉 暂无待处理工单，干得漂亮！
              </li>
            )}
            {pendingList.map((o, i) => (
              <li
                key={o.id}
                onClick={() => {
                  setSelectedOrderId(o.id);
                  navigate("/workbench");
                }}
                className={`p-4 hover:bg-navy-50/50 cursor-pointer transition-colors animate-fade-in-up stagger-${Math.min(
                  i + 1,
                  6
                )}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <StatusTag status={o.status} />
                      <SourceTag source={o.source_type} />
                      {o.threshold_affected && (
                        <span className="chip bg-amber-50 text-amber-700 border border-amber-200/60 gap-1">
                          <AlertCircle
                            className="w-3 h-3"
                            strokeWidth={2}
                          />
                          阈值漂移
                        </span>
                      )}
                      <WeightTag weight={o.impact_weight} />
                    </div>
                    <p className="font-medium text-navy-800 text-sm truncate">
                      {o.title}
                    </p>
                    <p className="mt-1 text-xs text-navy-500 line-clamp-2">
                      {o.model_summary}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-navy-400">{formatDate(o.created_at)}</p>
                    <p className="mt-1 text-[11px] text-navy-400 font-mono">
                      置信度 {(o.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="card animate-fade-in-up stagger-5">
          <header className="p-5 border-b border-navy-50">
            <h3 className="font-serif font-semibold text-navy-800 text-lg">
              样本构成速览
            </h3>
            <p className="mt-1 text-xs text-navy-500">
              全部 {data.work_orders.length} 条工单按来源分布
            </p>
          </header>
          <div className="p-5 space-y-4">
            {[
              {
                label: "线上工单",
                count: data.work_orders.filter(
                  (o) => o.source_type === "online_ticket"
                ).length,
                color: "bg-navy-500",
                textColor: "text-navy-700",
                bg: "bg-navy-50",
              },
              {
                label: "异常样本（名称不一致）",
                count: data.work_orders.filter(
                  (o) => o.source_type === "anomaly"
                ).length,
                color: "bg-crimson-500",
                textColor: "text-crimson-700",
                bg: "bg-crimson-50",
              },
              {
                label: "后补说明",
                count: data.work_orders.filter(
                  (o) => o.source_type === "supplement"
                ).length,
                color: "bg-purple-500",
                textColor: "text-purple-700",
                bg: "bg-purple-50",
              },
            ].map((row) => {
              const total = Math.max(data.work_orders.length, 1);
              const pct = Math.round((row.count / total) * 100);
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className={`font-medium ${row.textColor}`}>
                      {row.label}
                    </span>
                    <span className={row.textColor}>
                      {row.count} 条 · {pct}%
                    </span>
                  </div>
                  <div className={`h-2 rounded-full ${row.bg} overflow-hidden`}>
                    <div
                      className={`h-full ${row.color} rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="mt-6 pt-5 border-t border-navy-50">
              <div className="rounded-xl bg-gradient-to-br from-navy-50 to-white border border-navy-100 p-4">
                <p className="text-xs font-semibold text-navy-700 uppercase tracking-wide mb-2">
                  评审追问小贴士
                </p>
                <p className="text-xs text-navy-600 leading-relaxed">
                  当算法值班人问「哪几条样本把结论拉偏了？」，直接去
                  <span className="mx-1 font-medium text-navy-800">
                    评审分析 → 拉偏样本列表
                  </span>
                  ，按影响度权重逐条念就能解释清楚。
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
