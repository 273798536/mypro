import { useStore } from "@/store";
import { AlertTriangle } from "lucide-react";

export default function BoundaryAnalysis() {
  const { anomalies, selectedAnomalyId } = useStore();

  const anomaly = anomalies.find((a) => a.id === selectedAnomalyId);
  if (!anomaly || !anomaly.isBoundary) return null;

  const barWidth = 280;
  const thresholdPx = (anomaly.thresholdUpper / 1.0) * barWidth;
  const thresholdLowerPx = (anomaly.threshold / 1.0) * barWidth;
  const valuePx = (anomaly.value / 1.0) * barWidth;

  const segments = [
    { label: "数据", content: `当前值 ${anomaly.value}，阈值区间 [${anomaly.threshold}, ${anomaly.thresholdUpper}]` },
    { label: "阈值", content: `距上界 ${(anomaly.thresholdUpper - anomaly.value).toFixed(2)}，距下界 ${(anomaly.value - anomaly.threshold).toFixed(2)}` },
    { label: "影响", content: anomaly.boundaryReason },
  ];

  return (
    <div className="bg-surface-800 rounded-lg border border-amber/30 mt-4 overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-600 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber" />
        <h3 className="font-mono text-sm font-semibold text-amber">边界样本分析</h3>
        <span className="text-xs text-zinc-400 font-mono ml-2">{anomaly.id}</span>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-end gap-1 mb-2">
          <span className="text-xs text-zinc-500 font-mono w-10">0.0</span>
          <div className="relative h-6 flex-1 max-w-[280px]">
            <div className="absolute inset-0 bg-surface-700 rounded" />
            <div
              className="absolute top-0 h-full bg-amber/15 rounded"
              style={{ left: `${thresholdLowerPx}px`, width: `${thresholdPx - thresholdLowerPx}px` }}
            />
            <div
              className="absolute top-0 h-0.5 bg-amber"
              style={{ left: `${thresholdLowerPx}px`, width: `${thresholdPx - thresholdLowerPx}px`, top: "50%", transform: "translateY(-50%)" }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-amber border-2 border-surface-800 shadow-lg shadow-amber/30"
              style={{ left: `${valuePx - 5}px` }}
            />
          </div>
          <span className="text-xs text-zinc-500 font-mono w-10 text-right">1.0</span>
        </div>
        <div className="flex items-center gap-4 mb-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber inline-block" />阈值区间</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber inline-block" />当前值</span>
        </div>

        <div className="space-y-3">
          {segments.map((seg, i) => (
            <div key={i} className="bg-surface-700/50 rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-semibold text-amber bg-amber/10 px-2 py-0.5 rounded">
                  {seg.label}
                </span>
                {i === 2 && <span className="text-xs text-zinc-500">← 为什么影响结论</span>}
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{seg.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
