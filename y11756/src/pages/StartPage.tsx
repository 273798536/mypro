import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { Difficulty } from '../types/game.types';
import { Play, Trophy, Shield, Zap, Target, ChevronDown, ChevronUp } from 'lucide-react';

const StartPage: React.FC = () => {
  const navigate = useNavigate();
  const initGame = useGameStore(state => state.initGame);
  const gameHistories = useGameStore(state => state.gameHistories);
  
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('normal');
  const [showRules, setShowRules] = useState(false);

  const difficulties = [
    {
      id: 'easy' as Difficulty,
      name: '简单模式',
      description: '市场波动较小，事件影响温和',
      icon: <Shield className="w-6 h-6" />,
      color: 'from-green-500 to-emerald-400',
    },
    {
      id: 'normal' as Difficulty,
      name: '普通模式',
      description: '标准市场环境，适合新手练习',
      icon: <Target className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-400',
    },
    {
      id: 'hard' as Difficulty,
      name: '困难模式',
      description: '剧烈市场波动，考验真实能力',
      icon: <Zap className="w-6 h-6" />,
      color: 'from-orange-500 to-red-400',
    },
  ];

  const handleStartGame = () => {
    initGame(selectedDifficulty);
    navigate('/game');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzMzQxNTUiIGZpbGwtb3BhY2l0eT0iMC4yIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZoLTJ2LTRoMnY0em0tNiA2aC0ydi00aDJ2NHptMC02aC0ydi00aDJ2NHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
      
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl mb-6 shadow-lg shadow-blue-500/30">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            基金经理调仓赛
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            在12个回合中，通过行业轮动和风险管理，争取最优投资收益。
            <br />
            学习资产配置，规避投资误区，成为真正的基金经理！
          </p>
        </div>

        <div className="w-full max-w-2xl mb-8">
          <h3 className="text-sm font-medium text-slate-400 mb-4 text-center">选择难度</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {difficulties.map((diff) => (
              <button
                key={diff.id}
                onClick={() => setSelectedDifficulty(diff.id)}
                className={`p-5 rounded-2xl border-2 transition-all duration-300 text-left ${
                  selectedDifficulty === diff.id
                    ? `border-transparent bg-gradient-to-br ${diff.color} bg-opacity-20 shadow-lg scale-105`
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <div className={`mb-3 ${selectedDifficulty === diff.id ? 'text-white' : 'text-slate-400'}`}>
                  {diff.icon}
                </div>
                <h4 className={`font-semibold mb-1 ${selectedDifficulty === diff.id ? 'text-white' : 'text-slate-200'}`}>
                  {diff.name}
                </h4>
                <p className={`text-xs ${selectedDifficulty === diff.id ? 'text-white/80' : 'text-slate-400'}`}>
                  {diff.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleStartGame}
          className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 rounded-2xl font-semibold text-lg shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-105 hover:shadow-xl"
        >
          <Play className="w-6 h-6 group-hover:scale-110 transition-transform" />
          开始游戏
        </button>

        <div className="w-full max-w-2xl mt-12">
          <button
            onClick={() => setShowRules(!showRules)}
            className="w-full flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors"
          >
            <span className="font-medium">游戏规则</span>
            {showRules ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {showRules && (
            <div className="mt-4 p-6 bg-slate-800/30 rounded-xl border border-slate-700 space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-blue-400 mb-2">🎯 游戏目标</h4>
                <p className="text-slate-400">在12个回合内，通过调整各行业仓位，实现风险调整后收益最大化。</p>
              </div>
              <div>
                <h4 className="font-semibold text-green-400 mb-2">📊 调仓操作</h4>
                <p className="text-slate-400">每回合可调整各行业权重，交易手续费为成交金额的0.15%，双向收取。</p>
              </div>
              <div>
                <h4 className="font-semibold text-amber-400 mb-2">⚠️ 风险控制</h4>
                <ul className="text-slate-400 list-disc list-inside space-y-1">
                  <li>单行业权重超过30%触发集中度警告</li>
                  <li>连续追涨杀跌会被标记并扣分</li>
                  <li>手续费过高会侵蚀收益</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-purple-400 mb-2">📰 新闻事件</h4>
                <p className="text-slate-400">关注新闻事件对各行业的影响，及时调整持仓以获取超额收益。</p>
              </div>
              <div>
                <h4 className="font-semibold text-cyan-400 mb-2">🏆 评分标准</h4>
                <ul className="text-slate-400 list-disc list-inside space-y-1">
                  <li>风险调整收益 (40%)</li>
                  <li>分散化程度 (25%)</li>
                  <li>手续费效率 (15%)</li>
                  <li>事件响应能力 (20%)</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {gameHistories.length > 0 && (
          <div className="w-full max-w-2xl mt-8">
            <h3 className="text-sm font-medium text-slate-400 mb-4">最近战绩</h3>
            <div className="space-y-2">
              {gameHistories.slice(0, 3).map((history) => (
                <div
                  key={history.gameId}
                  className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-amber-400">{history.grade}</span>
                    <div>
                      <p className="text-sm text-white">得分: {history.totalScore}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(history.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`font-mono font-bold ${history.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {history.totalReturn >= 0 ? '+' : ''}{(history.totalReturn * 100).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StartPage;
