import {
  Play,
  RotateCcw,
  PencilLine,
  CheckSquare,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { useLabStore } from "@/store/useLabStore";
import type { BatchData } from "@/types";

interface Props {
  info: BatchData;
  onManualConfirmClick: () => void;
  onStartTour: () => void;
}

export const ControlBar = ({ info, onManualConfirmClick, onStartTour }: Props) => {
  const batch = info.info;
  const { hasRun, runJudgement, rerunJudgement, rerunCount, setShowReport, showReport } =
    useLabStore();

  const statusTag =
    batch.status === "normal"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : batch.status === "anomaly"
        ? "bg-red-100 text-red-700 border-red-200"
        : "bg-amber-100 text-amber-700 border-amber-200";
  const statusLabel =
    batch.status === "normal" ? "正常" : batch.status === "anomaly" ? "异常" : "待确认";

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`tag border ${statusTag}`}>
              <Sparkles className="h-3 w-3 mr-1" />
              {statusLabel}
            </span>
            <span className="font-mono text-sm text-ink-700 font-semibold">
              {batch.id}
            </span>
            <span className="text-xs text-ink-400">·</span>
            <span className="font-serif text-sm text-ink-600">{batch.name}</span>
          </div>
          {rerunCount > 0 && (
            <span className="tag bg-sky-50 text-sky-600 border border-sky-200">
              已重复运行 {rerunCount} 次
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!hasRun ? (
            <button onClick={runJudgement} className="btn-primary">
              <Play className="h-4 w-4" />
              开始判读
            </button>
          ) : (
            <>
              <button
                onClick={rerunJudgement}
                className="btn-secondary"
                title="用相同参数重新计算，观察波动"
              >
                <RotateCcw className="h-4 w-4" />
                重复运行
              </button>
              <button
                onClick={() => alert("请在下方数据表格中，点击红色「漏记」或「缺单位」按钮补录数据")}
                className="btn-secondary"
                title="补录缺失的反应时间、浓度单位等字段"
              >
                <PencilLine className="h-4 w-4" />
                补录数据
              </button>
              <button
                onClick={onManualConfirmClick}
                className="btn-copper"
                title="对异常/待确认样本进行人工判断"
              >
                <CheckSquare className="h-4 w-4" />
                人工确认
              </button>
              <button
                onClick={() => setShowReport(!showReport)}
                className={`${showReport ? "btn-primary" : "btn-secondary"}`}
              >
                {showReport ? "收起报告" : "查看完整报告"}
              </button>
            </>
          )}
          <button onClick={onStartTour} className="btn-secondary" title="操作流程引导">
            <HelpCircle className="h-4 w-4" />
            操作引导
          </button>
        </div>
      </div>
    </div>
  );
};
