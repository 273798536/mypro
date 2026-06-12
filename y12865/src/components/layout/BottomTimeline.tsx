import { useState, useEffect, useRef, useCallback } from 'react';
import { useSceneStore } from '@/store/sceneStore';
import { useMissionStore } from '@/store/missionStore';
import { Play, Pause, SkipBack, SkipForward, Waves, Gauge } from 'lucide-react';

export default function BottomTimeline() {
  const currentMission = useMissionStore((s) => s.currentMission);
  const timelineProgress = useSceneStore((s) => s.timelineProgress);
  const setTimelineProgress = useSceneStore((s) => s.setTimelineProgress);
  const trajectoryMode = useSceneStore((s) => s.trajectoryMode);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const animate = useCallback(
    (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      setTimelineProgress((prev) => {
        const next = prev + delta * 0.08 * speed;
        if (next >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return next;
      });

      animationRef.current = requestAnimationFrame(animate);
    },
    [setTimelineProgress, speed],
  );

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animate]);

  const handleReset = useCallback(() => {
    setTimelineProgress(0);
    setIsPlaying(false);
  }, [setTimelineProgress]);

  const handleToggle = useCallback(() => {
    if (timelineProgress >= 1) {
      setTimelineProgress(0);
    }
    setIsPlaying((p) => !p);
  }, [timelineProgress, setTimelineProgress]);

  const handleSpeedToggle = useCallback(() => {
    setSpeed((s) => (s >= 3 ? 0.5 : s + 0.5));
  }, []);

  if (!currentMission) return null;

  const pointCount = currentMission.samplePoints.length;
  const visibleCount = Math.min(pointCount, Math.ceil(pointCount * timelineProgress));

  return (
    <div className="h-16 bg-[#0a1425]/95 backdrop-blur-md border-t border-cyan-500/15 flex items-center px-4 gap-4">
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleReset}
          className="w-7 h-7 rounded-lg bg-[#0d1a2d] border border-cyan-500/15 flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
          title="重置"
        >
          <SkipBack size={12} />
        </button>
        <button
          onClick={handleToggle}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/25 to-cyan-400/15 border border-cyan-400/40 flex items-center justify-center text-cyan-200 hover:from-cyan-500/35 hover:to-cyan-400/25 transition-all shadow-[0_0_12px_rgba(0,229,255,0.15)]"
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>
        <button
          onClick={() => setTimelineProgress(1)}
          className="w-7 h-7 rounded-lg bg-[#0d1a2d] border border-cyan-500/15 flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
          title="跳到末尾"
        >
          <SkipForward size={12} />
        </button>
        <button
          onClick={handleSpeedToggle}
          className="px-2 h-7 rounded-lg bg-[#0d1a2d] border border-cyan-500/15 flex items-center gap-1 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
          title="播放速度"
        >
          <Gauge size={11} />
          <span className="text-[10px] font-mono">{speed}x</span>
        </button>
      </div>

      <div className="flex-1 flex items-center gap-3">
        <div className="flex-1 relative">
          <div className="h-1.5 bg-gray-800/60 rounded-full overflow-hidden relative">
            {trajectoryMode === 'both' && (
              <div
                className="absolute top-0 left-0 h-full bg-[#FF6B35]/30 rounded-full transition-all duration-150"
                style={{ width: `${timelineProgress * 100}%` }}
              />
            )}
            <div
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-150 ${
                trajectoryMode === 'raw' ? 'bg-[#FF6B35]/60' : 'bg-gradient-to-r from-cyan-500 to-cyan-400'
              }`}
              style={{ width: `${timelineProgress * 100}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={timelineProgress}
            onChange={(e) => setTimelineProgress(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.6)] pointer-events-none transition-all duration-75"
            style={{ left: `calc(${timelineProgress * 100}% - 7px)` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-[10px] text-gray-500">已加载采样点</p>
          <p className="text-xs font-mono text-cyan-300">
            {visibleCount}<span className="text-gray-600">/</span>{pointCount}
          </p>
        </div>

        <div className="flex items-center gap-2 pl-3 border-l border-gray-700/50">
          {(trajectoryMode === 'raw' || trajectoryMode === 'both') && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded-full bg-[#FF6B35]" />
              <span className="text-[10px] text-gray-500">原始</span>
            </div>
          )}
          {(trajectoryMode === 'cleaned' || trajectoryMode === 'both') && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded-full bg-cyan-400" />
              <span className="text-[10px] text-gray-500">清洗</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 pl-3 border-l border-gray-700/50">
          <Waves size={12} className="text-cyan-500/60" />
          <span className="text-[10px] font-mono text-cyan-300">
            {(timelineProgress * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
