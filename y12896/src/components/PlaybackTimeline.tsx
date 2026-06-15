import { Play, Pause, SkipBack, SkipForward, FastForward, Clock } from "lucide-react";
import type { TimelinePoint } from "~/shared/types";
import { formatTime, phaseLabel, phaseColor } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  timeline: TimelinePoint[];
  currentIndex: number;
  isPlaying: boolean;
  speed: number;
  onIndexChange: (idx: number) => void;
  onPlayToggle: () => void;
  onSpeedChange: (speed: number) => void;
}

export default function PlaybackTimeline({
  timeline,
  currentIndex,
  isPlaying,
  speed,
  onIndexChange,
  onPlayToggle,
  onSpeedChange,
}: Props) {
  const total = timeline.length;
  const progress = total > 0 ? (currentIndex / (total - 1)) * 100 : 0;

  const segments: Array<{ start: number; end: number; phase: string }> = [];
  if (timeline.length > 0) {
    let i = 0;
    while (i < timeline.length) {
      const phase = timeline[i].phase;
      let j = i;
      while (j < timeline.length && timeline[j].phase === phase) j++;
      segments.push({
        start: (i / (total - 1)) * 100,
        end: ((j - 1) / (total - 1)) * 100,
        phase,
      });
      i = j;
    }
  }

  const current = timeline[currentIndex];
  const speeds = [0.5, 1, 2, 4];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-ocean-800/70 to-ocean-900/50 border border-ocean-700/50 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-ocean-200">
          <Clock className="w-4 h-4 text-tide-green" />
          <span className="text-sm font-semibold">课堂回放</span>
          <span className="text-xs text-ocean-400 font-mono">
            {current ? formatTime(current.time) : "--:--"} （{currentIndex + 1}/{total}）
          </span>
        </div>
        {current && (
          <span className={cn(
            "text-xs font-bold px-3 py-1 rounded-full",
            phaseColor(current.phase),
            "text-white shadow-md"
          )}>
            {phaseLabel(current.phase)}
          </span>
        )}
      </div>

      <div className="relative h-10 mb-5 cursor-pointer group" onClick={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        onIndexChange(Math.round(ratio * (total - 1)));
      }}>
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3 rounded-full bg-ocean-800 overflow-hidden">
          {segments.map((s, i) => (
            <div
              key={i}
              className={cn("absolute top-0 bottom-0", phaseColor(s.phase))}
              style={{
                left: `${s.start}%`,
                width: `${Math.max(0.4, s.end - s.start)}%`,
                opacity: 0.45,
              }}
            />
          ))}
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-lg border-2 border-tide-green transition-all duration-200 group-hover:scale-110 z-10"
          style={{ left: `calc(${progress}% - 10px)` }}
        />
        {current?.alerts && current.alerts.length > 0 && (
          <div
            className="absolute -top-1 w-3 h-3 rounded-full bg-tide-danger animate-pulse border border-white"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        )}
        <div className="absolute -bottom-0.5 left-0 right-0 flex justify-between text-[9px] text-ocean-500 font-mono px-0.5">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onIndexChange(0)}
            className="w-9 h-9 rounded-lg bg-ocean-700/50 hover:bg-ocean-600/60 text-ocean-200 hover:text-white transition flex items-center justify-center border border-ocean-600/40"
            title="回到开始"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
            className="w-9 h-9 rounded-lg bg-ocean-700/50 hover:bg-ocean-600/60 text-ocean-200 hover:text-white transition flex items-center justify-center border border-ocean-600/40"
            title="上一步"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onPlayToggle}
            className={cn(
              "w-12 h-12 rounded-xl text-white transition flex items-center justify-center border shadow-lg mx-1",
              isPlaying
                ? "bg-gradient-to-br from-tide-warning to-tide-danger border-tide-warning/50 shadow-danger"
                : "bg-gradient-to-br from-tide-green to-tide-teal border-tide-green/50 shadow-glow"
            )}
            title={isPlaying ? "暂停" : "播放"}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <button
            onClick={() => onIndexChange(Math.min(total - 1, currentIndex + 1))}
            className="w-9 h-9 rounded-lg bg-ocean-700/50 hover:bg-ocean-600/60 text-ocean-200 hover:text-white transition flex items-center justify-center border border-ocean-600/40"
            title="下一步"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onIndexChange(total - 1)}
            className="w-9 h-9 rounded-lg bg-ocean-700/50 hover:bg-ocean-600/60 text-ocean-200 hover:text-white transition flex items-center justify-center border border-ocean-600/40"
            title="跳到结束"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <FastForward className="w-3.5 h-3.5 text-ocean-400" />
          <div className="flex rounded-lg overflow-hidden border border-ocean-600/40">
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={cn(
                  "px-3 py-1.5 text-xs font-mono font-bold transition",
                  speed === s
                    ? "bg-tide-green/25 text-tide-green"
                    : "bg-ocean-800/60 text-ocean-300 hover:bg-ocean-700/60"
                )}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-ocean-700/40 flex flex-wrap gap-3 justify-center">
        {[
          { k: "generating", l: "发电", c: "bg-tide-green" },
          { k: "storing", l: "蓄水", c: "bg-ocean-400" },
          { k: "idle", l: "待机", c: "bg-ocean-300" },
          { k: "discarding", l: "弃水", c: "bg-tide-danger" },
        ].map((item) => (
          <div key={item.k} className="flex items-center gap-1.5 text-[11px] text-ocean-300">
            <span className={cn("w-2.5 h-2.5 rounded", item.c)} />
            {item.l}
          </div>
        ))}
      </div>
    </div>
  );
}
