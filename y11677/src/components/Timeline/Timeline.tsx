import { useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Gauge } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getSeverityColor } from '../../utils/anomalyDetector';

export const Timeline = () => {
  const {
    frames,
    currentFrameIndex,
    isPlaying,
    playbackSpeed,
    anomalies,
    setCurrentFrameIndex,
    setIsPlaying,
    setPlaybackSpeed,
    nextFrame,
    prevFrame,
    resetData,
  } = useAppStore();

  const timelineRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      const animate = (time: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = time;
        const delta = time - lastTimeRef.current;
        const frameInterval = 50 / playbackSpeed;

        if (delta >= frameInterval) {
          lastTimeRef.current = time;
          const nextIndex = currentFrameIndex + 1;
          if (nextIndex >= frames.length) {
            setIsPlaying(false);
          } else {
            setCurrentFrameIndex(nextIndex);
          }
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        lastTimeRef.current = 0;
      };
    }
  }, [isPlaying, currentFrameIndex, frames.length, playbackSpeed, setCurrentFrameIndex, setIsPlaying]);

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || frames.length === 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newIndex = Math.floor(percentage * (frames.length - 1));
    setCurrentFrameIndex(newIndex);
  }, [frames.length, setCurrentFrameIndex]);

  const handlePlayPause = () => {
    if (currentFrameIndex >= frames.length - 1) {
      setCurrentFrameIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const progress = frames.length > 0 ? (currentFrameIndex / (frames.length - 1)) * 100 : 0;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const millis = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  };

  const currentTime = frames[currentFrameIndex]?.timestamp || 0;
  const startTime = frames[0]?.timestamp || 0;
  const endTime = frames[frames.length - 1]?.timestamp || 0;
  const elapsed = currentTime - startTime;
  const duration = endTime - startTime;

  return (
    <div className="bg-[#0a1628] border-t border-[#00d4ff]/30 p-4">
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={resetData}
            className="p-2 bg-[#1a2a4a] hover:bg-[#2a3a5a] rounded transition-colors"
            title="重置数据"
          >
            <RotateCcw size={16} className="text-gray-400" />
          </button>
          <button
            onClick={() => setCurrentFrameIndex(0)}
            className="p-2 bg-[#1a2a4a] hover:bg-[#2a3a5a] rounded transition-colors"
            title="跳到开始"
          >
            <SkipBack size={16} className="text-gray-400" />
          </button>
          <button
            onClick={prevFrame}
            disabled={currentFrameIndex === 0}
            className="p-2 bg-[#1a2a4a] hover:bg-[#2a3a5a] rounded transition-colors disabled:opacity-50"
            title="上一帧"
          >
            <SkipBack size={16} className="text-[#00d4ff]" />
          </button>
          <button
            onClick={handlePlayPause}
            className="p-3 bg-[#00d4ff] hover:bg-[#00b8e0] rounded transition-colors"
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <Pause size={20} className="text-[#0a1628]" />
            ) : (
              <Play size={20} className="text-[#0a1628]" />
            )}
          </button>
          <button
            onClick={nextFrame}
            disabled={currentFrameIndex >= frames.length - 1}
            className="p-2 bg-[#1a2a4a] hover:bg-[#2a3a5a] rounded transition-colors disabled:opacity-50"
            title="下一帧"
          >
            <SkipForward size={16} className="text-[#00d4ff]" />
          </button>
          <button
            onClick={() => setCurrentFrameIndex(frames.length - 1)}
            className="p-2 bg-[#1a2a4a] hover:bg-[#2a3a5a] rounded transition-colors"
            title="跳到结束"
          >
            <SkipForward size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Gauge size={16} className="text-gray-400" />
          <span className="text-gray-400 text-sm">速度:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="bg-[#1a2a4a] border border-[#00d4ff]/30 rounded px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-[#00d4ff]"
          >
            <option value={0.25}>0.25x</option>
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </div>

        <div className="ml-auto font-mono text-sm text-gray-400">
          <span className="text-[#00d4ff]">{formatTime(elapsed)}</span>
          <span className="mx-2">/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div
        ref={timelineRef}
        onClick={handleTimelineClick}
        className="relative h-8 bg-[#1a2a4a] rounded cursor-pointer overflow-hidden group"
      >
        <div
          className="absolute h-full bg-[#00d4ff]/20 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />

        {anomalies.map((anomaly) => {
          const position = (anomaly.frameIndex / (frames.length - 1)) * 100;
          return (
            <div
              key={anomaly.id}
              className="absolute top-0 w-1 h-full cursor-pointer hover:w-2 transition-all"
              style={{
                left: `${position}%`,
                backgroundColor: getSeverityColor(anomaly.severity),
                opacity: anomaly.severity === 'critical' ? 0.9 : anomaly.severity === 'error' ? 0.7 : 0.5,
              }}
              title={`${anomaly.description}`}
            />
          );
        })}

        <div
          className="absolute top-0 w-0.5 h-full bg-[#00d4ff] shadow-lg shadow-[#00d4ff]/50 z-10"
          style={{ left: `${progress}%` }}
        />

        <div className="absolute inset-x-0 bottom-0 h-6 flex items-end justify-between px-2 pointer-events-none">
          {[0, 25, 50, 75, 100].map((percent) => (
            <div key={percent} className="text-[10px] text-gray-500 font-mono">
              {percent}%
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>帧: {currentFrameIndex + 1} / {frames.length}</span>
          <span>异常: {anomalies.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#ff9500]" />
            <span>警告</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#ff3b30]" />
            <span>错误</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#af0000]" />
            <span>严重</span>
          </div>
        </div>
      </div>
    </div>
  );
};
