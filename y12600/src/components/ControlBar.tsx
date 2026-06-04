import { Play, Pause, RotateCcw, Flag, Timer, Target } from 'lucide-react';
import type { GamePhase } from '../types';
import { formatDuration } from '../utils/export';

interface ControlBarProps {
  phase: GamePhase;
  elapsedTime: number;
  currentIndex: number;
  totalRecords: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onFinish: () => void;
}

export function ControlBar({
  phase,
  elapsedTime,
  currentIndex,
  totalRecords,
  onStart,
  onPause,
  onResume,
  onRestart,
  onFinish,
}: ControlBarProps) {
  const isPlaying = phase === 'playing';
  const isPaused = phase === 'paused';
  const isFinished = phase === 'finished';
  const isIdle = phase === 'idle';

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-xl">
      <div className="flex items-center gap-3">
        <Target className="w-6 h-6 text-cyan-400" />
        <h1
          className="text-xl font-bold tracking-wide"
          style={{ fontFamily: 'Noto Serif SC, serif' }}
        >
          河道巡检二维标注台
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {isIdle && (
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded transition-all duration-200 font-medium shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Play className="w-5 h-5" />
            开始
          </button>
        )}

        {isPlaying && (
          <>
            <button
              onClick={onPause}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 rounded transition-all duration-200 font-medium shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Pause className="w-5 h-5" />
              暂停
            </button>
            <button
              onClick={onFinish}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 rounded transition-all duration-200 font-medium shadow-lg hover:shadow-rose-500/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Flag className="w-5 h-5" />
              结算
            </button>
          </>
        )}

        {isPaused && (
          <>
            <button
              onClick={onResume}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded transition-all duration-200 font-medium shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Play className="w-5 h-5" />
              继续
            </button>
            <button
              onClick={onFinish}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 rounded transition-all duration-200 font-medium shadow-lg hover:shadow-rose-500/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Flag className="w-5 h-5" />
              结算
            </button>
          </>
        )}

        <button
          onClick={onRestart}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-600 hover:bg-slate-500 rounded transition-all duration-200 font-medium shadow-lg hover:shadow-slate-500/30 hover:-translate-y-0.5 active:translate-y-0"
        >
          <RotateCcw className="w-5 h-5" />
          重开
        </button>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 bg-slate-700/50 px-4 py-2 rounded-lg">
          <Timer className="w-5 h-5 text-cyan-400" />
          <span className="font-mono text-lg font-bold">
            {formatDuration(elapsedTime)}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-slate-700/50 px-4 py-2 rounded-lg">
          <span className="text-slate-400">进度</span>
          <span className="font-mono text-lg font-bold text-cyan-400">
            {isFinished ? totalRecords : currentIndex + (isIdle ? 0 : 1)}
          </span>
          <span className="text-slate-400">/</span>
          <span className="font-mono text-lg">{totalRecords}</span>
        </div>
      </div>
    </div>
  );
}
