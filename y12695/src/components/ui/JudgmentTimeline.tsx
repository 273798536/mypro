import { History, CheckCircle, HelpCircle, XCircle } from "lucide-react";
import type { Judgment, MeasurementRecord } from "@/types";

interface Props {
  judgments: Judgment[];
  measurements: MeasurementRecord[];
}

export default function JudgmentTimeline({ judgments, measurements }: Props) {
  const typeIcon = {
    safe: <CheckCircle className="w-3.5 h-3.5 text-pore-glow" />,
    review: <HelpCircle className="w-3.5 h-3.5 text-warning-review" />,
    error: <XCircle className="w-3.5 h-3.5 text-warning-error" />,
  };
  const typeLabel = {
    safe: "直接可用",
    review: "需复核",
    error: "越界错误",
  };
  const typeTag = {
    safe: "tag-safe",
    review: "tag-review",
    error: "tag-error",
  };

  return (
    <div className="card-glass p-4 space-y-3">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-amber-glow" />
        <h3 className="font-serif text-base font-semibold text-amber-glow">本轮判断记录</h3>
        <span className={`tag ml-auto ${judgments.length === 0 ? "tag-review" : "tag-safe"}`}>
          {judgments.length} 条
        </span>
      </div>

      {judgments.length === 0 ? (
        <div className="text-center text-sm text-mine-400/70 py-8">
          尚未进行任何判断，调整剖切平面后提交判断
        </div>
      ) : (
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {judgments.map((j, idx) => {
            const rec = measurements.find((m) => m.id === j.measurementRecordId);
            const time = new Date(j.timestamp).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            return (
              <div
                key={j.id}
                className="p-2.5 rounded bg-mine-900/40 border border-mine-600/30 text-xs"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-mine-400 font-mono w-6">#{idx + 1}</span>
                  {typeIcon[j.type]}
                  <span className={`tag ${typeTag[j.type]}`}>{typeLabel[j.type]}</span>
                  <span className="font-mono text-[10px] text-mine-400 ml-auto">{time}</span>
                </div>
                <div className="font-mono text-[11px] text-mine-300 mb-1">
                  {j.cutAxis.toUpperCase()} = {j.cutValue.toFixed(3)}
                  {j.isBoundaryCrossed && (
                    <span className="text-warning-error ml-2">
                      · 越界 {j.crossDistance.toFixed(3)}
                    </span>
                  )}
                </div>
                {rec && (
                  <div className="text-[10px] text-mine-400">
                    ↳ {rec.sourceTableName} L{rec.sourceLineNumber} · {rec.sourceImageName}
                  </div>
                )}
                {j.comment && (
                  <div className="text-[11px] text-amber-glow/80 mt-0.5">💬 {j.comment}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
