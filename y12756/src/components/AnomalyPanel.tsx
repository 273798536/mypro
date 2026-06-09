import { AlertTriangle, CheckCircle, Clock, Calculator, ArrowRight, History } from "lucide-react";
import type { AnomalyRecord, AuditLog, SampleRecord } from "@/types";
import { calculateConcentration, formatConcentration } from "@/utils/chemistry";

interface Props {
  anomalies: AnomalyRecord[];
  samples: SampleRecord[];
  auditLogs: AuditLog[];
  onConfirmSample: (sampleId: string) => void;
}

export const AnomalyPanel = ({ anomalies, samples, auditLogs, onConfirmSample }: Props) => {
  const unresolved = anomalies.filter((a) => !a.resolved);
  const resolved = anomalies.filter((a) => a.resolved);

  const getTargetSample = (a: AnomalyRecord) =>
    samples.find((s) => s.id === a.sampleId);

  const anomalyLabel: Record<string, { text: string; color: string }> = {
    missing_time: { text: "漏记时间", color: "bg-red-100 text-red-700" },
    missing_unit: { text: "缺失单位", color: "bg-orange-100 text-orange-700" },
    outlier: { text: "数据离群", color: "bg-rose-100 text-rose-700" },
    manual_flag: { text: "需人工确认", color: "bg-amber-100 text-amber-700" },
    duplicate_batch: { text: "重复批号冲突", color: "bg-violet-100 text-violet-700" },
  };

  const compareSamples = samples.filter(
    (s) => s.anomalyType === "outlier" || s.anomalyType === "manual_flag"
  );
  const confirmLogs = auditLogs.filter((l) => l.actionType === "confirm" || l.actionType === "supplement");

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="panel-title flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            异常留痕时间线
          </h3>
          <div className="flex gap-2 text-xs">
            <span className="tag bg-red-50 text-red-600 border border-red-200">
              待处理 {unresolved.length}
            </span>
            <span className="tag bg-emerald-50 text-emerald-600 border border-emerald-200">
              已解决 {resolved.length}
            </span>
          </div>
        </div>

        {anomalies.length === 0 ? (
          <div className="text-center py-8 text-ink-400 text-sm">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
            本批次暂无异常记录
          </div>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-[7px] top-1 bottom-1 w-px bg-ink-200" />
            {anomalies.map((a) => {
              const s = getTargetSample(a);
              const label = anomalyLabel[a.type] || { text: a.type, color: "bg-ink-100 text-ink-700" };
              return (
                <div key={a.id} className="relative pb-4 last:pb-0">
                  <div
                    className={`absolute -left-[1px] top-1 h-3.5 w-3.5 rounded-full border-2 ${
                      a.resolved
                        ? "bg-emerald-500 border-emerald-200"
                        : "bg-red-500 border-red-200 animate-pulse"
                    }`}
                  />
                  <div className="ml-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`tag ${label.color}`}>{label.text}</span>
                      <span className="font-mono text-xs text-ink-600 font-semibold">
                        {a.sampleNo}
                      </span>
                      {a.resolved && (
                        <span className="tag bg-emerald-50 text-emerald-600">
                          ✓ {a.resolvedBy} {a.resolvedAt}
                        </span>
                      )}
                      {!a.resolved && (a.type === "manual_flag" || a.type === "outlier") && (
                        <button
                          onClick={() => onConfirmSample(a.sampleId)}
                          className="tag bg-copper-600 text-white hover:bg-copper-500 cursor-pointer"
                        >
                          人工确认 →
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-ink-600 leading-relaxed">
                      {a.description}
                    </div>
                    <div className="text-[11px] text-ink-400 mt-0.5 font-mono">
                      影响字段：{a.field}
                      {s?.sourceDoc && ` · 来源：${s.sourceDoc}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {compareSamples.length > 0 && (
        <div className="card p-5">
          <h3 className="panel-title flex items-center gap-2 mb-4">
            <Calculator className="h-4 w-4 text-copper-600" />
            浓度换算前后对比
          </h3>
          <div className="space-y-4">
            {compareSamples.map((s) => {
              const normalA = s.peakAbsorbance / (s.anomalyType === "outlier" ? 3 : 1.05);
              const calcBefore = calculateConcentration(
                s.peakAbsorbance,
                s.metalIon,
                s.ligand,
                s.concentrationUnit || "mol/L"
              );
              const calcAfter = calculateConcentration(
                Number(normalA.toFixed(3)),
                s.metalIon,
                s.ligand,
                s.concentrationUnit || "mol/L"
              );
              return (
                <div key={s.id} className="rounded-lg border border-ink-200 overflow-hidden">
                  <div className="bg-ink-50 px-4 py-2 border-b border-ink-200 flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-ink-700">
                      {s.sampleNo} · {s.metalIon}-{s.ligand}
                    </span>
                    <span className="text-[11px] text-ink-500">
                      Beer-Lambert: c = A / (ε × l)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-0">
                    <div className="p-4 border-r border-ink-200 bg-rose-50/30">
                      <div className="text-[11px] text-rose-600 uppercase tracking-wider mb-2 font-semibold">
                        修正前（异常）
                      </div>
                      <div className="space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-ink-500">吸光度 A:</span>
                          <span className="text-rose-700 font-semibold">{calcBefore.absorbance.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-500">ε (L·mol⁻¹·cm⁻¹):</span>
                          <span>{calcBefore.epsilon}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-500">光程 l (cm):</span>
                          <span>{calcBefore.pathLength}</span>
                        </div>
                        <div className="h-px bg-ink-200 my-2" />
                        <div className="flex justify-between">
                          <span className="text-ink-700 font-semibold">浓度 c:</span>
                          <span className="text-rose-700 font-bold text-sm">
                            {formatConcentration(calcBefore.concentration, calcBefore.unit)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="relative p-4 bg-emerald-50/30">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10">
                        <div className="h-7 w-7 rounded-full bg-white border-2 border-ink-200 flex items-center justify-center shadow-sm">
                          <ArrowRight className="h-3.5 w-3.5 text-copper-600" />
                        </div>
                      </div>
                      <div className="text-[11px] text-emerald-700 uppercase tracking-wider mb-2 font-semibold">
                        修正后（预计）
                      </div>
                      <div className="space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-ink-500">吸光度 A:</span>
                          <span className="text-emerald-700 font-semibold">{calcAfter.absorbance.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-500">ε (L·mol⁻¹·cm⁻¹):</span>
                          <span>{calcAfter.epsilon}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-500">光程 l (cm):</span>
                          <span>{calcAfter.pathLength}</span>
                        </div>
                        <div className="h-px bg-ink-200 my-2" />
                        <div className="flex justify-between">
                          <span className="text-ink-700 font-semibold">浓度 c:</span>
                          <span className="text-emerald-700 font-bold text-sm">
                            {formatConcentration(calcAfter.concentration, calcAfter.unit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {confirmLogs.length > 0 && (
        <div className="card p-5">
          <h3 className="panel-title flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-ink-600" />
            判断变更记录
          </h3>
          <div className="space-y-2">
            {confirmLogs.map((l) => (
              <div
                key={l.id}
                className="rounded-lg border border-ink-100 bg-ink-50/50 p-3 text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-ink-700 font-semibold">
                    {l.actionType === "confirm" ? "人工确认" : "数据补录"}
                    {l.targetSampleId && ` · 样本`}
                  </span>
                  <span className="text-ink-400 font-mono text-[10px]">{l.timestamp}</span>
                </div>
                <div className="text-ink-600">{l.detail}</div>
                {l.beforeState && l.afterState && (
                  <div className="mt-2 flex items-center gap-2 text-[11px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 line-through">
                      {l.beforeState}
                    </span>
                    <ArrowRight className="h-3 w-3 text-ink-400" />
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                      {l.afterState}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="panel-title flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-ink-500" />
          完整操作历史
        </h3>
        <div className="space-y-1.5 max-h-60 overflow-auto scrollbar-thin">
          {auditLogs.length === 0 ? (
            <div className="text-xs text-ink-400 py-2 text-center">暂无操作记录</div>
          ) : (
            auditLogs.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-3 text-xs py-1.5 border-b border-ink-50 last:border-0"
              >
                <span className="font-mono text-ink-400 w-36 flex-shrink-0">
                  {l.timestamp.split(" ")[1]}
                </span>
                <span
                  className={`tag w-14 justify-center ${
                    l.actionType === "confirm"
                      ? "bg-copper-100 text-copper-700"
                      : l.actionType === "supplement"
                        ? "bg-amber-100 text-amber-700"
                        : l.actionType === "rerun"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-ink-100 text-ink-700"
                  }`}
                >
                  {l.actionType === "run"
                    ? "判读"
                    : l.actionType === "rerun"
                      ? "重跑"
                      : l.actionType === "supplement"
                        ? "补录"
                        : "确认"}
                </span>
                <span className="text-ink-600 flex-1 truncate">{l.detail}</span>
                <span className="text-ink-400 flex-shrink-0">{l.operator}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
