import { useGameStore } from '../../store/useGameStore';
import { Trophy, Target, Clock, Volume2, AlertTriangle } from 'lucide-react';

export function ScorePanel() {
  const { gameResult } = useGameStore();

  if (!gameResult) return null;

  const totalNotes = gameResult.perfectCount + gameResult.earlyCount + gameResult.lateCount + gameResult.missedCount;
  const maxScore = totalNotes * 100;
  const scorePercentage = maxScore > 0 ? Math.round((gameResult.totalScore / maxScore) * 100) : 0;

  const getGrade = (score: number) => {
    if (score >= 90) return { grade: 'S', color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-600/20' };
    if (score >= 80) return { grade: 'A', color: 'text-cyan-400', bg: 'from-cyan-500/20 to-cyan-600/20' };
    if (score >= 70) return { grade: 'B', color: 'text-green-400', bg: 'from-green-500/20 to-green-600/20' };
    if (score >= 60) return { grade: 'C', color: 'text-yellow-400', bg: 'from-yellow-500/20 to-yellow-600/20' };
    return { grade: 'D', color: 'text-red-400', bg: 'from-red-500/20 to-red-600/20' };
  };

  const { grade, color, bg } = getGrade(scorePercentage);

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-3xl border border-slate-700/50">
      <div className="flex items-center gap-3">
        <Trophy className="w-8 h-8 text-amber-400" />
        <h2 className="text-2xl font-bold text-white">练习结算</h2>
      </div>

      <div className={`relative w-40 h-40 rounded-full flex items-center justify-center bg-gradient-to-br ${bg} border-4 ${color.replace('text', 'border')}`}>
        <div className="text-center">
          <div className={`text-6xl font-black ${color}`}>{grade}</div>
          <div className="text-sm text-slate-400 mt-1">{scorePercentage}%</div>
        </div>
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            r="72"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray={`${scorePercentage * 4.52} 452`}
            className={color}
            style={{ opacity: 0.5 }}
          />
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-xl">
          <Target className="w-6 h-6 text-amber-400" />
          <div>
            <div className="text-2xl font-bold text-amber-400">{gameResult.perfectCount}</div>
            <div className="text-xs text-slate-400">完美</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-xl">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <div>
            <div className="text-2xl font-bold text-red-400">{gameResult.earlyCount}</div>
            <div className="text-xs text-slate-400">抢拍</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-xl">
          <Clock className="w-6 h-6 text-yellow-400" />
          <div>
            <div className="text-2xl font-bold text-yellow-400">{gameResult.lateCount}</div>
            <div className="text-xs text-slate-400">延迟</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-xl">
          <Volume2 className="w-6 h-6 text-orange-400" />
          <div>
            <div className="text-2xl font-bold text-orange-400">{gameResult.overpowerCount}</div>
            <div className="text-xs text-slate-400">音量盖过</div>
          </div>
        </div>
      </div>

      <div className="w-full p-4 bg-slate-700/20 rounded-xl">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-400">准确率</span>
          <span className="text-lg font-bold text-cyan-400">{gameResult.accuracy}%</span>
        </div>
        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-1000"
            style={{ width: `${gameResult.accuracy}%` }}
          />
        </div>
      </div>
    </div>
  );
}
