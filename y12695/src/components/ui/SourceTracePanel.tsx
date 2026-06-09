import { FileText, Link2, MapPin, AlertOctagon } from "lucide-react";
import type { MeasurementRecord, Outlier } from "@/types";

interface Props {
  measurements: MeasurementRecord[];
  outliers: Outlier[];
  selectedOutlierId: string | null;
  highlightedId: string | null;
  onHighlight: (id: string | null) => void;
  onSelectOutlier: (id: string | null) => void;
}

export default function SourceTracePanel({
  measurements,
  outliers,
  selectedOutlierId,
  highlightedId,
  onHighlight,
  onSelectOutlier,
}: Props) {
  const selectedOutlier = outliers.find((o) => o.id === selectedOutlierId);

  return (
    <div className="card-glass p-4 space-y-4 h-full overflow-y-auto">
      <div className="flex items-center gap-2">
        <Link2 className="w-5 h-5 text-amber-glow" />
        <h3 className="font-serif text-base font-semibold text-amber-glow">来源追溯</h3>
      </div>

      {selectedOutlier && (
        <div className="rounded-lg p-3 bg-warning-review/10 border border-warning-review/40 space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 text-warning-review" />
            <span className="text-xs font-semibold text-warning-review">选中离群点详情</span>
          </div>
          <p className="text-xs text-mine-200">{selectedOutlier.reason}</p>
          <p className="font-mono text-[11px] text-mine-400">
            坐标 ({selectedOutlier.x.toFixed(2)}, {selectedOutlier.y.toFixed(2)},{" "}
            {selectedOutlier.z.toFixed(2)})
          </p>
          <button
            onClick={() => onSelectOutlier(null)}
            className="text-[11px] text-amber-glow/80 hover:text-amber-glow underline"
          >
            取消选中
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-mine-300/70">
          <FileText className="w-3.5 h-3.5" />
          <span>测量记录 ({measurements.length} 条)</span>
        </div>
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
          {measurements.map((m) => {
            const isDup = m.id.endsWith("-dup");
            const isActive = highlightedId === m.id;
            return (
              <div
                key={m.id}
                onClick={() => onHighlight(isActive ? null : m.id)}
                className={`p-2 rounded border cursor-pointer transition-all text-xs ${
                  isActive
                    ? "bg-amber-glow/15 border-amber-glow/60"
                    : "bg-mine-900/40 border-mine-600/30 hover:border-mine-500/50"
                } ${isDup ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono font-semibold text-amber-glow/90">
                    {m.sourceTableName} · L{m.sourceLineNumber}
                  </span>
                  {isDup && <span className="tag tag-error">重复</span>}
                </div>
                <div className="font-mono text-[10px] text-mine-400 mb-0.5">{m.sourceImageName}</div>
                <div className="text-[11px] text-mine-300/80 flex items-start gap-1">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-pore-glow/60" />
                  <span>{m.remark}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
