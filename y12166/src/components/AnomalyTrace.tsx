import { useState } from "react";
import { useSimStore, exportCSV, generateTerminalSummary } from "../store/simStore";
import { ANOMALY_LABELS } from "../data/constants";
import type { AnomalyEvent } from "../types";
import { ChevronDown, ChevronRight, Download, FileText } from "lucide-react";

export default function AnomalyTrace() {
  const result = useSimStore((s) => s.result);
  const [expandedHour, setExpandedHour] = useState<number | null>(null);

  if (!result) return null;

  const anomalies = result.hourlyResults.filter((r) => r.anomaly !== null);

  function handleExport() {
    if (!result) return;
    const csvContent = exportCSV(result);
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pool_sim_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportSummary() {
    if (!result) return;
    const summary = generateTerminalSummary(result);
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pool_sim_summary_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">
          异常事件追溯 ({anomalies.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleExportSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 border border-slate-700/50 rounded-lg text-xs text-slate-400 hover:text-slate-300 hover:border-slate-600 transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            导出摘要
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            导出CSV
          </button>
        </div>
      </div>

      {anomalies.length === 0 ? (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 text-center">
          <div className="text-emerald-400 text-sm font-medium">
            ✓ 无异常事件
          </div>
          <div className="text-slate-500 text-xs mt-1">
            所有时段余氯、泵运行状态、客流均在正常范围
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {anomalies.map((r) => {
            const a = r.anomaly as AnomalyEvent;
            const isExpanded = expandedHour === r.hour;
            return (
              <div
                key={r.hour}
                className={`bg-slate-900/60 border rounded-xl overflow-hidden transition-all ${
                  isExpanded
                    ? "border-red-500/30"
                    : "border-slate-700/40"
                }`}
              >
                <button
                  onClick={() =>
                    setExpandedHour(isExpanded ? null : r.hour)
                  }
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-800/30 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      a.type === "low_chlorine"
                        ? "bg-red-500/15 text-red-400"
                        : a.type === "pump_shutdown"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-purple-500/15 text-purple-400"
                    }`}
                  >
                    {ANOMALY_LABELS[a.type]}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {String(r.hour).padStart(2, "0")}:00
                  </span>
                  <span className="text-xs text-slate-500 flex-1 truncate">
                    {a.description}
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-800/60">
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <TraceCard
                        title="水循环计算"
                        content={a.traceRef.calculation}
                        color="cyan"
                      />
                      <TraceCard
                        title="余氯预测"
                        content={a.traceRef.chlorinePrediction}
                        color="emerald"
                      />
                      <TraceCard
                        title="排程建议"
                        content={a.traceRef.scheduleAdvice}
                        color="amber"
                      />
                    </div>
                    <div className="bg-slate-800/40 rounded-lg p-3">
                      <div className="text-[10px] text-slate-500 mb-1">
                        关键指标快照
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">余氯: </span>
                          <span className="font-mono text-slate-300">
                            {r.chlorineLevel.toFixed(3)} mg/L
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">泵: </span>
                          <span
                            className={
                              r.pumpRunning
                                ? "text-emerald-400"
                                : "text-red-400"
                            }
                          >
                            {r.pumpRunning ? "运行" : "停止"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">客流: </span>
                          <span className="font-mono text-slate-300">
                            {r.visitorCount}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">电费: </span>
                          <span className="font-mono text-slate-300">
                            ¥{r.electricityCost.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">
          泵流量结论（与导出文件一致）
        </h3>
        <p className="text-xs font-mono text-cyan-400 bg-slate-800/60 rounded-lg p-3">
          {result.summary.pumpFlowConclusion}
        </p>
        <p className="text-[10px] text-slate-600 mt-2">
          此结论同时出现在界面指标卡片、终端摘要和导出CSV中，数据源为同一仿真结果快照
        </p>
      </div>
    </div>
  );
}

function TraceCard({
  title,
  content,
  color,
}: {
  title: string;
  content: string;
  color: "cyan" | "emerald" | "amber";
}) {
  const colorMap = {
    cyan: "bg-cyan-500/5 border-cyan-500/20 text-cyan-300",
    emerald: "bg-emerald-500/5 border-emerald-500/20 text-emerald-300",
    amber: "bg-amber-500/5 border-amber-500/20 text-amber-300",
  };
  const titleColorMap = {
    cyan: "text-cyan-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
  };

  return (
    <div className={`border rounded-lg p-3 ${colorMap[color]}`}>
      <div className={`text-[10px] font-medium mb-1 ${titleColorMap[color]}`}>
        {title}
      </div>
      <div className="text-[11px] leading-relaxed">{content}</div>
    </div>
  );
}
