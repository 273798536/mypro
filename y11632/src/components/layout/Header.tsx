import { useGameStore } from '@/store/gameStore';
import { useGameTimer } from '@/hooks/useGameTimer';
import { Trophy, Clock, Star, Pause } from 'lucide-react';

interface HeaderProps {
  levelName?: string;
  onPause?: () => void;
  showTimer?: boolean;
}

export default function Header({ levelName, onPause, showTimer = true }: HeaderProps) {
  const score = useGameStore(state => state.score);
  const { formattedTime, isRunning } = useGameTimer();

  return (
    <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-amber-400">
            债券久期拼图
          </h1>
          {levelName && (
            <span className="text-sm text-slate-400">
              | {levelName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-lg text-amber-400">{score}</span>
            <span className="text-sm text-slate-500">分</span>
          </div>

          {showTimer && (
            <div className="flex items-center gap-2">
              <Clock className={`w-5 h-5 ${isRunning ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className={`font-mono font-bold ${
                isRunning ? 'text-emerald-400' : 'text-slate-500'
              }`}>
                {formattedTime}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <Star className="w-5 h-5 text-slate-600" />
          </div>

          {onPause && (
            <button
              onClick={onPause}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              <Pause className="w-5 h-5 text-slate-300" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
