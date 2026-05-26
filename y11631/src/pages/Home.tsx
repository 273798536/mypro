import React, { useState } from 'react';
import { Play, Trophy, BookOpen, Zap, Target, TrendingUp } from 'lucide-react';
import { Difficulty } from '../engine/types';
import { DIFFICULTY_CONFIGS } from '../engine/config';
import { useGameStore } from '../store/useGameStore';
import { getBestScore } from '../utils/storage';

interface HomeProps {
  onStartGame: (difficulty: Difficulty) => void;
  onShowLeaderboard: () => void;
}

export const Home: React.FC<HomeProps> = ({ onStartGame, onShowLeaderboard }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('beginner');
  const [showRules, setShowRules] = useState(false);

  const difficulties: Array<{ key: Difficulty; color: string; hoverColor: string }> = [
    { key: 'beginner', color: 'border-trade-up/50 hover:border-trade-up', hoverColor: 'hover:bg-trade-up/10' },
    { key: 'intermediate', color: 'border-trade-info/50 hover:border-trade-info', hoverColor: 'hover:bg-trade-info/10' },
    { key: 'expert', color: 'border-trade-warn/50 hover:border-trade-warn', hoverColor: 'hover:bg-trade-warn/10' },
    { key: 'hell', color: 'border-trade-down/50 hover:border-trade-down', hoverColor: 'hover:bg-trade-down/10' },
  ];

  return (
    <div className="min-h-screen bg-terminal-bg flex flex-col">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-trade-up via-trade-info to-trade-event bg-clip-text text-transparent">
              做市商价差挑战
            </h1>
            <p className="text-gray-400 text-lg">
              在订单流中控制库存风险，成为顶级做市商
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-terminal-panel rounded-xl border border-terminal-border p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="text-trade-info" size={20} />
                选择难度
              </h2>
              
              <div className="space-y-3">
                {difficulties.map(({ key, color, hoverColor }) => {
                  const config = DIFFICULTY_CONFIGS[key];
                  const bestScore = getBestScore(key);
                  const isSelected = selectedDifficulty === key;
                  
                  return (
                    <button
                      key={key}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? `${color} bg-white/5`
                          : `border-terminal-border ${hoverColor}`
                      }`}
                      onClick={() => setSelectedDifficulty(key)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white">{config.name}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            波动率 {config.baseVolatility * 100}% · 手续费 {config.feeRate * 100}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">目标</div>
                          <div className="font-mono text-trade-up">{config.targetScore}</div>
                          {bestScore > 0 && (
                            <div className="text-xs text-trade-warn mt-1">最佳: {bestScore.toFixed(0)}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                className="w-full mt-6 py-4 rounded-lg bg-gradient-to-r from-trade-up to-trade-info hover:from-trade-up/80 hover:to-trade-info/80 text-white font-bold text-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                onClick={() => onStartGame(selectedDifficulty)}
              >
                <Play size={20} />
                开始游戏
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-terminal-panel rounded-xl border border-terminal-border p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Zap className="text-trade-warn" size={20} />
                  游戏特色
                </h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-trade-up/20 flex items-center justify-center flex-shrink-0">
                      <TrendingUp size={16} className="text-trade-up" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">真实做市体验</div>
                      <div className="text-xs text-gray-400">双边报价、价差博弈、库存管理</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-trade-warn/20 flex items-center justify-center flex-shrink-0">
                      <Zap size={16} className="text-trade-warn" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">随机事件系统</div>
                      <div className="text-xs text-gray-400">价格跳空、流动性危机、波动率突变</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-trade-event/20 flex items-center justify-center flex-shrink-0">
                      <Trophy size={16} className="text-trade-event" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">排行榜与回放</div>
                      <div className="text-xs text-gray-400">历史成绩、对局回放、策略复盘</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  className="flex-1 py-3 rounded-lg bg-terminal-panel border border-terminal-border hover:border-trade-info text-gray-300 hover:text-trade-info flex items-center justify-center gap-2 transition-colors"
                  onClick={onShowLeaderboard}
                >
                  <Trophy size={18} />
                  排行榜
                </button>
                <button
                  className="flex-1 py-3 rounded-lg bg-terminal-panel border border-terminal-border hover:border-trade-event text-gray-300 hover:text-trade-event flex items-center justify-center gap-2 transition-colors"
                  onClick={() => setShowRules(true)}
                >
                  <BookOpen size={18} />
                  游戏规则
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showRules && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-terminal-panel rounded-xl border border-terminal-border max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-4">游戏规则</h2>
              
              <div className="space-y-4 text-gray-300">
                <div>
                  <h3 className="text-lg font-semibold text-trade-up mb-2">🎯 游戏目标</h3>
                  <p className="text-sm">作为做市商，通过双边报价（同时挂出买单和卖单）赚取买卖价差。在游戏时间结束时获得最高分数。</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-trade-info mb-2">💡 基本操作</h3>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>设置买单价格和卖单价格，点击按钮挂单</li>
                    <li>买单价格低于当前价格，卖单价格高于当前价格</li>
                    <li>当市场价格触及你的报价时，订单会成交</li>
                    <li>点击订单簿上的价格可以快速填充报价</li>
                    <li>可以随时取消未成交的挂单</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-trade-warn mb-2">⚠️ 风险管理</h3>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>库存超过阈值会触发惩罚系数，持续扣分</li>
                    <li>每笔交易需要支付手续费，频繁交易成本高</li>
                    <li>价格跳空可能导致持仓大幅亏损</li>
                    <li>得分低于-5000会被强制平仓，游戏结束</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-trade-event mb-2">🎲 随机事件</h3>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li><span className="text-trade-down">价格跳空</span>：价格瞬间上涨或下跌3-5%</li>
                    <li><span className="text-trade-warn">流动性枯竭</span>：买卖盘深度减半，持续10秒</li>
                    <li><span className="text-trade-info">手续费调整</span>：手续费临时翻倍，持续15秒</li>
                    <li><span className="text-trade-warn">波动率上升</span>：价格波动翻倍，持续20秒</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">📊 得分计算</h3>
                  <p className="text-sm font-mono bg-terminal-bg rounded p-2">
                    总得分 = 已实现盈亏 + 未实现盈亏 - 手续费 - 库存惩罚 + 事件奖励
                  </p>
                </div>
              </div>
              
              <button
                className="w-full mt-6 py-3 rounded-lg bg-trade-info hover:bg-trade-info/80 text-white font-semibold transition-colors"
                onClick={() => setShowRules(false)}
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
