import React, { useState } from 'react';
import { Zap, Play, Database, History, HelpCircle, ChevronRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { levels } from '../data/levels';
import { cn } from '../lib/utils';
import { useGameStore } from '../store/useGameStore';

export const MainMenu: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const { savedGames } = useGameStore();

  const difficultyColors = {
    easy: 'border-success-green text-success-green hover:bg-success-green/10',
    medium: 'border-warning-amber text-warning-amber hover:bg-warning-amber/10',
    hard: 'border-danger-red text-danger-red hover:bg-danger-red/10',
  };

  const difficultyLabels = {
    easy: '初级',
    medium: '中级',
    hard: '高级',
  };

  const filteredLevels = levels.filter(l => l.difficulty === selectedDifficulty);

  const menuItems = [
    {
      icon: <Database className="w-6 h-6" />,
      label: '数据管理',
      description: '导入故障卡和电量表数据',
      onClick: () => navigate('/data'),
      color: 'text-power-blue hover:text-power-blue',
    },
    {
      icon: <History className="w-6 h-6" />,
      label: '历史记录',
      description: '查看和加载已保存的游戏',
      onClick: () => {},
      color: 'text-success-green hover:text-success-green',
      badge: savedGames.length > 0 ? `${savedGames.length}局` : null,
    },
    {
      icon: <HelpCircle className="w-6 h-6" />,
      label: '游戏帮助',
      description: '了解游戏规则和操作说明',
      onClick: () => {},
      color: 'text-warning-amber hover:text-warning-amber',
    },
  ];

  return (
    <div className="min-h-screen bg-circuit-bg text-text-primary relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(77, 166, 255, 0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(77, 166, 255, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-circuit-bg/50 to-circuit-bg" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="relative">
              <Zap className="w-16 h-16 text-power-blue animate-pulse" />
              <div className="absolute inset-0 bg-power-blue/30 blur-xl animate-pulse" />
            </div>
            <h1 className="font-display text-5xl md:text-6xl font-bold">
              <span className="text-power-blue">网格</span>
              <span className="text-text-primary">电路</span>
              <br />
              <span className="text-success-green">抢修战</span>
            </h1>
          </div>
          <p className="text-text-secondary font-mono text-lg max-w-xl mx-auto">
            连接电源，修复故障，阻止短路扩散
            <br />
            <span className="text-text-muted">物理社团专属教学游戏</span>
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="bg-circuit-card/60 backdrop-blur-sm rounded-2xl border border-circuit-border p-6 mb-8">
            <h2 className="font-display text-xl mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-success-green" />
              开始游戏
            </h2>

            <div className="flex gap-2 mb-6">
              {(['easy', 'medium', 'hard'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={cn(
                    'flex-1 py-3 px-4 rounded-lg border-2 font-mono text-sm transition-all',
                    selectedDifficulty === diff
                      ? difficultyColors[diff]
                      : 'border-circuit-border text-text-muted hover:border-circuit-border'
                  )}
                >
                  {difficultyLabels[diff]}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLevels.map(level => (
                <button
                  key={level.id}
                  onClick={() => navigate(`/game/${level.id}`)}
                  className="group bg-circuit-dark/50 rounded-xl border border-circuit-border p-4 text-left hover:border-power-blue transition-all hover:shadow-neon-blue"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-display text-lg text-text-primary group-hover:text-power-blue transition-colors">
                      {level.name}
                    </h3>
                    <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-power-blue transition-colors" />
                  </div>
                  <p className="text-xs text-text-secondary mb-3 font-mono">
                    {level.description}
                  </p>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-text-muted">
                      {level.gridSize.width}×{level.gridSize.height} 网格
                    </span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 3 }, (_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'w-3 h-3',
                            (level.difficulty === 'easy' && i < 1) ||
                            (level.difficulty === 'medium' && i < 2) ||
                            (level.difficulty === 'hard' && i < 3)
                              ? 'text-warning-amber fill-warning-amber'
                              : 'text-circuit-border'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className="bg-circuit-card/60 backdrop-blur-sm rounded-xl border border-circuit-border p-5 text-left hover:border-power-blue transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn('transition-colors', item.color)}>
                    {item.icon}
                  </div>
                  {item.badge && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-power-blue/20 text-power-blue font-mono">
                      {item.badge}
                    </span>
                  )}
                </div>
                <h3 className="font-display text-base text-text-primary mb-1 group-hover:text-power-blue transition-colors">
                  {item.label}
                </h3>
                <p className="text-xs text-text-secondary font-mono">
                  {item.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center mt-12 text-xs text-text-muted font-mono">
          <p>版本 1.0.0 | 物理社团教学游戏</p>
          <p className="mt-1">电源节点 → 电路连通 → 故障修复 → 成绩导出</p>
        </div>
      </div>
    </div>
  );
};
