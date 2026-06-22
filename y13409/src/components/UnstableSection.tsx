import { AlertTriangle, User, Check, X, Clock } from "lucide-react";
import { useSamplingStore } from "@/store/useSamplingStore";
import { cn } from "@/lib/utils";
import type { UnstableStatus } from "@/types";

const statusMap: Record<UnstableStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "待确认", color: "bg-amber-warm text-white", icon: Clock },
  confirmed: { label: "已确认", color: "bg-teal-jade text-white", icon: Check },
  rejected: { label: "已驳回", color: "bg-red-500 text-white", icon: X },
};

export default function UnstableSection() {
  const records = useSamplingStore((s) => s.unstableRecords);
  const updateStatus = useSamplingStore((s) => s.updateUnstableStatus);
  const samples = useSamplingStore((s) => s.samples);
  const scrollToSample = useSamplingStore((s) => s.scrollToSample);

  return (
    <section
      id="unstable-section"
      className="bg-gradient-to-br from-amber-warm/10 via-amber-pale/40 to-amber-soft/10 border border-amber-warm/25 rounded-xl shadow-card overflow-hidden animate-fadeUp"
    >
      <div className="px-5 py-4 border-b border-amber-warm/20 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-warm/90 text-white flex items-center justify-center">
          <AlertTriangle size={18} />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-ink-900">待确认区 · 排序不稳定</h3>
          <p className="text-xs font-mono text-amber-warm/90 mt-0.5">
            排序不稳定一出现，先放这；写清影响了哪些数字、谁来复核
          </p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {records.map((r) => {
          const sample = samples.find((s) => s.id === r.sampleId);
          const statusCfg = statusMap[r.status];
          const StatusIcon = statusCfg.icon;
          return (
            <div
              key={r.id}
              className="bg-white rounded-lg border border-amber-warm/20 p-4 shadow-card animate-slideInRight"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => scrollToSample(r.sampleId)}
                      className="font-mono text-sm font-semibold text-slate-deep hover:text-amber-warm transition-colors underline decoration-dotted underline-offset-2"
                    >
                      {sample?.name ?? r.sampleId}
                    </button>
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium", statusCfg.color)}>
                      <StatusIcon size={10} />
                      {statusCfg.label}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-ink-700 leading-relaxed">{r.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end text-[11px] font-mono text-ink-500">
                    <User size={11} />
                    复核人：{r.reviewer}
                  </div>
                  <div className="text-[10px] font-mono text-ink-500 mt-0.5">{r.createdAt}</div>
                </div>
              </div>

              <div className="bg-ink-50 rounded-md p-2.5 mb-3">
                <div className="text-[10px] font-mono text-ink-500 uppercase tracking-wider mb-1.5">影响指标</div>
                <div className="flex flex-wrap gap-1.5">
                  {r.impactedMetrics.map((m, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-white border border-ink-200 text-[11px] font-mono text-amber-warm font-medium"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {r.status === "pending" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateStatus(r.id, "confirmed")}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-teal-jade text-white text-xs font-mono hover:bg-teal-jade/90 transition-colors"
                  >
                    <Check size={12} /> 确认无误
                  </button>
                  <button
                    onClick={() => updateStatus(r.id, "rejected")}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-ink-200 text-ink-700 text-xs font-mono hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                  >
                    <X size={12} /> 驳回重算
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {records.length === 0 && (
          <div className="text-center py-8 text-sm font-mono text-ink-500">
            暂无待确认记录 ✓
          </div>
        )}
      </div>
    </section>
  );
}
