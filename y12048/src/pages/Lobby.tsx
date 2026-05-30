import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Play, Star, Zap, Target, BookOpen } from 'lucide-react';
import { scenarios } from '../utils/mockData';
import { useGameStore } from '../store/useGameStore';
import { Difficulty } from '../types/game';
import { cn } from '@/lib/utils';

const difficultyConfig: Record<Difficulty, { color: string; bg: string; label: string }> = {
  easy: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: '简单' },
  normal: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: '普通' },
  hard: { color: 'text-red-400', bg: 'bg-red-500/20', label: '困难' },
};

export const Lobby: React.FC = () => {
  const navigate = useNavigate();
  const { startGame } = useGameStore();

  const handleStartGame = (scenarioId: string) => {
    startGame(scenarioId);
    navigate('/game');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="p-3 bg-violet-500/20 rounded-2xl">
              <Shield className="w-10 h-10 text-violet-400" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              DeFi 清算守卫
            </h1>
          </div>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            通过策略游戏学习DeFi清算规则，守住你的抵押率，抵御预言机风险
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="p-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">抵押率管理</h3>
            <p className="text-slate-400 text-sm">
              学习计算和管理抵押率，理解清算阈值的重要性
            </p>
          </div>
          <div className="p-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700">
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">异常处理</h3>
            <p className="text-slate-400 text-sm">
              应对价格跳变、重复清算、Gas不足等异常场景
            </p>
          </div>
          <div className="p-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">来源追溯</h3>
            <p className="text-slate-400 text-sm">
              每笔操作都有来源记录，支持补录和版本追踪
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-6">选择场景</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {scenarios.map((scenario) => {
            const diff = difficultyConfig[scenario.difficulty];
            return (
              <div
                key={scenario.id}
                className="group p-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 hover:border-violet-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={cn('px-3 py-1 rounded-full text-xs font-medium', diff.bg, diff.color)}>
                    {diff.label}
                  </span>
                  <div className="flex items-center gap-1 text-slate-500">
                    <Star className="w-4 h-4" />
                    <span className="text-sm">{scenario.totalRounds} 回合</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-violet-300 transition-colors">
                  {scenario.name}
                </h3>
                <p className="text-slate-400 text-sm mb-6">
                  {scenario.description}
                </p>
                <div className="text-xs text-slate-500 mb-4 space-y-1">
                  <div>初始借贷: ${scenario.initialPosition.borrowAmount.toLocaleString()}</div>
                  <div>抵押物: {scenario.initialPosition.collateralAmount} {scenario.initialPosition.collateralType}</div>
                  <div>清算阈值: {scenario.initialPosition.liquidationThreshold}%</div>
                </div>
                <button
                  onClick={() => handleStartGame(scenario.id)}
                  className="w-full py-3 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-violet-500/30"
                >
                  <Play className="w-5 h-5" />
                  开始游戏
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-16 p-6 bg-slate-800/30 rounded-2xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">游戏规则</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-400">
            <div>
              <h4 className="text-slate-300 font-medium mb-2">目标</h4>
              <p>在所有回合中守住仓位不被清算，获取最高分数</p>
            </div>
            <div>
              <h4 className="text-slate-300 font-medium mb-2">操作</h4>
              <p>每回合可选择补充抵押物、偿还借贷或观望</p>
            </div>
            <div>
              <h4 className="text-slate-300 font-medium mb-2">清算</h4>
              <p>当抵押率低于清算阈值时触发清算，游戏结束</p>
            </div>
            <div>
              <h4 className="text-slate-300 font-medium mb-2">异常</h4>
              <p>遇到价格跳变、重复清算等异常时，正确处理可避免扣分</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
