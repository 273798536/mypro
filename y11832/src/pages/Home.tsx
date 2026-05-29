import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Train, AlertTriangle, Settings, BarChart3, Clock, Users, Star, Zap } from 'lucide-react';
import { levels } from '../data/levels';
import { useGameStore } from '../store/gameStore';

const difficultyConfig = {
  easy: { label: '简单', color: 'bg-metro-green', borderColor: 'border-metro-green', hoverBorderClass: 'hover:border-metro-green' },
  medium: { label: '中等', color: 'bg-metro-yellow', borderColor: 'border-metro-yellow', hoverBorderClass: 'hover:border-metro-yellow' },
  hard: { label: '困难', color: 'bg-metro-red', borderColor: 'border-metro-red', hoverBorderClass: 'hover:border-metro-red' },
};

export default function Home() {
  const navigate = useNavigate();
  const initGame = useGameStore((state) => state.initGame);
  const results = useGameStore((state) => state.results);

  const handleStartGame = (levelId: string) => {
    initGame(levelId);
    navigate('/game');
  };

  const getBestScore = (levelId: string) => {
    const levelResults = results.filter((r) => r.gameId.includes(levelId));
    if (levelResults.length === 0) return null;
    return Math.max(...levelResults.map((r) => r.totalScore));
  };

  return (
    <div className="min-h-screen bg-metro-bg text-metro-text">
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none" />
      
      <header className="relative border-b border-metro-border bg-metro-bgDark/80 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-metro-yellow/20 rounded-lg">
                <Train className="text-metro-yellow" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold font-mono tracking-wider">地铁疏散指挥台</h1>
                <p className="text-xs text-metro-textMuted">METRO EVACUATION COMMAND CENTER</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 px-4 py-2 bg-metro-bg hover:bg-metro-bgLight border border-metro-border rounded-lg transition-all group"
              >
                <Settings className="text-metro-textMuted group-hover:text-metro-blue transition-colors" size={18} />
                <span className="text-sm">管理后台</span>
              </button>
              <button
                onClick={() => navigate('/compare')}
                className="flex items-center gap-2 px-4 py-2 bg-metro-bg hover:bg-metro-bgLight border border-metro-border rounded-lg transition-all group"
              >
                <BarChart3 className="text-metro-textMuted group-hover:text-metro-green transition-colors" size={18} />
                <span className="text-sm">结果对比</span>
              </button>
              <button
                onClick={() => navigate('/changes')}
                className="flex items-center gap-2 px-4 py-2 bg-metro-bg hover:bg-metro-bgLight border border-metro-border rounded-lg transition-all group"
              >
                <Zap className="text-metro-textMuted group-hover:text-metro-orange transition-colors" size={18} />
                <span className="text-sm">变更追踪</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-metro-red/10 border border-metro-red/30 rounded-full mb-4">
            <AlertTriangle className="text-metro-red" size={16} />
            <span className="text-metro-red text-sm font-medium">晚高峰应急训练模式</span>
          </div>
          <h2 className="text-3xl font-bold mb-2">选择训练关卡</h2>
          <p className="text-metro-textMuted">通过模拟真实应急场景，提升站务人员的疏散指挥能力</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {levels.map((level) => {
            const difficulty = difficultyConfig[level.difficulty];
            const bestScore = getBestScore(level.id);
            
            return (
              <div
                key={level.id}
                className={`metro-panel group ${difficulty.hoverBorderClass} transition-all cursor-pointer`}
                onClick={() => handleStartGame(level.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${difficulty.color} mb-2`}>
                      {difficulty.label}
                    </div>
                    <h3 className="text-xl font-bold mb-1">{level.name}</h3>
                  </div>
                  {bestScore !== null && (
                    <div className="text-right">
                      <div className="text-xs text-metro-textMuted">最高分</div>
                      <div className="text-xl font-bold text-metro-yellow font-mono">{bestScore}</div>
                    </div>
                  )}
                </div>

                <p className="text-sm text-metro-textMuted mb-4 leading-relaxed">
                  {level.description}
                </p>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 bg-metro-bg rounded">
                    <Clock className="mx-auto text-metro-blue mb-1" size={16} />
                    <div className="text-xs text-metro-textMuted">时长</div>
                    <div className="text-sm font-bold font-mono">{level.duration}s</div>
                  </div>
                  <div className="text-center p-2 bg-metro-bg rounded">
                    <Users className="mx-auto text-metro-green mb-1" size={16} />
                    <div className="text-xs text-metro-textMuted">目标客流</div>
                    <div className="text-sm font-bold font-mono">{level.targetPassengers}</div>
                  </div>
                  <div className="text-center p-2 bg-metro-bg rounded">
                    <Star className="mx-auto text-metro-yellow mb-1" size={16} />
                    <div className="text-xs text-metro-textMuted">故障闸机</div>
                    <div className="text-sm font-bold font-mono">{level.initialFaultyGates.length}台</div>
                  </div>
                </div>

                <button
                  className={`w-full py-3 rounded-lg font-bold transition-all ${difficulty.color.replace('bg-', 'bg-').replace('metro-', 'hover:bg-metro-').replace(/(green|yellow|red)/, '$1/80')} text-white group-hover:scale-[1.02]`}
                >
                  开始训练
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="metro-panel text-center">
            <div className="text-3xl font-bold text-metro-yellow mb-1">{results.length}</div>
            <div className="text-sm text-metro-textMuted">累计训练次数</div>
          </div>
          <div className="metro-panel text-center">
            <div className="text-3xl font-bold text-metro-green mb-1">
              {results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.totalScore, 0) / results.length) : 0}
            </div>
            <div className="text-sm text-metro-textMuted">平均得分</div>
          </div>
          <div className="metro-panel text-center">
            <div className="text-3xl font-bold text-metro-blue mb-1">
              {results.length > 0 ? Math.max(...results.map((r) => r.totalScore)) : 0}
            </div>
            <div className="text-sm text-metro-textMuted">最高得分</div>
          </div>
          <div className="metro-panel text-center">
            <div className="text-3xl font-bold text-metro-orange mb-1">
              {results.filter((r) => r.grade === 'S' || r.grade === 'A').length}
            </div>
            <div className="text-sm text-metro-textMuted">优秀评级次数</div>
          </div>
        </div>
      </main>
    </div>
  );
}