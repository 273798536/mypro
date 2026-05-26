import { useEffect, useMemo, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Gauge } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';

interface SimulationPlayerProps {
  onTimeUpdate?: (time: number) => void;
}

export function SimulationPlayer({ onTimeUpdate }: SimulationPlayerProps) {
  const {
    isRunning,
    isPaused,
    currentTime,
    speed,
    result,
    currentFrameIndex,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    setSpeed,
    setCurrentFrame,
  } = useSimulationStore();

  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const totalDuration = useMemo(() => {
    if (!result || result.frames.length === 0) return 0;
    return result.frames[result.frames.length - 1].time;
  }, [result]);

  useEffect(() => {
    if (!isRunning || isPaused || !result) return;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const nextFrame = currentFrameIndex + Math.ceil(delta * 60 * speed);
      if (nextFrame >= result.frames.length) {
        setCurrentFrame(result.frames.length - 1);
        stopSimulation();
        return;
      }
      setCurrentFrame(nextFrame);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, isPaused, result, currentFrameIndex, speed, setCurrentFrame, stopSimulation]);

  useEffect(() => {
    onTimeUpdate?.(currentTime);
  }, [currentTime, onTimeUpdate]);

  if (!result) return null;

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="bg-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center gap-4 mb-3">
        <button
          onClick={() => setCurrentFrame(0)}
          className="p-2 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors"
          title="回到开始"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        {isRunning && !isPaused ? (
          <button
            onClick={pauseSimulation}
            className="p-3 rounded-full bg-amber-600 hover:bg-amber-500 text-white transition-colors"
            title="暂停"
          >
            <Pause className="w-6 h-6" />
          </button>
        ) : (
          <button
            onClick={resumeSimulation}
            className="p-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            title="播放"
          >
            <Play className="w-6 h-6" />
          </button>
        )}

        <button
          onClick={stopSimulation}
          className="p-2 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors"
          title="停止"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={() => setCurrentFrame(result.frames.length - 1)}
          className="p-2 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors"
          title="跳到结束"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 ml-4">
          <Gauge className="w-4 h-4 text-slate-400" />
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="bg-slate-700 text-white text-sm px-2 py-1 rounded border border-slate-600 focus:outline-none focus:border-sky-500"
          >
            <option value={0.25}>0.25x</option>
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-slate-400">
          {currentTime.toFixed(2)}s / {totalDuration.toFixed(2)}s
        </div>
      </div>

      <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-sky-500 transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
        <input
          type="range"
          min="0"
          max={result.frames.length - 1}
          value={currentFrameIndex}
          onChange={(e) => setCurrentFrame(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}
