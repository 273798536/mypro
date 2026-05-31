import { useEffect, useRef, useCallback } from "react";
import { useFieldStore } from "@/store/fieldStore";
import { Play, Pause, RotateCcw, SkipBack, SkipForward } from "lucide-react";

export default function Timeline() {
  const history = useFieldStore((s) => s.history);
  const currentIndex = useFieldStore((s) => s.currentHistoryIndex);
  const timelineStatus = useFieldStore((s) => s.timelineStatus);
  const goToHistoryIndex = useFieldStore((s) => s.goToHistoryIndex);
  const setTimelineStatus = useFieldStore((s) => s.setTimelineStatus);
  const resetScene = useFieldStore((s) => s.resetScene);
  const isPaused = useFieldStore((s) => s.isPaused);
  const togglePause = useFieldStore((s) => s.togglePause);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handlePlay = useCallback(() => {
    if (timelineStatus === "playing") {
      setTimelineStatus("paused");
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setTimelineStatus("playing");
  }, [timelineStatus, setTimelineStatus]);

  useEffect(() => {
    if (timelineStatus === "playing") {
      intervalRef.current = setInterval(() => {
        const state = useFieldStore.getState();
        if (state.currentHistoryIndex < state.history.length - 1) {
          state.goToHistoryIndex(state.currentHistoryIndex + 1);
        } else {
          state.setTimelineStatus("paused");
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, 600);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timelineStatus]);

  const currentSnapshot = history[currentIndex];

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">时间轴</h3>

      <div className="flex items-center gap-1">
        <button
          onClick={() => goToHistoryIndex(0)}
          className="p-1.5 rounded-md bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors"
          title="回到起点"
        >
          <SkipBack size={12} />
        </button>
        <button
          onClick={handlePlay}
          className="p-1.5 rounded-md bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
          title={timelineStatus === "playing" ? "暂停" : "播放"}
        >
          {timelineStatus === "playing" ? <Pause size={12} /> : <Play size={12} />}
        </button>
        <button
          onClick={() => goToHistoryIndex(history.length - 1)}
          className="p-1.5 rounded-md bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors"
          title="跳到最新"
        >
          <SkipForward size={12} />
        </button>
        <button
          onClick={togglePause}
          className={`p-1.5 rounded-md border transition-colors ${
            isPaused
              ? "bg-yellow-500/20 border-yellow-500/30 text-yellow-300"
              : "bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10"
          }`}
          title={isPaused ? "解除冻结" : "冻结拖拽"}
        >
          {isPaused ? <Pause size={12} /> : <Play size={12} />}
        </button>
        <button
          onClick={resetScene}
          className="p-1.5 rounded-md bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-colors"
          title="重置场景"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={Math.max(0, history.length - 1)}
          value={currentIndex}
          onChange={(e) => goToHistoryIndex(parseInt(e.target.value))}
          className="w-full h-1 rounded-full appearance-none cursor-pointer bg-white/10 accent-cyan-500"
        />
        <div className="flex justify-between text-[8px] text-white/30">
          <span>{history.length > 0 ? `0 / ${history.length - 1}` : "-"}</span>
          <span>{currentIndex} / {history.length - 1}</span>
        </div>
      </div>

      {currentSnapshot && (
        <div className="p-2 rounded-lg bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/60">{currentSnapshot.label}</span>
            <span className="text-[8px] text-white/25 font-mono">
              {new Date(currentSnapshot.timestamp).toLocaleTimeString("zh-CN")}
            </span>
          </div>
          <div className="text-[9px] text-white/30">
            {currentSnapshot.charges.length} 个电荷
            {currentSnapshot.overlapDetected && (
              <span className="text-yellow-400/70 ml-1">⚠ 重叠</span>
            )}
          </div>
        </div>
      )}

      <div className="max-h-[100px] overflow-y-auto space-y-0.5 scrollbar-thin">
        {history.map((snap, idx) => (
          <div
            key={snap.id}
            onClick={() => goToHistoryIndex(idx)}
            className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-all text-[9px] ${
              idx === currentIndex
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                : "text-white/30 hover:text-white/50 hover:bg-white/5"
            }`}
          >
            <span className="font-mono w-4 text-right">{idx}</span>
            <span className="truncate flex-1">{snap.label}</span>
            {snap.overlapDetected && <span className="text-yellow-400/60">⚠</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
