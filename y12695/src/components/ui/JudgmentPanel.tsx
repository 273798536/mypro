import { useState } from "react";
import { Sliders, AlertTriangle, CheckCircle, HelpCircle, XCircle } from "lucide-react";
import type { CutAxis, CollisionResult, MeasurementRecord } from "@/types";

interface Props {
  axis: CutAxis;
  value: number;
  boundary: { min: number; max: number };
  collision: CollisionResult | null;
  measurements: MeasurementRecord[];
  onAxisChange: (axis: CutAxis) => void;
  onValueChange: (value: number) => void;
  onSubmit: (
    type: "safe" | "review" | "error",
    recordId: string | null,
    comment: string,
  ) => void;
}

const axisLabels: Record<CutAxis, string> = { x: "X 轴", y: "Y 轴", z: "Z 轴" };

export default function JudgmentPanel({
  axis,
  value,
  boundary,
  collision,
  measurements,
  onAxisChange,
  onValueChange,
  onSubmit,
}: Props) {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const isCrossed = collision?.isCrossed || false;
  const crossDist = collision?.distance || 0;
  const nearBoundary = collision?.nearestBoundary ?? 99;

  const handleSubmit = (type: "safe" | "review" | "error") => {
    onSubmit(type, selectedRecordId, comment);
    setSelectedRecordId(null);
    setComment("");
  };

  return (
    <div className="card-glass p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sliders className="w-5 h-5 text-amber-glow" />
        <h3 className="font-serif text-base font-semibold text-amber-glow">剖切控制与复核判断</h3>
      </div>

      <div className="flex items-center gap-2">
        {(["x", "y", "z"] as CutAxis[]).map((a) => (
          <button
            key={a}
            onClick={() => onAxisChange(a)}
            className={`px-3 py-1.5 rounded text-sm font-semibold transition-all ${
              axis === a
                ? "bg-amber-glow text-mine-900 shadow-glow"
                : "bg-mine-700/60 text-mine-200 hover:bg-mine-600/80"
            }`}
          >
            {axisLabels[a]}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-mine-300/70">
          <span>范围: [{boundary.min.toFixed(2)}, {boundary.max.toFixed(2)}]</span>
          <span className="font-mono">当前: {value.toFixed(3)}</span>
        </div>
        <input
          type="range"
          min={boundary.min - 2}
          max={boundary.max + 2}
          step={0.01}
          value={value}
          onChange={(e) => onValueChange(Number(e.target.value))}
          className={`slider-track w-full ${isCrossed ? "slider-danger" : ""}`}
        />
        <div className="h-1.5 relative">
          <div
            className="absolute h-1.5 bg-mine-600/60 rounded"
            style={{
              left: `${((boundary.min - (boundary.min - 2)) / 4) * 100}%`,
              width: `${((boundary.max - boundary.min) / 4) * 100}%`,
            }}
          />
        </div>
      </div>

      <div
        className={`rounded-lg p-3 border ${
          isCrossed
            ? "bg-warning-error/10 border-warning-error/50"
            : nearBoundary < 0.5
              ? "bg-warning-review/10 border-warning-review/40"
              : "bg-pore-safe/10 border-pore-safe/30"
        }`}
      >
        <div className="flex items-center gap-2 mb-1.5">
          {isCrossed ? (
            <>
              <AlertTriangle className="w-4 h-4 text-warning-error" />
              <span className="text-sm font-semibold text-warning-error">已越界</span>
              <span className="font-mono text-xs text-warning-error/80 ml-auto">
                越界距离 {crossDist.toFixed(3)}
              </span>
            </>
          ) : nearBoundary < 0.5 ? (
            <>
              <HelpCircle className="w-4 h-4 text-warning-review" />
              <span className="text-sm font-semibold text-warning-review">接近边界，建议复核</span>
              <span className="font-mono text-xs text-warning-review/80 ml-auto">
                距边界 {nearBoundary.toFixed(3)}
              </span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 text-pore-glow" />
              <span className="text-sm font-semibold text-pore-glow">处于安全区域</span>
              <span className="font-mono text-xs text-pore-glow/80 ml-auto">
                距边界 {nearBoundary.toFixed(3)}
              </span>
            </>
          )}
        </div>
        {collision && (collision.crossedPores.length > 0 || collision.crossedOutliers.length > 0) && (
          <div className="text-xs text-mine-300/80">
            影响孔隙 {collision.crossedPores.length} 个
            {collision.crossedOutliers.length > 0 &&
              `，离群点 ${collision.crossedOutliers.length} 个`}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-mine-300/70">关联测量记录（可选）</label>
        <select
          value={selectedRecordId || ""}
          onChange={(e) => setSelectedRecordId(e.target.value || null)}
          className="w-full px-3 py-2 rounded bg-mine-900/60 border border-mine-600/50 text-sm text-mine-100 focus:outline-none focus:border-amber-glow/60"
        >
          <option value="">-- 不关联 --</option>
          {measurements.map((m) => (
            <option key={m.id} value={m.id}>
              L{m.sourceLineNumber} · {m.sourceImageName} {m.id.endsWith("-dup") ? "[重复]" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-mine-300/70">复核备注</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder="填写复核意见，如：与物理老师沟通后确认..."
          className="w-full px-3 py-2 rounded bg-mine-900/60 border border-mine-600/50 text-sm text-mine-100 resize-none focus:outline-none focus:border-amber-glow/60"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1">
        <button onClick={() => handleSubmit("safe")} className="btn-safe flex items-center justify-center gap-1.5">
          <CheckCircle className="w-4 h-4" />
          <span>直接可用</span>
        </button>
        <button onClick={() => handleSubmit("review")} className="btn-warning flex items-center justify-center gap-1.5">
          <HelpCircle className="w-4 h-4" />
          <span>需复核</span>
        </button>
        <button onClick={() => handleSubmit("error")} className="btn-danger flex items-center justify-center gap-1.5">
          <XCircle className="w-4 h-4" />
          <span>越界错误</span>
        </button>
      </div>
    </div>
  );
}
