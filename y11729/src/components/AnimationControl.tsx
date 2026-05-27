import React from 'react';
import { Play, Pause, RotateCcw, FastForward, Rewind } from 'lucide-react';

interface AnimationControlProps {
  isPlaying: boolean;
  animationProgress: number;
  currentTime: number;
  totalTime: number;
  speed: number;
  onPlayPause: () => void;
  onReset: () => void;
  onProgressChange: (progress: number) => void;
  onSpeedChange: (speed: number) => void;
}

export const AnimationControl: React.FC<AnimationControlProps> = ({
  isPlaying,
  animationProgress,
  currentTime,
  totalTime,
  speed,
  onPlayPause,
  onReset,
  onProgressChange,
  onSpeedChange,
}) => {
  const formatTime = (t: number) => `${t.toFixed(2)}s`;

  return (
    <div className="bg-gray-800/80 backdrop-blur rounded-xl p-4 border border-gray-700">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title="重置"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onProgressChange(Math.max(0, animationProgress - 0.1))}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title="后退"
          >
            <Rewind className="w-4 h-4" />
          </button>
          <button
            onClick={onPlayPause}
            className="p-3 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors shadow-lg shadow-green-500/25"
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button
            onClick={() => onProgressChange(Math.min(1, animationProgress + 0.1))}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title="快进"
          >
            <FastForward className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1">
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={animationProgress}
            onChange={(e) => onProgressChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-400 font-mono">
            <span className="text-green-400">{formatTime(currentTime)}</span>
            <span className="mx-1">/</span>
            <span>{formatTime(totalTime)}</span>
          </div>

          <div className="flex items-center gap-1">
            {[0.5, 1, 2].map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  speed === s
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
