import { Link } from "react-router-dom";
import { FileBarChart, ChevronRight, AlertTriangle, RefreshCw } from "lucide-react";
import { useAppStore } from "@/store";
import PageHeader from "@/components/PageHeader";
import { PlanStatusBadge } from "@/components/Badges";
import { formatDateTime } from "@/utils/helpers";

export default function PlanList() {
  const plans = useAppStore((s) => s.plans);
  const locations = useAppStore((s) => s.locations);
  const recalculatePlan = useAppStore((s) => s.recalculatePlan);

  return (
    <div>
      <PageHeader
        title="雨水口积淤方案比选"
        subtitle="点击方案卡片查看详情、追溯计算口径与变更历史"
      />

      {plans.length === 0 && (
        <div className="card p-16 text-center text-municipal-400">
          <FileBarChart size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">暂无方案</p>
          <p className="text-xs mt-1">导入居民反馈后系统会自动为每个地点生成比选方案</p>
        </div>
      )}

      <div className="space-y-3">
        {plans.map((plan) => {
          const loc = locations.find((l) => l.id === plan.locationId);
          const hasAnomaly = plan.schemes.some((s) => s.isAnomaly);
          const lastSnapshot = plan.snapshots[plan.snapshots.length - 1];
          return (
            <Link key={plan.id} to={`/plans/${plan.id}`} className="card p-4 flex items-center gap-4 hover:shadow-card-hover transition-shadow block">
              <div className={`w-12 h-12 rounded flex items-center justify-center ${hasAnomaly ? "bg-danger-100 text-danger-600" : "bg-municipal-100 text-municipal-600"}`}>
                <FileBarChart size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-base font-semibold text-municipal-800">
                    {loc?.canonicalName ?? "未知地点"}
                  </span>
                  <PlanStatusBadge status={plan.status} />
                  {hasAnomaly && (
                    <span className="inline-flex items-center gap-1 text-xs text-danger-600 bg-danger-50 px-1.5 py-0.5 rounded animate-pulse-border border border-danger-200">
                      <AlertTriangle size={12} /> 存在异常方案
                    </span>
                  )}
                </div>
                <div className="text-xs text-municipal-500 mt-1 flex items-center gap-3">
                  <span>风险指数 <span className="font-mono font-medium text-municipal-700">{plan.currentCalculation.parameters.riskIndex.toFixed(2)}</span></span>
                  <span>基于 {plan.currentCalculation.sourceFeedbackIds.length} 条反馈</span>
                  <span>共 {plan.schemes.length} 个方案 · {plan.versions.length} 次版本变更 · {plan.snapshots.length} 条变更快照</span>
                </div>
                {lastSnapshot && (
                  <div className="text-[11px] text-municipal-400 mt-1 truncate">
                    最近变更：{lastSnapshot.title} — {formatDateTime(lastSnapshot.createdAt)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                <button
                  className="btn-secondary !py-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("确认基于当前反馈重新计算方案？旧版本将保留。")) recalculatePlan(plan.id);
                  }}
                >
                  <RefreshCw size={13} /> 重算
                </button>
                <ChevronRight size={18} className="text-municipal-300" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
