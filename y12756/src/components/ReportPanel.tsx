import { FileText, CheckCircle, XCircle, AlertCircle, Layers } from "lucide-react";
import type { BatchData, SampleRecord } from "@/types";

interface Props {
  info: BatchData;
  samples: SampleRecord[];
}

export const ReportPanel = ({ info, samples }: Props) => {
  const batch = info.info;
  const total = samples.length;
  const complex = samples.filter((s) => s.judgeResult === "络合").length;
  const pending = samples.filter((s) => s.judgeResult === "待确认").length;
  const anomalyCount = samples.filter((s) => s.isAnomaly && !s.manuallyOverridden).length;

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-ink-100 bg-ink-800 text-white px-4 py-3 rounded-t-xl">
        <h3 className="font-serif text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4" />
          判读文字报告
        </h3>
        <Layers className="h-3.5 w-3.5 opacity-60" />
      </div>
      <div className="flex-1 overflow-auto scrollbar-thin p-4 space-y-4 text-sm leading-relaxed">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-400 mb-1">
            批次信息
          </div>
          <div className="font-serif font-semibold text-ink-800 text-base">
            {batch.name}
          </div>
          <div className="text-xs text-ink-500 mt-0.5 space-y-0.5">
            <div>批号：<span className="font-mono text-ink-700">{batch.id}</span></div>
            <div>操作人：{batch.operator}</div>
            <div>时间：{batch.createdAt}</div>
            <div>材料来源：{batch.materialSource}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-center">
            <div className="text-lg font-bold text-emerald-700 font-mono">{complex}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">已络合</div>
          </div>
          <div className={`rounded-lg border p-2.5 text-center ${
            pending > 0 ? "bg-amber-50 border-amber-200" : "bg-ink-50 border-ink-200"
          }`}>
            <div className={`text-lg font-bold font-mono ${pending > 0 ? "text-amber-700" : "text-ink-500"}`}>
              {pending}
            </div>
            <div className={`text-[10px] mt-0.5 ${pending > 0 ? "text-amber-700" : "text-ink-500"}`}>待确认</div>
          </div>
          <div className={`rounded-lg border p-2.5 text-center ${
            anomalyCount > 0 ? "bg-red-50 border-red-200" : "bg-ink-50 border-ink-200"
          }`}>
            <div className={`text-lg font-bold font-mono ${anomalyCount > 0 ? "text-red-700" : "text-ink-500"}`}>
              {anomalyCount}
            </div>
            <div className={`text-[10px] mt-0.5 ${anomalyCount > 0 ? "text-red-700" : "text-ink-500"}`}>异常</div>
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-400 mb-2">
            自动判读结论
          </div>
          <div className={`rounded-lg p-3 border ${
            pending === 0 && anomalyCount === 0
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200"
          }`}>
            <div className="flex items-start gap-2">
              {pending === 0 && anomalyCount === 0 ? (
                <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="text-xs leading-relaxed">
                {pending === 0 && anomalyCount === 0 ? (
                  <span className="text-emerald-800">
                    本批次 {total} 份样本均已完成判读，{complex} 份确认形成稳定络合物。
                    谱图特征峰与浓度数据一致，可作为教学示范数据使用。
                  </span>
                ) : (
                  <span className="text-amber-800">
                    本批次共 {total} 份样本，其中 {complex} 份确认络合，
                    <strong className="mx-0.5">{pending} 份待确认</strong>
                    （含 {anomalyCount} 处数据异常）。
                    建议教师执行：① 重复运行验证可复现性；② 补录漏记字段；③ 人工确认异常样本判断。
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-400 mb-2">
            各样本明细
          </div>
          <div className="space-y-1.5">
            {samples.map((s) => (
              <div
                key={s.id}
                className={`rounded-md border px-2.5 py-2 flex items-center justify-between text-xs ${
                  s.judgeResult === "络合"
                    ? "bg-white border-ink-100"
                    : s.judgeResult === "待确认"
                      ? "bg-amber-50/50 border-amber-200"
                      : "bg-rose-50/50 border-rose-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {s.judgeResult === "络合" ? (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  ) : s.judgeResult === "待确认" ? (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  )}
                  <span className="font-mono font-semibold text-ink-700">{s.sampleNo}</span>
                  <span className="text-ink-400">{s.metalIon}</span>
                </div>
                <span className={`font-serif text-[11px] ${
                  s.judgeResult === "络合" ? "text-emerald-700" :
                  s.judgeResult === "待确认" ? "text-amber-700" : "text-rose-700"
                }`}>
                  {s.judgeResult}
                  {s.manuallyOverridden && " ✓人工"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {batch.notes && batch.notes.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-400 mb-2">
              原始记录备注
            </div>
            <ul className="space-y-1">
              {batch.notes.map((n, i) => (
                <li key={i} className="text-xs text-ink-600 flex items-start gap-1.5 italic">
                  <span className="text-copper-500 not-italic">✎</span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
