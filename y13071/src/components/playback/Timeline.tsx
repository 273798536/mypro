import { Play, Pause, Gauge } from "lucide-react";
import { usePlaybackStore } from "@/stores/playbackStore";
import { useMemo, useState } from "react";

function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const SPEEDS = [0.5, 1, 2, 4, 8];

export function Timeline() {
  const { currentTimestamp, duration, isPlaying, speed, toggle, seek, setSpeed, keyframes } =
    usePlaybackStore();
  const [hover, setHover] = useState<number | null>(null);

  const progress = (currentTimestamp / duration) * 100;

  const markers = useMemo(
    () =>
      keyframes.map((k) => ({
        left: (k.timestamp / duration) * 100,
        type: k.type,
        id: k.refId,
      })),
    [keyframes, duration]
  );

  return (
    <div className="absolute left-0 right-0 bottom-0 z-30 px-4 pb-4">
      <div className="glass rounded-xl border border-mine-700/60 p-3 scan-bg">
        <div className="flex items-center gap-4">
          <button
            onClick={toggle}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-cable-500/20 border border-cable-500/50 text-cable-300 hover:bg-cable-500/35 shadow-glow-cable transition"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <div className="font-mono text-[13px] text-silver-200 tabular-nums min-w-[78px]">
            {fmtTime(currentTimestamp)}
          </div>

          <div className="flex-1 relative h-10 flex items-center">
            <div className="absolute left-0 right-0 h-1.5 rounded-full bg-mine-800 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cable-500 via-cable-400 to-mine-600"
                style={{ width: `${progress}%` }}
              />
            </div>
            {markers.map((m, i) => (
              <div
                key={`${m.id}-${i}`}
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-5 rounded-sm"
                style={{
                  left: `calc(${m.left}% - 3px)`,
                  background:
                    m.type === "ANOMALY" ? "#ff6b35" : "#9fb3c8",
                  boxShadow:
                    m.type === "ANOMALY"
                      ? "0 0 6px rgba(255,107,53,0.8)"
                      : "none",
                }}
                title={m.type === "ANOMALY" ? "异常点" : "批注点"}
              />
            ))}
            <input
              type="range"
              min={0}
              max={duration}
              step={1}
              value={currentTimestamp}
              onChange={(e) => seek(Number(e.target.value))}
              onMouseMove={(e) => {
                const rect = (e.currentTarget as HTMLInputElement).getBoundingClientRect();
                const x = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, x / rect.width));
                setHover(ratio * duration);
              }}
              onMouseLeave={() => setHover(null)}
              className="cable-range absolute inset-0 opacity-100"
            />
            {hover !== null && (
              <div
                className="absolute -top-7 px-2 py-0.5 rounded bg-mine-900 border border-cable-500/40 text-[10px] font-mono text-cable-300 pointer-events-none"
                style={{ left: `calc(${(hover / duration) * 100}% - 28px)` }}
              >
                {fmtTime(hover)}
              </div>
            )}
          </div>

          <div className="font-mono text-[13px] text-silver-400 tabular-nums min-w-[78px] text-right">
            {fmtTime(duration)}
          </div>

          <div className="flex items-center gap-1 pl-2 border-l border-mine-700/60">
            <Gauge className="w-3.5 h-3.5 text-silver-400" />
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                  speed === s
                    ? "bg-cable-500/25 text-cable-300 border border-cable-500/50"
                    : "text-silver-400 hover:text-silver-200"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
