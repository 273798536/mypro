import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/store/useApp";
import { RETEST_REASON_LABEL, ROLE_LABEL, SOLVENT_META, STATUS_BADGE, STATUS_LABEL } from "@/types";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Filter,
  Gauge,
  ArrowLeftRight,
} from "lucide-react";

export default function RetestPage() {
  const { batches, role, resolveRetest } = useApp();
  const nav = useNavigate();

  if (role === "student") {
    return (
      <div className="card text-center py-20">
        <div className="text-5xl mb-4">🔒</div>
        <h3 className="font-display text-2xl text-ink-800 mb-2">复测建议页不对学生开放</h3>
        <p className="text-ink-500">请切换到环境监测员或老师视角</p>
      </div>
    );
  }

  const items = batches.flatMap((b) =>
    b.retestAdvices.map((r) => ({ batch: b, advice: r })),
  );
  const pending = items.filter((i) => !i.advice.resolved);
  const done = items.filter((i) => i.advice.resolved);

  const reasonStats = pending.reduce<Record<string, number>>((acc, i) => {
    acc[i.advice.reason] = (acc[i.advice.reason] || 0) + 1;
    return acc;
  }, {});

  const priorityStats = {
    high: pending.filter((i) => i.advice.priority === "high").length,
    medium: pending.filter((i) => i.advice.priority === "medium").length,
    low: pending.filter((i) => i.advice.priority === "low").length,
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card bg-gradient-to-br from-warn-50/50 via-white to-lab-50/40">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-warn-100 text-warn-700 text-xs font-medium">
              <CalendarClock size="12" /> 月底 / 课前入口
            </div>
            <h3 className="section-title mt-3">复测建议汇总</h3>
            <p className="section-subtitle max-w-xl">
              把所有异常批次按原因聚到一起，每条建议都有具体操作步骤。
              课前扫一眼，就知道今天该补哪几份反应条件、该补测哪几个温度点。
            </p>
          </div>
          <Link to="/records" className="btn-ghost">
            返回记录列表 <ArrowRight size="14" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card-soft">
          <div className="flex items-center gap-2 text-xs text-ink-500 mb-2">
            <AlertCircle size="12" className="text-warn-500" /> 待处理
          </div>
          <div className="font-display text-3xl text-ink-800">{pending.length}</div>
          <div className="text-[11px] text-ink-500 mt-1">条建议</div>
        </div>
        <div className="card-soft">
          <div className="flex items-center gap-2 text-xs text-ink-500 mb-2">
            <CheckCircle2 size="12" className="text-chem-500" /> 已处理
          </div>
          <div className="font-display text-3xl text-ink-800">{done.length}</div>
          <div className="text-[11px] text-ink-500 mt-1">条建议</div>
        </div>
        <div className="card-soft">
          <div className="flex items-center gap-2 text-xs text-ink-500 mb-2">
            <Clock size="12" className="text-alert-500" /> 高优先级
          </div>
          <div className="font-display text-3xl text-alert-600">{priorityStats.high}</div>
        </div>
        <div className="card-soft">
          <div className="flex items-center gap-2 text-xs text-ink-500 mb-2">
            <Clock size="12" className="text-warn-500" /> 中优先级
          </div>
          <div className="font-display text-3xl text-warn-600">{priorityStats.medium}</div>
        </div>
        <div className="card-soft">
          <div className="flex items-center gap-2 text-xs text-ink-500 mb-2">
            <Clock size="12" className="text-ink-400" /> 低优先级
          </div>
          <div className="font-display text-3xl text-ink-500">{priorityStats.low}</div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Filter size="16" className="text-ink-500" />
          <div className="text-sm font-semibold text-ink-800">按原因分类</div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(reasonStats).length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-4 p-5 rounded-xl bg-ink-50 text-center text-sm text-ink-500">
              <Gauge size="22" className="mx-auto mb-2 text-chem-500" />
              🎉 暂无待处理复测建议，当前批次状态良好
            </div>
          ) : (
            Object.entries(reasonStats).map(([k, v]) => (
              <div
                key={k}
                className="p-4 rounded-xl bg-gradient-to-br from-ink-50 to-white border border-ink-100"
              >
                <div className="text-xs text-ink-500">{RETEST_REASON_LABEL[k as keyof typeof RETEST_REASON_LABEL]}</div>
                <div className="font-display text-2xl text-ink-800 mt-1">{v}</div>
                <div className="text-[11px] text-ink-500 mt-1">条待处理</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-display text-xl text-ink-800">待处理建议</h4>
          <div className="text-xs text-ink-500 flex items-center gap-1">
            <ArrowLeftRight size="12" /> 按时间倒序
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="card text-center py-16">
            <CheckCircle2 size="44" className="mx-auto text-chem-400 mb-3" />
            <div className="font-display text-2xl text-chem-700 mb-1">全部完成</div>
            <div className="text-sm text-ink-500">目前没有待处理的复测建议</div>
          </div>
        ) : (
          <div className="space-y-4">
            {pending
              .sort((a, b) => (a.advice.priority === "high" ? -1 : 1) - (b.advice.priority === "high" ? -1 : 1))
              .map(({ batch, advice }) => {
                const meta = SOLVENT_META[batch.solventType];
                return (
                  <div
                    key={advice.retestId}
                    className="card hover:shadow-lg transition-all animate-slide-up"
                  >
                    <div className="flex items-start justify-between gap-5 flex-wrap">
                      <div className="flex-1 min-w-[300px]">
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <span
                            className={`badge ${
                              advice.priority === "high"
                                ? "bg-alert-100 text-alert-700"
                                : advice.priority === "medium"
                                ? "bg-warn-100 text-warn-700"
                                : "bg-ink-100 text-ink-700"
                            }`}
                          >
                            {advice.priority === "high"
                              ? "🔥 高优先级"
                              : advice.priority === "medium"
                              ? "中优先级"
                              : "低优先级"}
                          </span>
                          <span className="badge bg-lab-50 text-lab-700">
                            {RETEST_REASON_LABEL[advice.reason]}
                          </span>
                          <span className="font-mono text-sm text-lab-600 font-semibold">
                            {batch.batchId}
                          </span>
                          <span className={`badge ${STATUS_BADGE[batch.status]}`}>
                            {STATUS_LABEL[batch.status]}
                          </span>
                          <span className="badge bg-ink-100 text-ink-700">
                            {meta.name} · {meta.abbreviation}
                          </span>
                        </div>
                        <div className="text-sm text-ink-800 font-medium">{advice.description}</div>
                        <div className="mt-3 p-4 rounded-xl bg-gradient-to-br from-lab-50/70 to-white border border-lab-100 text-sm">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-lab-700 mb-2">
                            <Gauge size="13" /> 可操作步骤（直接照着做）
                          </div>
                          <div className="text-ink-700 whitespace-pre-line leading-relaxed">
                            {advice.action}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-xs text-ink-500 flex-wrap">
                          <span>创建批次：{fmt(batch.createdAt)}</span>
                          <span>创建角色：{ROLE_LABEL[batch.createdBy]}</span>
                          <span>温度点 {batch.tempCurve.length} · pH点 {batch.phLogs.length}</span>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <button
                          className="btn-primary"
                          onClick={() => nav(`/review/${batch.batchId}`)}
                        >
                          去复核
                          <ArrowRight size="15" />
                        </button>
                        <button
                          className="btn-secondary text-xs"
                          onClick={() => resolveRetest(batch.batchId, advice.retestId)}
                        >
                          <CheckCircle2 size="13" /> 标记已处理
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {done.length > 0 && (
        <div>
          <details className="group">
            <summary className="cursor-pointer font-display text-lg text-ink-700 hover:text-ink-900 select-none flex items-center gap-2">
              已处理建议（{done.length} 条）
            </summary>
            <div className="mt-4 grid lg:grid-cols-2 gap-4">
              {done.map(({ batch, advice }) => (
                <div
                  key={advice.retestId}
                  className="p-4 rounded-xl2 bg-chem-50/50 border border-chem-100"
                >
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <CheckCircle2 size="14" className="text-chem-600" />
                    <span className="font-mono text-sm text-lab-700">{batch.batchId}</span>
                    <span className="badge bg-ink-100 text-ink-700 text-[10px]">
                      {RETEST_REASON_LABEL[advice.reason]}
                    </span>
                  </div>
                  <div className="text-sm text-ink-700 line-clamp-2">{advice.description}</div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
