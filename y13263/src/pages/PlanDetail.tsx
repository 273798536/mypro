import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Calculator,
  AlertTriangle,
  Camera,
  Clock,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  Minus,
  PlayCircle,
  RefreshCw,
  MapPin,
} from "lucide-react";
import { useAppStore } from "@/store";
import PageHeader from "@/components/PageHeader";
import { PlanStatusBadge, StatusBadge, EventBadge, eventBorder } from "@/components/Badges";
import { formatDateTime } from "@/utils/helpers";
import type { PlanScheme } from "@/types";

export default function PlanDetail() {
  const { id } = useParams();
  const plans = useAppStore((s) => s.plans);
  const feedbacks = useAppStore((s) => s.feedbacks);
  const locations = useAppStore((s) => s.locations);
  const recalculatePlan = useAppStore((s) => s.recalculatePlan);
  const confirmSuspended = useAppStore((s) => s.confirmSuspended);

  const plan = plans.find((p) => p.id === id);
  const [selectedScheme, setSelectedScheme] = useState<PlanScheme | null>(null);
  const [openSnapshots, setOpenSnapshots] = useState<Record<string, boolean>>({});

  const loc = useMemo(
    () => locations.find((l) => l.id === plan?.locationId),
    [locations, plan],
  );

  const planFeedbacks = useMemo(
    () => (plan ? feedbacks.filter((f) => f.locationId === plan.locationId) : []),
    [feedbacks, plan],
  );

  const activeFeedbacks = useMemo(
    () => planFeedbacks.filter((f) => f.status !== "withdrawn"),
    [planFeedbacks],
  );

  const suspendedFeedbacks = useMemo(
    () => planFeedbacks.filter((f) => f.status === "suspended"),
    [planFeedbacks],
  );

  const maxCost = Math.max(...(plan?.schemes.map((s) => s.cost) ?? [1]));

  if (!plan) {
    return (
      <div>
        <PageHeader title="方案不存在" />
        <Link to="/plans" className="btn-secondary">
          <ArrowLeft size={15} /> 返回方案列表
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={plan.name}
        subtitle={
          <div className="flex items-center gap-3">
            <PlanStatusBadge status={plan.status} />
            <span className="flex items-center gap-1 text-municipal-500">
              <MapPin size={13} /> {loc?.canonicalName}
              {loc?.aliases && loc.aliases.length > 1 && (
                <span className="ml-1">
                  （别名：{loc.aliases.filter((a) => a.aliasName !== loc.canonicalName).map((a) => `「${a.aliasName}」`).join("、")}）
                </span>
              )}
            </span>
            <span className="text-municipal-500">最后更新 {formatDateTime(plan.updatedAt)}</span>
            {plan.status === "suspended" && (
              <span className="inline-flex items-center gap-1 text-xs text-warning-600 bg-warning-50 px-2 py-0.5 rounded border border-warning-200">
                <AlertTriangle size={12} /> 存在挂起反馈，暂不给出稳定结论
              </span>
            )}
          </div>
        }
        actions={
          <>
            <Link to="/plans" className="btn-secondary">
              <ArrowLeft size={15} /> 返回列表
            </Link>
            <button
              className="btn-primary"
              onClick={() => {
                if (confirm("确认基于当前反馈重新计算方案？旧版本将保留。")) recalculatePlan(plan.id);
              }}
            >
              <RefreshCw size={15} /> 重算方案
            </button>
          </>
        }
      />

      {suspendedFeedbacks.length > 0 && (
        <div className="card p-4 mb-5 border-warning-300 bg-warning-50/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-warning-700 font-medium text-sm mb-1">
                <AlertTriangle size={16} /> 存在 {suspendedFeedbacks.length} 条挂起反馈，需排班同事确认
              </div>
              <p className="text-xs text-warning-600">
                系统已自动暂停给出稳定结论，确认完成后将自动恢复比选。
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              {suspendedFeedbacks.map((f) => (
                <button
                  key={f.id}
                  className="btn-success !py-1 !px-2 text-xs"
                  onClick={() => confirmSuspended(f.id)}
                >
                  <PlayCircle size={12} /> 确认 #{f.id.slice(-6)} 为有效
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[1.4fr_1fr] gap-5 mb-5">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-municipal-700 mb-4 flex items-center gap-2">
            <FileText size={16} /> 方案比选图表 · 点击异常方案追溯原始反馈
          </h3>
          <div className="space-y-4">
            {plan.schemes.map((scheme) => {
              const isAnomaly = scheme.isAnomaly;
              const widthPct = (scheme.cost / maxCost) * 100;
              const isSelected = selectedScheme?.id === scheme.id;
              return (
                <div
                  key={scheme.id}
                  className={`rounded border p-4 cursor-pointer transition-all ${
                    isAnomaly
                      ? "border-danger-300 bg-danger-50/30"
                      : isSelected
                        ? "border-municipal-400 bg-municipal-50/70"
                        : "border-municipal-100 bg-white hover:bg-municipal-50/40"
                  } ${isAnomaly ? "animate-pulse-border" : ""}`}
                  onClick={() => setSelectedScheme(isSelected ? null : scheme)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-serif font-semibold ${isAnomaly ? "text-danger-700" : "text-municipal-800"}`}>
                        {scheme.name}
                      </span>
                      {isAnomaly && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-danger-600 bg-danger-100 px-1.5 py-0.5 rounded">
                          <AlertTriangle size={11} /> 异常
                        </span>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        scheme.riskLevel === "low"
                          ? "bg-success-50 text-success-700"
                          : scheme.riskLevel === "medium"
                            ? "bg-warning-50 text-warning-700"
                            : "bg-danger-50 text-danger-700"
                      }`}>
                        风险：{scheme.riskLevel === "low" ? "低" : scheme.riskLevel === "medium" ? "中" : "高"}
                      </span>
                    </div>
                    {isSelected ? <ChevronUp size={16} className="text-municipal-400" /> : <ChevronDown size={16} className="text-municipal-400" />}
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-xs mb-3">
                    <div>
                      <div className="text-municipal-500">成本</div>
                      <div className="font-mono font-semibold text-municipal-800 text-base">¥{scheme.cost.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-municipal-500">工期</div>
                      <div className="font-mono font-semibold text-municipal-800 text-base">{scheme.duration} 天</div>
                    </div>
                    <div>
                      <div className="text-municipal-500">治理效果</div>
                      <div className="font-mono font-semibold text-success-700 text-base">{(scheme.effectiveness * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-municipal-500">综合性价比</div>
                      <div className="font-mono font-semibold text-municipal-800 text-base">
                        {((scheme.effectiveness * 100000) / scheme.cost * 100).toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div className="h-2.5 bg-municipal-100 rounded overflow-hidden">
                    <div
                      className={`h-full rounded transition-all ${isAnomaly ? "bg-danger-500" : "bg-municipal-500"}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  {isAnomaly && scheme.anomalyReason && (
                    <p className="text-xs text-danger-600 mt-2">⚠ {scheme.anomalyReason}</p>
                  )}

                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-municipal-100 space-y-3">
                      <div>
                        <div className="text-xs font-semibold text-municipal-600 mb-2 flex items-center gap-1">
                          <Calculator size={13} /> 计算口径
                        </div>
                        <div className="bg-municipal-900 rounded p-3 font-mono text-xs text-municipal-50 space-y-1">
                          <div><span className="text-warning-400">公式：</span>{plan.currentCalculation.formula}</div>
                          <div><span className="text-warning-400">参数：</span></div>
                          <ul className="pl-4 space-y-0.5">
                            {Object.entries(plan.currentCalculation.parameters).map(([k, v]) => (
                              <li key={k}>{k} = <span className="text-success-400">{typeof v === "number" ? v.toFixed(2) : v}</span></li>
                            ))}
                          </ul>
                          <div><span className="text-warning-400">基于反馈：</span>{plan.currentCalculation.sourceFeedbackIds.length} 条</div>
                          <div><span className="text-warning-400">更新时间：</span>{formatDateTime(plan.currentCalculation.updatedAt)}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-municipal-600 mb-2 flex items-center gap-1">
                          <FileText size={13} /> 关联居民反馈（{activeFeedbacks.length} 条有效）
                        </div>
                        <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin">
                          {planFeedbacks.map((f) => (
                            <div
                              key={f.id}
                              className={`flex items-start gap-2 p-2 rounded text-xs border ${
                                f.status === "withdrawn"
                                  ? "border-danger-100 bg-danger-50/40 opacity-70"
                                  : f.status === "suspended"
                                    ? "border-warning-100 bg-warning-50/40"
                                    : "border-municipal-100 bg-municipal-50/50"
                              }`}
                            >
                              <StatusBadge status={f.status} />
                              <div className="flex-1 min-w-0">
                                <p className={f.status === "withdrawn" ? "line-through text-municipal-400" : "text-municipal-700"}>
                                  {f.content}
                                </p>
                                <p className="text-[10px] text-municipal-400 mt-0.5 font-mono">
                                  #{f.id.slice(-6)} · {f.source} · {f.locationNameRaw} · {formatDateTime(f.createdAt)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-municipal-700 mb-3 flex items-center gap-2">
              <Camera size={16} /> 变更截图说明（{plan.snapshots.length}）
            </h3>
            <p className="text-xs text-municipal-500 mb-3">
              每次变更（导入、补充、撤回、归并、重算）自动生成快照，包含前后对比与说明。
            </p>
            {plan.snapshots.length === 0 && (
              <div className="text-center text-xs text-municipal-400 py-6">暂无变更快照</div>
            )}
            <div className="space-y-3 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
              {plan.snapshots.slice().reverse().map((snap) => {
                const isOpen = !!openSnapshots[snap.id];
                return (
                  <div key={snap.id} className="border-2 border-dashed border-municipal-200 rounded p-3 bg-municipal-50/30">
                    <div
                      className="flex items-start justify-between gap-2 cursor-pointer"
                      onClick={() => setOpenSnapshots((m) => ({ ...m, [snap.id]: !isOpen }))}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-municipal-800">{snap.title}</div>
                        <div className="text-[11px] text-municipal-500 mt-0.5 flex items-center gap-1">
                          <Clock size={11} /> {formatDateTime(snap.createdAt)}
                        </div>
                        <div className="text-xs text-municipal-600 mt-1">{snap.description}</div>
                      </div>
                      {isOpen ? <ChevronUp size={15} className="text-municipal-400" /> : <ChevronDown size={15} className="text-municipal-400" />}
                    </div>
                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-municipal-200 space-y-2.5">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="text-municipal-500 mb-1 flex items-center gap-1">
                              <TrendingDown size={11} className="text-danger-500" /> 变更前
                            </div>
                            <pre className="bg-white border border-municipal-100 rounded p-2 font-mono text-[10px] text-municipal-600 whitespace-pre-wrap break-words max-h-32 overflow-y-auto scrollbar-thin">
                              {snap.beforeState}
                            </pre>
                          </div>
                          <div>
                            <div className="text-municipal-500 mb-1 flex items-center gap-1">
                              <TrendingUp size={11} className="text-success-500" /> 变更后
                            </div>
                            <pre className="bg-white border border-success-200 rounded p-2 font-mono text-[10px] text-municipal-700 whitespace-pre-wrap break-words max-h-32 overflow-y-auto scrollbar-thin">
                              {snap.afterState}
                            </pre>
                          </div>
                        </div>
                        <div className="bg-municipal-700 text-municipal-50 rounded p-2.5 text-xs">
                          <div className="flex items-center gap-1 text-municipal-200 text-[11px] mb-1">
                            <Camera size={11} /> 截图说明
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{snap.screenshotNote}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {plan.versions.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-municipal-700 mb-3">历史方案版本（{plan.versions.length}）</h3>
              <p className="text-xs text-municipal-500 mb-3">重算不覆盖旧方案，所有版本永久保留。</p>
              <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin pr-1">
                {plan.versions.slice().reverse().map((v, i) => (
                  <div key={v.id} className="flex items-center gap-2 text-xs p-2 rounded bg-municipal-50 border border-municipal-100">
                    <span className="font-mono font-medium text-municipal-600">v{plan.versions.length - i}</span>
                    <Minus size={10} className="text-municipal-300" />
                    <span className="flex-1 text-municipal-700 truncate">{v.remark}</span>
                    <span className="text-municipal-400">{formatDateTime(v.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-municipal-700 mb-4 flex items-center gap-2">
          <Clock size={16} /> 完整操作时间线（{plan.timeline.length}）
        </h3>
        <div className="relative pl-2">
          <div className="absolute left-[11px] top-1 bottom-1 w-px bg-municipal-100" />
          <div className="space-y-3">
            {plan.timeline.slice().reverse().map((ev) => (
              <div key={ev.id} className="relative flex gap-3">
                <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-l-4 ${eventBorder(ev.eventType)} bg-white shadow-card`}>
                  <div className={`w-2 h-2 rounded-full ${
                    ev.eventType === "withdraw" || ev.eventType === "suspend"
                      ? "bg-warning-500"
                      : ev.eventType === "confirm" || ev.eventType === "merge"
                        ? "bg-success-500"
                        : "bg-municipal-500"
                  }`} />
                </div>
                <div className={`flex-1 rounded border-l-4 ${eventBorder(ev.eventType)} bg-municipal-50/50 p-3`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <EventBadge type={ev.eventType} />
                    <span className="text-xs text-municipal-500">{ev.operator}</span>
                    <span className="text-xs text-municipal-400">{formatDateTime(ev.createdAt)}</span>
                    {ev.relatedFeedbackIds && ev.relatedFeedbackIds.length > 0 && (
                      <span className="text-[11px] text-municipal-500 font-mono">
                        关联反馈：{ev.relatedFeedbackIds.map((id) => `#${id.slice(-6)}`).join("、")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-municipal-700 mt-1.5 leading-relaxed">{ev.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
