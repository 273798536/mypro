import { Play, Pause, SkipBack, SkipForward, RotateCcw, Eye, EyeOff, Maximize2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatTime } from '@/utils/reportGenerator';
import { cn } from '@/lib/utils';

interface PlaybackControlsProps {
  currentTime: number;
  totalTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  showLabels: boolean;
  showPath: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onToggleLabels: () => void;
  onTogglePath: () => void;
  onReset: () => void;
  onFrameBack: () => void;
  onFrameForward: () => void;
  onFullscreen?: () => void;
}

const speedOptions = [0.25, 0.5, 1, 1.5, 2, 4];

export function PlaybackControls({
  currentTime,
  totalTime,
  isPlaying,
  playbackSpeed,
  showLabels,
  showPath,
  onPlayPause,
  onSeek,
  onSpeedChange,
  onToggleLabels,
  onTogglePath,
  onReset,
  onFrameBack,
  onFrameForward,
  onFullscreen,
}: PlaybackControlsProps) {
  const progress = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    onSeek(percentage * totalTime);
  };

  return (
    <div className="bg-gray-900/95 backdrop-blur border-t border-gray-700 px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-300 hover:text-white"
            title="重置"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={onFrameBack}
            className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-300 hover:text-white"
            title="后退一帧"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={onPlayPause}
            className={cn(
              'p-3 rounded-full transition-colors',
              isPlaying
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            )}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={onFrameForward}
            className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-300 hover:text-white"
            title="前进一帧"
          >
            <SkipForward size={18} />
          </button>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm font-mono w-24">
              {formatTime(currentTime)}
            </span>
            <div
              className="flex-1 h-2 bg-gray-700 rounded-full cursor-pointer relative group"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progress}% - 8px)` }}
              />
            </div>
            <span className="text-gray-400 text-sm font-mono w-24 text-right">
              {formatTime(totalTime)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={playbackSpeed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="bg-gray-800 text-white text-sm px-2 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            {speedOptions.map((speed) => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>

          <button
            onClick={onToggleLabels}
            className={cn(
              'p-2 rounded transition-colors',
              showLabels
                ? 'bg-blue-500/20 text-blue-400'
                : 'hover:bg-gray-700 text-gray-400'
            )}
            title={showLabels ? '隐藏标注' : '显示标注'}
          >
            {showLabels ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>

          <button
            onClick={onTogglePath}
            className={cn(
              'p-2 rounded transition-colors',
              showPath
                ? 'bg-blue-500/20 text-blue-400'
                : 'hover:bg-gray-700 text-gray-400'
            )}
            title={showPath ? '隐藏路径' : '显示路径'}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M2 12h2l2-5 3 10 3-15 3 20 3-10 2 5h2" />
            </svg>
          </button>

          {onFullscreen && (
            <button
              onClick={onFullscreen}
              className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-300 hover:text-white"
              title="全屏"
            >
              <Maximize2 size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
