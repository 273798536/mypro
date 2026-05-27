import { useGameStore } from '@/store/useGameStore';
import { Card } from '@/components/ui/Card';
import { Heart, Trophy, Target, Zap } from 'lucide-react';
import { getTotalLevels } from '@/data/levels';

export function StatusBar() {
  const { score, lives, currentLevel, currentJudgementIndex, judgementPoints } = useGameStore();

  const totalLevels = getTotalLevels();
  const progress = judgementPoints.length > 0
    ? ((currentJudgementIndex + 1) / judgementPoints.length) * 100
    : 0;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-bold">{score}</span>
            <span className="text-slate-400 text-sm">分</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart
                  key={i}
                  className={`w-5 h-5 ${i < lives ? 'text-red-500 fill-red-500' : 'text-slate-600'}`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <span className="text-white">关卡</span>
            <span className="text-cyan-400 font-bold">{currentLevel}</span>
            <span className="text-slate-400 text-sm">/ {totalLevels}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 min-w-[200px]">
          <Target className="w-5 h-5 text-green-400" />
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">当前进度</span>
              <span className="text-white">
                {currentJudgementIndex + 1}/{judgementPoints.length}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
