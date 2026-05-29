import React, { useState } from 'react';
import { Snowflake, Thermometer, AlertTriangle, BookOpen } from 'lucide-react';
import { levels } from '../data/levels';
import LevelCard from '../components/level-select/LevelCard';

type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';

const LevelSelectPage: React.FC = () => {
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [showRules, setShowRules] = useState(false);

  const filteredLevels = difficultyFilter === 'all'
    ? levels
    : levels.filter(l => l.difficulty === difficultyFilter);

  return (
    <div className="min-h-screen bg-cold-chain-dark text-white">
      <header className="bg-gradient-to-b from-cold-chain-primary/20 to-transparent border-b border-cold-chain-border">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Snowflake className="w-10 h-10 text-cold-chain-primary" />
              <h1 className="font-display font-bold text-4xl bg-gradient-to-r from-cold-chain-primary to-cold-chain-chilled bg-clip-text text-transparent">
                冷链装车闯关
              </h1>
            </div>
            <p className="text-gray-400 font-mono text-lg mb-6">
              掌握冷链物流规范，避免温层混放、顺序错误和超时升温
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-cold-chain-frozen/20 rounded-lg border border-cold-chain-frozen/30">
                <Snowflake className="w-4 h-4 text-cold-chain-frozen" />
                <span className="text-sm font-mono">冷冻区 -18°C以下</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-cold-chain-chilled/20 rounded-lg border border-cold-chain-chilled/30">
                <Thermometer className="w-4 h-4 text-cold-chain-chilled" />
                <span className="text-sm font-mono">冷藏区 2-8°C</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-cold-chain-normal/20 rounded-lg border border-cold-chain-normal/30">
                <AlertTriangle className="w-4 h-4 text-cold-chain-normal" />
                <span className="text-sm font-mono">常温区 无温度要求</span>
              </div>
            </div>

            <button
              onClick={() => setShowRules(!showRules)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cold-chain-panel hover:bg-cold-chain-panel/80 rounded-lg font-mono text-sm transition-colors border border-cold-chain-border"
            >
              <BookOpen className="w-4 h-4" />
              {showRules ? '收起规则说明' : '查看规则说明'}
            </button>
          </div>
        </div>
      </header>

      {showRules && (
        <div className="bg-cold-chain-panel border-b border-cold-chain-border">
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <h3 className="font-display font-bold text-lg mb-4 text-cold-chain-primary">📋 游戏规则</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm font-mono">
              <div className="p-4 bg-cold-chain-dark/50 rounded-lg border border-cold-chain-border/50">
                <h4 className="font-bold text-cold-chain-success mb-2">✓ 正确操作</h4>
                <ul className="space-y-2 text-gray-300">
                  <li>• 冷冻货物只能放入冷冻区格位</li>
                  <li>• 冷藏货物只能放入冷藏区格位</li>
                  <li>• 常温货物放入常温区格位</li>
                  <li>• 先卸货的货物放在靠近车门的格位</li>
                  <li>• 在规定时间内完成所有装车</li>
                </ul>
              </div>
              <div className="p-4 bg-cold-chain-dark/50 rounded-lg border border-cold-chain-border/50">
                <h4 className="font-bold text-cold-chain-danger mb-2">✗ 错误操作</h4>
                <ul className="space-y-2 text-gray-300">
                  <li>• 温层混放导致货物变质</li>
                  <li>• 先卸货被后卸货压住，需要翻货</li>
                  <li>• 装车超时导致温度上升</li>
                  <li>• 易碎品放在下层被压坏</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-4 bg-cold-chain-primary/10 rounded-lg border border-cold-chain-primary/30">
              <p className="text-sm text-gray-300 font-mono">
                <strong className="text-cold-chain-primary">💡 提示：</strong>
                格位的列号越大越靠近车门。卸货顺序数字越小，越早卸货。
                请将早卸货的货物放在列号较大的格位，避免被后卸货的货物挡住。
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-2xl">选择关卡</h2>
          <div className="flex gap-2">
            {(['all', 'easy', 'medium', 'hard'] as const).map(diff => (
              <button
                key={diff}
                onClick={() => setDifficultyFilter(diff)}
                className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors ${
                  difficultyFilter === diff
                    ? 'bg-cold-chain-primary text-white'
                    : 'bg-cold-chain-panel text-gray-400 hover:text-white border border-cold-chain-border'
                }`}
              >
                {diff === 'all' ? '全部' : diff === 'easy' ? '入门' : diff === 'medium' ? '进阶' : '挑战'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLevels.map(level => (
            <LevelCard key={level.id} level={level} />
          ))}
        </div>

        {filteredLevels.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 font-mono">没有找到符合条件的关卡</p>
          </div>
        )}
      </main>

      <footer className="border-t border-cold-chain-border py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-gray-500 font-mono">
            冷链装车闯关培训系统 · 物流培训专用
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LevelSelectPage;
