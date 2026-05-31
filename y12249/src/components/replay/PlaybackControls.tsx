
import React from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentRound: number;
  totalRounds: number;
  speed: number;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSpeedChange: (speed: number) => void;
  onBack: () => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  currentRound,
  totalRounds,
  speed,
  onPlayPause,
  onPrev,
  onNext,
  onSpeedChange,
  onBack,
}) => {
  const speeds = [0.5, 1, 1.5, 2];

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">返回</span>
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={onPrev}
            disabled={currentRound <= 1}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SkipBack className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={onPlayPause}
            className="p-4 rounded-full bg-amber-500 hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/30"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-1" />
            )}
          </button>

          <button
            onClick={onNext}
            disabled={currentRound >= totalRounds}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SkipForward className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-white/50">速度</span>
          <div className="flex gap-1">
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  speed === s
                    ? 'bg-amber-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/60">
            第 {currentRound} / {totalRounds} 回合
          </span>
          <span className="text-sm text-white/60">
            {Math.round((currentRound / totalRounds) * 100)}%
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-300"
            style={{ width: `${(currentRound / totalRounds) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

