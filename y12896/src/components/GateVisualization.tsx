import { useEffect, useMemo } from "react";
import type { TimelinePoint } from "~/shared/types";
import { phaseLabel } from "@/lib/format";

interface Props {
  current?: TimelinePoint | null;
}

export default function GateVisualization({ current }: Props) {
  const gateHeight = 160;
  const totalHeight = 320;
  const baseLevel = 40;

  const openingPercent = current?.gateOpening ?? 0;
  const tideLevel = current?.tideLevel ?? 0;
  const reservoirLevel = current?.reservoirLevel ?? 0;
  const phase = current?.phase ?? "idle";
  const flowRate = current?.flowRate ?? 0;

  const gateOpenHeight = (openingPercent / 100) * gateHeight;
  const closedGateHeight = gateHeight - gateOpenHeight;

  const seaWaterHeight = (tideLevel / 5.5) * 220;
  const resWaterHeight = (reservoirLevel / 5.5) * 220;

  const flowDirection = flowRate > 0 ? "left" : flowRate < 0 ? "right" : "none";
  const isFlowing = Math.abs(flowRate) > 1;

  const particles = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      y: baseLevel + 30 + Math.random() * (gateOpenHeight - 60),
      delay: (i * 0.2).toFixed(2),
      size: 3 + Math.random() * 3,
    }));
  }, [gateOpenHeight, openingPercent]);

  useEffect(() => {
    // re-run for animation
  }, [flowDirection]);

  const statusColor = (() => {
    switch (phase) {
      case "generating":
        return "text-tide-green";
      case "storing":
        return "text-ocean-300";
      case "discarding":
        return "text-tide-danger";
      default:
        return "text-ocean-400";
    }
  })();

  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-ocean-800/60 to-ocean-900/40 border border-ocean-700/50 p-5 shadow-lg overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-ocean-100">闸门状态可视化</h3>
        <div className={`text-xs font-bold px-3 py-1 rounded-full ${statusColor} bg-black/30 border border-current/30`}>
          {phaseLabel(phase)}
        </div>
      </div>

      <div className="relative w-full" style={{ height: totalHeight }}>
        {/* Sea (left side) */}
        <div className="absolute left-0 top-0 bottom-0 w-1/2 flex flex-col justify-end">
          <div className="absolute top-2 left-4 text-[10px] text-ocean-300 font-mono tracking-wider">
            大海
          </div>
          <div
            className="absolute bottom-0 left-0 right-4 mx-2 rounded-t-lg overflow-hidden transition-all duration-700 ease-out"
            style={{
              height: Math.max(8, seaWaterHeight),
              background:
                "linear-gradient(180deg, rgba(59,130,185,0.35) 0%, rgba(30,95,153,0.55) 100%)",
              boxShadow: "inset 0 1px 0 rgba(111,168,205,0.4)",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse-slow" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-ocean-300/50" />
          </div>
          <div className="absolute left-4 font-mono text-xs text-ocean-200" style={{ bottom: Math.max(12, seaWaterHeight) + 6 }}>
            {tideLevel.toFixed(2)}m
          </div>
        </div>

        {/* Reservoir (right side) */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 flex flex-col justify-end">
          <div className="absolute top-2 right-4 text-[10px] text-ocean-300 font-mono tracking-wider">
            水库
          </div>
          <div
            className="absolute bottom-0 right-0 left-4 mx-2 rounded-t-lg overflow-hidden transition-all duration-700 ease-out"
            style={{
              height: Math.max(8, resWaterHeight),
              background:
                "linear-gradient(180deg, rgba(0,201,167,0.30) 0%, rgba(46,196,182,0.45) 100%)",
              boxShadow: "inset 0 1px 0 rgba(0,201,167,0.4)",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/5 to-transparent animate-pulse-slow" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-tide-green/50" />
          </div>
          <div className="absolute right-4 font-mono text-xs text-tide-green" style={{ bottom: Math.max(12, resWaterHeight) + 6 }}>
            {reservoirLevel.toFixed(2)}m
          </div>
        </div>

        {/* Middle dam & gate */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-20 flex flex-col items-center">
          {/* Dam top */}
          <div className="w-16 h-4 bg-gradient-to-b from-stone-500 to-stone-700 rounded-t-sm border border-stone-400/40" />
          {/* Gate top (closed part) */}
          <div
            className="w-12 rounded-b-sm transition-all duration-500 ease-in-out"
            style={{
              height: closedGateHeight,
              background:
                "repeating-linear-gradient(0deg, #64748b 0px, #475569 4px, #334155 8px)",
              boxShadow: "inset 2px 0 0 rgba(255,255,255,0.1), inset -2px 0 0 rgba(0,0,0,0.3)",
              borderLeft: "2px solid #1e293b",
              borderRight: "2px solid #1e293b",
            }}
          />
          {/* Gate opening */}
          <div
            className="relative w-12 overflow-hidden"
            style={{ height: gateOpenHeight }}
          >
            {/* Flowing water visualization */}
            {isFlowing &&
              particles.map((p) => (
                <div
                  key={p.id}
                  className={`absolute rounded-full ${
                    flowDirection === "right"
                      ? "animate-flow-right bg-tide-green/70"
                      : "animate-flow-left bg-ocean-300/70"
                  }`}
                  style={{
                    width: p.size,
                    height: p.size,
                    top: p.y - baseLevel - 30,
                    left: flowDirection === "right" ? 0 : "auto",
                    right: flowDirection === "left" ? 0 : "auto",
                    animationDelay: `${p.delay}s`,
                  }}
                />
              ))}
            {!isFlowing && gateOpenHeight > 20 && (
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ocean-500/10 to-transparent" />
            )}
          </div>
          {/* Dam bottom */}
          <div className="w-16 flex-1 bg-gradient-to-b from-stone-600 to-stone-800 rounded-b-sm border-x-2 border-b-2 border-stone-700/50" />
        </div>

        {/* Flow arrow */}
        {isFlowing && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center"
               style={{ bottom: baseLevel + 30 + gateOpenHeight / 2 - 12 }}>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              phase === "generating"
                ? "bg-tide-green/20 text-tide-green border border-tide-green/40"
                : "bg-tide-danger/20 text-tide-danger border border-tide-danger/40"
            }`}>
              {phase === "generating" ? "⟵ 发电 ⟵" : "⟶ 弃水 ⟶"}
              <span className="ml-1">{Math.abs(flowRate).toFixed(0)}m³/s</span>
            </div>
          </div>
        )}

        {/* Bottom floor */}
        <div className="absolute left-0 right-0 bottom-0 h-8 bg-gradient-to-t from-stone-900/80 to-transparent" />
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="bg-ocean-900/50 rounded-xl p-2.5 border border-ocean-700/40">
          <div className="text-[10px] text-ocean-400 uppercase tracking-wider">闸门开度</div>
          <div className="mt-1 font-mono text-lg font-bold text-ocean-100">{openingPercent}%</div>
        </div>
        <div className="bg-ocean-900/50 rounded-xl p-2.5 border border-ocean-700/40">
          <div className="text-[10px] text-ocean-400 uppercase tracking-wider">水头差</div>
          <div className="mt-1 font-mono text-lg font-bold text-tide-warning">
            {Math.abs(tideLevel - reservoirLevel).toFixed(2)}m
          </div>
        </div>
        <div className="bg-ocean-900/50 rounded-xl p-2.5 border border-ocean-700/40">
          <div className="text-[10px] text-ocean-400 uppercase tracking-wider">流量</div>
          <div className="mt-1 font-mono text-lg font-bold text-white">
            {Math.abs(flowRate).toFixed(0)}<span className="text-xs ml-0.5 text-ocean-300">m³/s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
