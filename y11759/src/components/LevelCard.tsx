import React from 'react';
import { Star, Rocket, ChevronRight } from 'lucide-react';
import type { Level } from '../game/types';

interface LevelCardProps {
  level: Level;
  highScore: number;
  onClick: () => void;
}

const LevelCard: React.FC<LevelCardProps> = ({ level, highScore, onClick }) => {
  const stars = level.difficulty;

  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left bg-slate-800/60 hover:bg-slate-700/80 rounded-2xl p-5 border border-white/10 hover:border-violet-500/50 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/10"
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Rocket className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-bold truncate">{level.name}</h3>
            <div className="flex">
              {Array.from({ length: 3 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < stars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-slate-400 text-sm line-clamp-2">{level.description}</p>
          <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
            <span>燃料: {level.fuelBudget}</span>
            <span>时限: {level.timeLimit}s</span>
            {highScore > 0 && (
              <span className="text-amber-400 font-mono">最高: {highScore}</span>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
      </div>
    </button>
  );
};

export default LevelCard;
