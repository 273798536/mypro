import { useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { formatTime } from '@/utils/humanizer';
import { captureScreenshot } from '@/utils/screenshot';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Camera,
  FileText,
  Gauge,
} from 'lucide-react';
import { getAllConflicts } from '@/utils/conflictDetection';

const speedOptions = [0.5, 1, 1.5, 2];

export function PlaybackControls() {
  const {
    currentTime,
    totalDuration,
    isPlaying,
    playbackSpeed,
    setCurrentTime,
    setIsPlaying,
    setPlaybackSpeed,
    reset,
    addScreenshot,
    setShowReportModal,
    selectedObjectId,
  } = useAppStore();

  const progressRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const allConflicts = getAllConflicts();

  const conflictMarkers = allConflicts
    .filter((c) => !c.resolved)
    .map((c) => ({
      time: c.timestamp,
      color: c.severity === 'critical' ? '#ff0055' : c.severity === 'warning' ? '#ffaa00' : '#00aaff',
    }));

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    setCurrentTime(percentage * totalDuration);
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    setCurrentTime(percentage * totalDuration);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleScreenshot = async () => {
    try {
      const screenshot = await captureScreenshot(
        'stage-container',
        `舞台视图_${formatTime(currentTime).replace(':', '')}`,
        [0, 0, 0],
        [0, 0, 0],
        selectedObjectId ? [selectedObjectId] : [],
        undefined
      );

      if (screenshot) {
        addScreenshot(screenshot);
      }
    } catch (error) {
      console.error('Screenshot failed:', error);
    }
  };

  const handleSkipBackward = () => {
    const prevConflict = [...allConflicts]
      .filter((c) => c.timestamp < currentTime - 0.5 && !c.resolved)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (prevConflict) {
      setCurrentTime(prevConflict.timestamp);
    } else {
      setCurrentTime(Math.max(0, currentTime - 5));
    }
  };

  const handleSkipForward = () => {
    const nextConflict = allConflicts
      .filter((c) => c.timestamp > currentTime + 0.5 && !c.resolved)
      .sort((a, b) => a.timestamp - b.timestamp)[0];

    if (nextConflict) {
      setCurrentTime(nextConflict.timestamp);
    } else {
      setCurrentTime(Math.min(totalDuration, currentTime + 5));
    }
  };

  const progress = (currentTime / totalDuration) * 100;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 p-4"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="max-w-4xl mx-auto">
        <div
          ref={progressRef}
          className="relative h-3 bg-slate-800 rounded-full cursor-pointer mb-4 group"
          onClick={handleProgressClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          {conflictMarkers.map((marker, index) => (
            <div
              key={index}
              className="absolute top-0 bottom-0 w-1 z-10"
              style={{
                left: `${(marker.time / totalDuration) * 100}%`,
                backgroundColor: marker.color,
                boxShadow: `0 0 6px ${marker.color}`,
              }}
              title={`冲突点: ${formatTime(marker.time)}`}
            />
          ))}

          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />

          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
            style={{ left: `calc(${progress}% - 10px)` }}
          >
            <div className="absolute inset-1 bg-cyan-500 rounded-full" />
          </div>

          <div
            className="absolute -top-8 bg-slate-800 text-white text-xs px-2 py-1 rounded font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30"
            style={{ left: `calc(${progress}% - 28px)` }}
          >
            {formatTime(currentTime)}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="重置"
            >
              <SkipBack size={18} />
            </button>

            <button
              onClick={handleSkipBackward}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="上一个冲突"
            >
              <SkipBack size={20} />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-white flex items-center justify-center hover:shadow-lg hover:shadow-cyan-500/30 transition-all hover:scale-105"
              title={isPlaying ? '暂停' : '播放'}
            >
              {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
            </button>

            <button
              onClick={handleSkipForward}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="下一个冲突"
            >
              <SkipForward size={20} />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-sm font-mono"
                title="播放速度"
              >
                <Gauge size={16} />
                {playbackSpeed}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-slate-800 rounded-lg p-1 shadow-xl border border-slate-700/50">
                  {speedOptions.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackSpeed(speed);
                        setShowSpeedMenu(false);
                      }}
                      className={`block w-full px-4 py-1.5 rounded text-sm font-mono transition-colors ${
                        playbackSpeed === speed
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="text-sm font-mono text-slate-400">
            <span className="text-emerald-400">{formatTime(currentTime)}</span>
            <span className="mx-2">/</span>
            <span>{formatTime(totalDuration)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleScreenshot}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors border border-emerald-500/30"
            >
              <Camera size={18} />
              <span className="text-sm">截图</span>
            </button>

            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 hover:from-cyan-500/30 hover:to-blue-500/30 transition-colors border border-cyan-500/30"
            >
              <FileText size={18} />
              <span className="text-sm">生成报告</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
