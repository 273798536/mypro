import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Target,
  AlertOctagon,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Search,
  PieChart,
} from "lucide-react";
import MetricCard from "@/components/MetricCard/MetricCard";
import { useAppStore } from "@/store/useAppStore";
import { StatusTag, SourceTag, WeightTag } from "@/components/StatusTag/StatusTag";
import {
  weightColorClass,
  weightTextClass,
  sourceTypeLabel,
  statusLabel,
} from "@/utils/helpers";
import { cn } from "@/lib/utils";

type FocusFilter = "all" | "high" | "threshold";

const focusFilters: { key: FocusFilter; label: string; hint: string }[] = [
  { key: "all", label: "全部样本", hint: "12条记录" },
  { key: "high", label: "高权重异常", hint: "≥1.2" },
  { key: "threshold", label: "阈值漂移影响", hint: "受调整影响" },
];

export default function Review() {
  const init = useAppStore((s) => s.init);
  const getMetrics = useAppStore((s) => s.getMetrics);
  const getImpactAnalysis = useAppStore((s) => s.getImpactAnalysis);
  const data = useAppStore((s) => s.data);
  const reviewFocusFilter = useAppStore((s) => s.reviewFocusFilter);
  const setReviewFocusFilter = useAppStore((s) => s.setReviewFocusFilter);
  const setSelectedOrderId = useAppStore((s) => s.setSelectedOrderId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    init();
  }, [init]);

  const metrics = useMemo(() => getMetrics(), [getMetrics, data]);
  const impact = useMemo(() => getImpactAnalysis(), [getImpactAnalysis, data]);

  const filteredImpact = useMemo(() => {
    let list = impact;
    if (reviewFocusFilter === "high") {
      list = list.filter((i) => i.impact_weight >= 1.2);
    } else if (reviewFocusFilter === "threshold") {
      list = list.filter((i) => {
        const o = data.work_orders.find((w) => w.id === i.order_id);
        return o?.threshold_affected;
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.order_title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [impact, reviewFocusFilter, search, data.work_orders]);

  const distribution = useMemo(() => {
    const bins = [
      { label: "极高 ≥1.8", min: 1.8, max: 10 },
      { label: "高 1.2-1.8", min: 1.2, max: 1.8 },
      { label: "中 0.6-1.2", min: 0.6, max: 1.2 },
      { label: "低 <0.6", min: 0, max: 0.6 },
    ];
    return bins.map((b) => ({
      ...b,
      count: data.work_orders.filter(
        (o) => o.impact_weight >= b.min && o.impact_weight < b.max
      ).length,
    }));
  }, [data.work_orders]);

  const beforeDistribution = useMemo(() => {
    const map: Record<string, number> = { pending: 0, confirmed: 0, revoked: 0 };
    data.work_orders.forEach((o) => (map[o.status] = (map[o.status] ?? 0) + 1));
    return map;
  }, [data.work_orders]);

  const maxContribution = Math.max(...impact.map((i) => i.contribution), 1);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <p className="text-sm text-navy-500">评审追问时直接看这里</p>
          <h2 className="mt-1 text-2xl font-serif font-semibold text-navy-800">
            评审分析 · 拉偏样本追踪
          </h2>
          <p className="mt-1 text-sm text-navy-600">
            不只看总指标，还能回答「哪几条样本把结论拉偏了？」。
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400"
            strokeWidth={1.75}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
            className="input-field !pl-9 text-sm"
            placeholder="搜索样本标题或描述..."
          />
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="总结论准确率"
          value={89.2}
          unit="%"
          icon={Target}
          colorClass="from-moss-50 to-white"
          subtitle="改判后较之前提升 4.3%"
          trend={{ direction: "up", value: "+4.3pp", positive: true }}
        />
        <MetricCard
          title="待处理样本"
          value={metrics.pending_count}
          unit="条"
          icon={AlertOctagon}
          colorClass="from-amber-50 to-white"
          subtitle="其中阈值影响 "
          pulse={metrics.affected_by_threshold > 0}
        />
        <MetricCard
          title="高权重样本数"
          value={
            data.work_orders.filter((o) => o.impact_weight >= 1.2).length
          }
          unit="条"
          icon={BarChart3}
          colorClass="from-crimson-50 to-white"
          subtitle="占总结论贡献约 68%"
        />
        <MetricCard
          title="受阈值调整影响"
          value={
            data.work_orders.filter((o) => o.threshold_affected).length
          }
          unit="条"
          icon={TrendingUp}
          colorClass="from-navy-50 to-white"
          subtitle="v2.3 → v2.4 变更"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 分布概览 */}
        <section className="card p-5 animate-fade-in-up stagger-1 space-y-5">
          <header className="flex items-center justify-between">
            <h3 className="font-serif font-semibold text-navy-800 text-lg flex items-center gap-2">
              <PieChart className="w-4 h-4 text-navy-600" strokeWidth={1.75} />
              权重分布概览
            </h3>
            <span className="chip bg-navy-50 text-navy-600">n={data.work_orders.length}</span>
          </header>
          <div className="space-y-3">
            {distribution.map((d) => {
              const pct = Math.round(
                (d.count / Math.max(data.work_orders.length, 1)) * 100
              );
              return (
                <div key={d.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-navy-700">
                      {d.label}
                    </span>
                    <span className="text-navy-500 font-mono">
                      {d.count} 条 · {pct}%
                    </span>
                  </div>
                  <div className="h-7 rounded-lg bg-navy-50 relative overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-2",
                        d.min >= 1.8
                          ? "bg-gradient-to-r from-crimson-400 to-crimson-500"
                          : d.min >= 1.2
                          ? "bg-gradient-to-r from-amber-400 to-amber-500"
                          : d.min >= 0.6
                          ? "bg-gradient-to-r from-navy-400 to-navy-500"
                          : "bg-gradient-to-r from-moss-400 to-moss-500"
                      )}
                      style={{ width: `${Math.max(pct, 6)}%` }}
                    >
                      {pct >= 12 && (
                        <span className="text-[10px] font-bold text-white/95">
                          {pct}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pt-4 border-t border-navy-50">
            <h4 className="text-xs font-semibold text-navy-700 uppercase tracking-wide mb-3">
              状态分布
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              {Object.entries(beforeDistribution).map(([s, c]) => {
                const pct = Math.round(
                  (c / Math.max(data.work_orders.length, 1)) * 100
                );
                return (
                  <div
                    key={s}
                    className={cn(
                      "rounded-lg p-3 border",
                      s === "confirmed" &&
                        "bg-moss-50 border-moss-100",
                      s === "pending" &&
                        "bg-amber-50 border-amber-100",
                      s === "revoked" &&
                        "bg-crimson-50 border-crimson-100"
                    )}
                  >
                    <p className="text-2xl font-serif font-semibold text-navy-800">
                      {c}
                    </p>
                    <p className="text-[11px] text-navy-600 mt-0.5">
                      {statusLabel(s)} · {pct}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 拉偏样本列表 */}
        <section className="card lg:col-span-2 overflow-hidden animate-fade-in-up stagger-2">
          <header className="p-5 border-b border-navy-50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-serif font-semibold text-navy-800 text-lg flex items-center gap-2">
                <BarChart3
                  className="w-4 h-4 text-navy-600"
                  strokeWidth={1.75}
                />
                拉偏样本追踪（按影响度排序）
              </h3>
              <p className="mt-1 text-xs text-navy-500">
                评审追问：「哪几条样本把结论拉偏了？」点击展开查看样本如何影响总结论。
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {focusFilters.map((f) => {
                const active = reviewFocusFilter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setReviewFocusFilter(f.key)}
                    className={cn(
                      "chip cursor-pointer transition !py-1",
                      active
                        ? "bg-navy-600 text-white shadow-sm"
                        : "bg-navy-50 text-navy-600 hover:bg-navy-100"
                    )}
                    title={f.hint}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </header>

          <div className="max-h-[65vh] overflow-y-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white/95 backdrop-blur z-10">
                <tr className="text-left text-[11px] uppercase tracking-wide text-navy-500 border-b border-navy-100">
                  <th className="px-5 py-3 font-semibold w-10">#</th>
                  <th className="px-3 py-3 font-semibold">样本标题</th>
                  <th className="px-3 py-3 font-semibold w-28">来源/状态</th>
                  <th className="px-3 py-3 font-semibold w-44">
                    总结论贡献
                  </th>
                  <th className="px-3 py-3 font-semibold w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {filteredImpact.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-16 text-center text-sm text-navy-400"
                    >
                      无符合条件的样本
                    </td>
                  </tr>
                )}
                {filteredImpact.map((row, idx) => {
                  const order = data.work_orders.find(
                    (w) => w.id === row.order_id
                  );
                  const expanded = expandedId === row.order_id;
                  return (
                    <>
                      <tr
                        key={row.order_id}
                        className={cn(
                          "hover:bg-navy-50/50 cursor-pointer transition-colors",
                          expanded && "bg-navy-50/40"
                        )}
                        onClick={() =>
                          setExpandedId(expanded ? null : row.order_id)
                        }
                      >
                        <td className="px-5 py-3.5 text-xs font-mono text-navy-400 align-top">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-3.5 align-top">
                          <div className="flex flex-wrap gap-1.5 mb-1">
                            {order && <StatusTag status={order.status} />}
                            {order?.threshold_affected && (
                              <span className="chip bg-amber-50 text-amber-700 border border-amber-200/60">
                                阈值影响
                              </span>
                            )}
                            <WeightTag weight={row.impact_weight} />
                          </div>
                          <p className="font-medium text-navy-800 leading-snug pr-4 line-clamp-1">
                            {row.order_title}
                          </p>
                        </td>
                        <td className="px-3 py-3.5 align-top">
                          {order && <SourceTag source={order.source_type} />}
                        </td>
                        <td className="px-3 py-3.5 align-top">
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 h-2.5 rounded-full bg-navy-50 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  weightColorClass(row.impact_weight)
                                )}
                                style={{
                                  width: `${Math.max(
                                    (row.contribution / maxContribution) *
                                      100,
                                    5
                                  )}%`,
                                }}
                              />
                            </div>
                            <span
                              className={cn(
                                "text-xs font-bold font-mono shrink-0 w-12 text-right",
                                weightTextClass(row.impact_weight)
                              )}
                            >
                              {row.contribution}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-navy-400 align-top">
                          {expanded ? (
                            <ChevronUp className="w-4 h-4" strokeWidth={2} />
                          ) : (
                            <ChevronDown className="w-4 h-4" strokeWidth={2} />
                          )}
                        </td>
                      </tr>
                      {expanded && order && (
                        <tr className="bg-gradient-to-b from-navy-50/60 to-white">
                          <td className="px-5" />
                          <td
                            className="px-3 pb-5 pt-0"
                            colSpan={4}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="rounded-xl border border-navy-100 bg-white p-4 mt-1 animate-slide-in shadow-card">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2 space-y-3">
                                  <div>
                                    <p className="text-[11px] font-semibold text-navy-500 uppercase tracking-wide mb-1">
                                      如何拉偏总结论？
                                    </p>
                                    <p className="text-sm text-navy-700 leading-relaxed">
                                      {row.description}
                                    </p>
                                  </div>
                                  <div className="rounded-lg bg-amber-50/60 border border-amber-100 p-3">
                                    <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide mb-1">
                                      给算法值班人的解释要点
                                    </p>
                                    <ul className="text-xs text-navy-700 space-y-1 list-disc list-inside leading-relaxed">
                                      <li>
                                        该样本落入 v2.3→v2.4 阈值交界区
                                        {order.threshold_affected ? "" : "（无阈值影响）"}
                                      </li>
                                      <li>
                                        原置信度 {(order.confidence * 100).toFixed(0)}%，
                                        人工改判状态为
                                        <span className="font-medium mx-1">
                                          {statusLabel(order.status)}
                                        </span>
                                      </li>
                                      <li>
                                        若将此条权重归一化后剔除，总结论准确率将波动约
                                        <span className="font-medium mx-1">
                                          {(row.contribution * 0.6).toFixed(1)}%
                                        </span>
                                      </li>
                                    </ul>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div className="rounded-lg bg-navy-50/60 border border-navy-100 p-3">
                                    <p className="text-[11px] font-semibold text-navy-600 uppercase tracking-wide mb-1">
                                      模型摘要
                                    </p>
                                    <p className="text-xs text-navy-700 leading-relaxed">
                                      {order.model_summary}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSelectedOrderId(order.id);
                                      window.location.href = "/workbench";
                                    }}
                                    className="btn-secondary w-full text-xs"
                                  >
                                    跳转改判工作台
                                    <ArrowRight
                                      className="w-3.5 h-3.5"
                                      strokeWidth={2}
                                    />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
