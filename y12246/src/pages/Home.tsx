import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Target, Zap, Trophy, ChevronRight, TrendingUp, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { levels } from '../data/levels';
import { Difficulty } from '../types';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const getDifficultyColor = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-amber-100 text-amber-700';
      case 'hard':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getDifficultyText = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'easy':
        return '入门';
      case 'medium':
        return '进阶';
      case 'hard':
        return '挑战';
      default:
        return difficulty;
    }
  };

  const getDifficultyIcon = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'easy':
        return <TrendingUp className="w-5 h-5" />;
      case 'medium':
        return <ArrowRightLeft className="w-5 h-5" />;
      case 'hard':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Target className="w-5 h-5" />;
    }
  };

  const handleStartLevel = (levelId: string) => {
    navigate(`/game/${levelId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 px-4 py-2 rounded-full mb-6">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400 font-medium">债券投教游戏</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            债券兑付时间线
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            通过模拟真实债券兑付场景，学习如何处理付息顺延、回售漏选、违约误判等复杂情况
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">真实场景</h3>
            <p className="text-slate-400 text-sm">模拟真实债券市场中的兑付场景，涵盖常见的特殊情况</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">即时反馈</h3>
            <p className="text-slate-400 text-sm">每一步操作都有即时反馈，帮助理解正确的处理方式</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
              <Trophy className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">复盘总结</h3>
            <p className="text-slate-400 text-sm">游戏结束后可查看详细复盘报告，导出学习记录</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">选择关卡</h2>
          <p className="text-slate-400">循序渐进，从基础到进阶</p>
        </div>

        <div className="space-y-4">
          {levels.map((level, index) => (
            <div
              key={level.id}
              className="group bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/10 hover:border-amber-500/50 transition-all duration-300 cursor-pointer"
              onClick={() => handleStartLevel(level.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${getDifficultyColor(level.difficulty)}`}>
                    {getDifficultyIcon(level.difficulty)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                        {level.name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(level.difficulty)}`}>
                        {getDifficultyText(level.difficulty)}
                      </span>
                    </div>
                    <p className="text-slate-400">{level.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {level.learningPoints.map((point, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300">
                          {point}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <p className="text-sm text-slate-400">目标分数</p>
                    <p className="text-xl font-bold text-amber-400">{level.targetScore}分</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-500 text-sm">
            💡 提示：游戏中请仔细阅读公告内容，根据实际情况做出判断
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
