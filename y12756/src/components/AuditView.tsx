import { Copy, FileWarning, GitBranch, Layers, ArrowRight, AlertCircle } from "lucide-react";
import type { BatchData, SampleRecord } from "@/types";

interface Props {
  info: BatchData;
  samples: SampleRecord[];
  allBatches: Record<string, BatchData>;
}

export const AuditView = ({ info, samples, allBatches }: Props) => {
  const batchInfo = info.info;
  const byBatchGroup: Record<string, SampleRecord[]> = {};
  samples.forEach((s) => {
    const key = s.sampleNo.split("-")[0];
    if (!byBatchGroup[key]) byBatchGroup[key] = [];
    byBatchGroup[key].push(s);
  });

  const duplicates = Object.entries(byBatchGroup).filter(
    ([, arr]) => arr.length > 1 || arr.some((s) => s.anomalyType === "duplicate_batch")
  );

  const missingFieldSamples = samples.filter(
    (s) => s.isMissingReactionTime || s.isMissingUnit
  );

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="panel-title flex items-center gap-2">
            <Copy className="h-4 w-4 text-violet-600" />
            重复批号检测
          </h3>
          {batchInfo.isDuplicateBatch && (
            <span className="tag bg-violet-100 text-violet-700 border border-violet-200">
              <AlertCircle className="h-3 w-3 mr-1" />
              本批次存在重复记录
            </span>
          )}
        </div>

        {duplicates.length === 0 ? (
          <div className="text-center py-6 text-ink-400 text-sm">
            本批次各样本编号唯一，未检测到重复记录
          </div>
        ) : (
          <div className="space-y-3">
            {duplicates.map(([key, arr]) => (
              <div key={key} className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
                <div className="text-xs font-semibold text-violet-700 mb-3 flex items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5" />
                  同批号组：{key}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {arr.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-lg border border-violet-200 bg-white p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm font-bold text-ink-800">
                          {s.sampleNo}
                        </span>
                        {s.anomalyType === "duplicate_batch" && (
                          <span className="tag bg-red-100 text-red-700 text-[10px]">
                            冲突
                          </span>
                        )}
                      </div>
                      <div className="text-xs space-y-1 font-mono">
                        <div className="flex justify-between">
                          <span className="text-ink-400">浓度：</span>
                          <span className={!s.concentrationUnit ? "text-red-600" : ""}>
                            {s.concentration} {s.concentrationUnit || "⚠ 缺失"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-400">反应时间：</span>
                          <span className={s.isMissingReactionTime ? "text-red-600" : ""}>
                            {s.isMissingReactionTime
                              ? "⚠ 漏记"
                              : `${s.reactionTime} ${s.reactionTimeUnit}`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-400">吸光度：</span>
                          <span>{s.peakAbsorbance.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-400">判读：</span>
                          <span
                            className={
                              s.judgeResult === "络合"
                                ? "text-emerald-600"
                                : s.judgeResult === "待确认"
                                  ? "text-amber-600"
                                  : "text-rose-600"
                            }
                          >
                            {s.judgeResult}
                          </span>
                        </div>
                        <div className="pt-1.5 mt-1.5 border-t border-violet-100 text-[10px] text-ink-500">
                          来源：{s.sourceDoc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {arr.length >= 2 && (
                  <div className="mt-3 rounded-lg bg-ink-800/90 text-white p-3 text-xs space-y-1.5 font-serif">
                    <div className="font-semibold text-copper-300">差异分析</div>
                    {(() => {
                      const [a, b] = [arr[0], arr[1]];
                      const diffs: string[] = [];
                      if (a.concentrationUnit !== b.concentrationUnit) {
                        diffs.push(
                          `浓度单位不一致：${a.concentrationUnit || "缺失"} vs ${b.concentrationUnit || "缺失"}`
                        );
                      }
                      const aNorm = a.concentration && a.concentrationUnit === "mmol/L"
                        ? a.concentration / 1000
                        : a.concentration;
                      const bNorm = b.concentration && b.concentrationUnit === "mmol/L"
                        ? b.concentration / 1000
                        : b.concentration;
                      if (Math.abs((aNorm || 0) - (bNorm || 0)) > 0.0001) {
                        diffs.push(
                          `浓度数值差 ${Math.abs((aNorm || 0) - (bNorm || 0)).toExponential(2)} mol/L（单位换算后仍不一致）`
                        );
                      }
                      if (a.reactionTimeUnit !== b.reactionTimeUnit) {
                        diffs.push(
                          `反应时间单位冲突：${a.reactionTimeUnit || "漏记"} vs ${b.reactionTimeUnit || "漏记"}`
                        );
                      }
                      if (Math.abs(a.peakAbsorbance - b.peakAbsorbance) > 0.1) {
                        diffs.push(
                          `吸光度差 ${Math.abs(a.peakAbsorbance - b.peakAbsorbance).toFixed(3)}，差异显著`
                        );
                      }
                      return diffs.length === 0 ? (
                        <div>两条记录完全一致</div>
                      ) : (
                        diffs.map((d, i) => <div key={i}>· {d}</div>)
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="panel-title flex items-center gap-2 mb-4">
          <FileWarning className="h-4 w-4 text-red-600" />
          漏记字段追踪
        </h3>
        {missingFieldSamples.length === 0 ? (
          <div className="text-center py-6 text-ink-400 text-sm">
            所有字段填写完整 ✓
          </div>
        ) : (
          <div className="space-y-2">
            {missingFieldSamples.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-red-200 bg-red-50/50 p-3 flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-ink-800 mb-1">
                    {s.sampleNo}
                  </div>
                  <div className="text-xs space-y-1">
                    {s.isMissingReactionTime && (
                      <div className="flex items-center gap-2">
                        <span className="tag bg-red-100 text-red-700 text-[10px]">漏记</span>
                        <span className="text-ink-700">
                          反应时间字段缺失，应查材料：
                          <strong className="text-red-700 mx-1 font-mono">{s.sourceDoc}</strong>
                        </span>
                      </div>
                    )}
                    {s.isMissingUnit && (
                      <div className="flex items-center gap-2">
                        <span className="tag bg-orange-100 text-orange-700 text-[10px]">缺单位</span>
                        <span className="text-ink-700">
                          浓度单位未填，原始记录：
                          <strong className="text-orange-700 mx-1 font-mono">{s.sourceDoc}</strong>
                        </span>
                      </div>
                    )}
                    {s.anomalyReason && (
                      <div className="text-[11px] text-ink-500 mt-1 pt-1 border-t border-red-200/50">
                        {s.anomalyReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="panel-title flex items-center gap-2 mb-4">
          <Layers className="h-4 w-4 text-teal-600" />
          材料溯源链路
        </h3>
        <div className="relative py-4 px-2">
          <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-thin pb-2">
            {[
              {
                label: "原始实验记录",
                sub: batchInfo.materialSource.split(" · ")[0],
                status: "ok",
                icon: "📒",
              },
              {
                label: "数据表汇总",
                sub: samples[0]?.sourceDoc || "旧实验记录表",
                status: samples.some((s) => s.isMissingUnit || s.isMissingReactionTime) ? "warn" : "ok",
                icon: "📊",
              },
              {
                label: "系统判读",
                sub: `${samples.length} 份样本`,
                status: samples.some((s) => s.judgeResult === "待确认") ? "warn" : "ok",
                icon: "🧪",
              },
              {
                label: "最终报告",
                sub: Object.keys(allBatches).length + " 个批次",
                status: batchInfo.status === "normal" ? "ok" : "warn",
                icon: "📝",
              },
            ].map((node, idx, arr) => (
              <div key={idx} className="flex items-center gap-2 flex-shrink-0">
                <div
                  className={`rounded-lg border-2 p-3 min-w-[140px] ${
                    node.status === "ok"
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-dashed border-red-300 bg-red-50"
                  }`}
                >
                  <div className="text-2xl mb-1">{node.icon}</div>
                  <div className="text-xs font-semibold text-ink-700">{node.label}</div>
                  <div className="text-[10px] text-ink-500 font-mono mt-0.5 truncate">
                    {node.sub}
                  </div>
                  {node.status === "warn" && (
                    <div className="mt-1 text-[10px] text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      需人工核查
                    </div>
                  )}
                </div>
                {idx < arr.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-ink-300 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-ink-100 text-xs text-ink-500">
            <div className="mb-1 font-semibold text-ink-600">批次材料来源：</div>
            <div>{batchInfo.materialSource}</div>
            {batchInfo.notes && batchInfo.notes.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {batchInfo.notes.map((n, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-copper-700">
                    <span>✎</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
