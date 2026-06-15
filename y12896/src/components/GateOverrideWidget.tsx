import { useState } from "react";
import { Settings2, Zap } from "lucide-react";
import { usePlaybackStore } from "@/store/playbackStore";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function GateOverrideWidget() {
  const {
    calcResult,
    playbackIndex,
    strategy,
    applyGateOverride,
    latestOverride,
    clearOverride,
  } = usePlaybackStore();

  const current =
    calcResult?.timeline?.[Math.min(playbackIndex, (calcResult?.timeline.length ?? 1) - 1)];
  const [opening, setOpening] = useState(current?.gateOpening ?? 0);
  const [reason, setReason] = useState("");

  if (!current || !calcResult) return null;

  const onApply = async () => {
    await applyGateOverride(current.time, opening, reason || undefined);
    setTimeout(clearOverride, 6000);
  };

  const presets = [0, 25, 50, 75, 100];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-ocean-800/70 to-ocean-900/50 border border-ocean-700/50 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-ocean-200">
          <Settings2 className="w-4 h-4 text-tide-green" />
          <span className="text-sm font-semibold">人工调整闸门</span>
        </div>
        <span className="text-[10px] text-ocean-400 font-mono bg-ocean-900/60 px-2 py-1 rounded-full border border-ocean-700/40">
          当前: {formatTime(current.time)}
        </span>
      </div>

      {latestOverride && (
        <div
          className={cn(
            "mb-4 rounded-xl border-l-4 p-3 text-xs",
            latestOverride.impact.riskLevel === "high"
              ? "border-tide-danger bg-red-950/40 text-red-200"
              : latestOverride.impact.riskLevel === "medium"
              ? "border-tide-warning bg-amber-950/40 text-amber-200"
              : latestOverride.impact.riskLevel === "low"
              ? "border-ocean-400 bg-ocean-900/60 text-ocean-200"
              : "border-tide-green bg-green-950/40 text-green-200"
          )}
        >
          {latestOverride.alert && (
            <div className="font-bold mb-1">{latestOverride.alert.message}</div>
          )}
          {latestOverride.warning && <div>{latestOverride.warning}</div>}
          {latestOverride.alert?.teachingNote && (
            <div className="mt-2 pt-2 border-t border-white/10 opacity-85 leading-relaxed">
              💡 {latestOverride.alert.teachingNote}
            </div>
          )}
          <div className="mt-2 flex gap-3 font-mono text-[10px] opacity-80">
            <span>
              发电量变化:{" "}
              <span
                className={
                  latestOverride.impact.energyDelta >= 0
                    ? "text-tide-green"
                    : "text-tide-danger"
                }
              >
                {latestOverride.impact.energyDelta >= 0 ? "+" : ""}
                {latestOverride.impact.energyDelta} kWh
              </span>
            </span>
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-ocean-300">闸门开度</label>
          <span className="font-mono text-lg font-bold text-tide-green">
            {opening}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={opening}
          onChange={(e) => setOpening(Number(e.target.value))}
          className="w-full accent-tide-green h-2 rounded-full appearance-none bg-ocean-700 cursor-pointer"
        />
        <div className="flex gap-1.5 mt-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setOpening(p)}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition border",
                opening === p
                  ? "bg-tide-green/25 border-tide-green/50 text-tide-green"
                  : "bg-ocean-900/40 border-ocean-700/40 text-ocean-300 hover:bg-ocean-700/40"
              )}
            >
              {p}%
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="text-xs text-ocean-300 block mb-1.5">
          调整原因 <span className="text-ocean-500">(可选)</span>
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {["演示教学", "维护检修", "电网调度", "模拟误操作"].map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={cn(
                "text-[10px] px-2 py-1 rounded-full transition border",
                reason === r
                  ? "bg-ocean-500/30 border-ocean-400/50 text-ocean-100"
                  : "bg-ocean-900/40 border-ocean-700/40 text-ocean-400 hover:text-ocean-200"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onApply}
        className="w-full rounded-xl bg-gradient-to-r from-ocean-500 to-tide-teal hover:from-tide-green hover:to-tide-teal text-white text-sm font-semibold py-2.5 flex items-center justify-center gap-2 transition shadow-lg hover:shadow-glow"
      >
        <Zap className="w-4 h-4" />
        应用并重新计算
      </button>

      {strategy !== "custom" && (
        <p className="mt-2.5 text-[10px] text-ocean-500 text-center leading-relaxed">
          应用调整后将切换为自定义策略
        </p>
      )}
    </div>
  );
}
