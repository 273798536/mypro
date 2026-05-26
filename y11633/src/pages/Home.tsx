import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, History, Trophy, Bot, Package, Zap, AlertTriangle } from 'lucide-react';
import { LEVEL_CONFIGS } from '../data/levels';
import type { GameLevel } from '../types';
import { useGameStore } from '../store/gameStore';

export default function Home() {
  const navigate = useNavigate();
  const initGame = useGameStore(state => state.initGame);
  const [selectedLevel, setSelectedLevel] = useState<GameLevel>('easy');

  const levelCards = [
    {
      id: 'easy' as GameLevel,
      color: 'from-green-600 to-green-800',
      borderColor: 'border-green-500',
      icon: '🌱',
    },
    {
      id: 'medium' as GameLevel,
      color: 'from-yellow-600 to-yellow-800',
      borderColor: 'border-yellow-500',
      icon: '⚡',
    },
    {
      id: 'hard' as GameLevel,
      color: 'from-red-600 to-red-800',
      borderColor: 'border-red-500',
      icon: '🔥',
    },
  ];

  const handleStartGame = () => {
    initGame(selectedLevel);
    navigate('/game');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl mb-6 shadow-lg shadow-blue-600/30">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            仓库机器人拣货赛
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            练习给机器人派单、充电和绕障碍，成为优秀的仓储调度专家！
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">选择难度</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {levelCards.map(card => {
              const config = LEVEL_CONFIGS[card.id];
              const isSelected = selectedLevel === card.id;
              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedLevel(card.id)}
                  className={`relative p-6 rounded-xl cursor-pointer transition-all transform hover:scale-105 bg-gradient-to-br ${card.color} border-2 ${
                    isSelected ? card.borderColor : 'border-transparent'
                  } ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}`}
                >
                  <div className="text-4xl mb-4">{card.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{config.name}</h3>
                  <p className="text-white/80 text-sm mb-4">{config.description}</p>
                  <div className="space-y-1 text-xs text-white/70">
                    <div>🤖 机器人数量: {config.robotCount}</div>
                    <div>📦 订单数量: {config.orderCount}</div>
                    <div>🧱 障碍物: {config.obstacleCount}</div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-bold">✓</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-slate-800/50 rounded-2xl p-8 backdrop-blur border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">游戏玩法</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">派发订单</h3>
                  <p className="text-slate-400 text-sm">
                    选中机器人后，点击订单上的"派单"按钮，机器人会自动规划路径前往货架拣货。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">管理电量</h3>
                  <p className="text-slate-400 text-sm">
                    机器人电量低于50%时可以派遣充电，低于20%将无法接单。合理安排充电时间！
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">规避风险</h3>
                  <p className="text-slate-400 text-sm">
                    注意避免机器人碰撞、低电量接单和订单超时，这些都会扣分！
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">追求高分</h3>
                  <p className="text-slate-400 text-sm">
                    高优先级订单奖励更多，提前完成还有效率加分。合理规划获取最高分！
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleStartGame}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg shadow-blue-600/30"
          >
            <Play className="w-6 h-6" />
            开始游戏
          </button>
          <button
            onClick={() => navigate('/history')}
            className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all transform hover:scale-105 flex items-center justify-center gap-3"
          >
            <History className="w-6 h-6" />
            历史记录
          </button>
        </div>
      </div>
    </div>
  );
}
