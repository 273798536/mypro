import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, History } from 'lucide-react';
import LevelCard from '../components/LevelCard';
import { LEVELS } from '../game/levels';
import { getHighScore } from '../game/storage';

const HomePage: React.FC = () => {
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Rocket className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-200 to-purple-200 bg-clip-text text-transparent">
              引力弹弓航行赛
            </h1>
          </div>
          <p className="text-slate-400 max-w-lg mx-auto">
            利用行星引力弹弓，节省燃料，到达目标轨道
          </p>
          <button
            onClick={() => nav('/history')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm transition-all"
          >
            <History className="w-4 h-4" />
            历史记录
          </button>
        </header>

        <div className="space-y-4">
          {LEVELS.map((level) => (
            <LevelCard
              key={level.id}
              level={level}
              highScore={getHighScore(level.id)}
              onClick={() => nav(`/play/${level.id}`)}
            />
          ))}
        </div>

        <footer className="mt-16 text-center text-slate-500 text-sm">
          航天兴趣课 · 引力弹弓演示
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
