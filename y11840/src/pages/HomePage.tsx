import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Users, Brain, Zap, Target, BookOpen, ChevronRight, Star, TrendingUp } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import type { Difficulty } from '@/types';

export default function HomePage() {
  const navigate = useNavigate();
  const initGame = useGameStore(state => state.initGame);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');

  const difficulties: { key: Difficulty; label: string; desc: string; color: string }[] = [
    { key: 'easy', label: '新手模式', desc: '5道题，全部简单难度', color: 'from-green-500 to-emerald-600' },
    { key: 'medium', label: '进阶模式', desc: '10道题，简单+中等难度', color: 'from-blue-500 to-cyan-600' },
    { key: 'hard', label: '挑战模式', desc: '15道题，包含困难难度', color: 'from-orange-500 to-red-600' },
  ];

  const handleStart = () => {
    const cardCount = selectedDifficulty === 'easy' ? 5 : selectedDifficulty === 'medium' ? 10 : 15;
    initGame(selectedDifficulty, cardCount);
    navigate('/game');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e508_1px,transparent_1px),linear-gradient(to_bottom,#4f46e508_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <header className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-6">
            <Zap className="w-4 h-4" />
            <span>游戏化客服培训系统</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            AI 客服
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              分流挑战
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            在模拟场景中快速掌握分流决策能力——判断什么时候交给机器人，什么时候必须转人工。
            <br />玩一局就懂，即时反馈，详细分析。
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="group p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-emerald-500/30 transition-all duration-300 hover:transform hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">AI 机器人处理</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              简单咨询、常见问题、情绪稳定的客户，可交由AI自动处理，释放人工资源。
            </p>
          </div>

          <div className="group p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-orange-500/30 transition-all duration-300 hover:transform hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">转人工坐席</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              投诉、退款、技术故障、愤怒客户等复杂情况，必须及时转人工处理，避免客户流失。
            </p>
          </div>

          <div className="group p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/30 transition-all duration-300 hover:transform hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">继续观察</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              资源紧张时，非紧急问题可先观察或AI处理，待坐席空闲后再跟进。
            </p>
          </div>
        </div>

        <div className="bg-slate-800/40 backdrop-blur-sm rounded-3xl border border-slate-700/50 p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Target className="w-6 h-6 text-blue-400" />
            选择挑战难度
          </h2>
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {difficulties.map(diff => (
              <button
                key={diff.key}
                onClick={() => setSelectedDifficulty(diff.key)}
                className={`p-5 rounded-2xl border-2 transition-all duration-300 text-left ${
                  selectedDifficulty === diff.key
                    ? `bg-gradient-to-br ${diff.color} border-transparent shadow-lg`
                    : 'bg-slate-700/30 border-slate-600/50 hover:border-slate-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`font-semibold ${
                    selectedDifficulty === diff.key ? 'text-white' : 'text-gray-300'
                  }`}>
                    {diff.label}
                  </span>
                  {selectedDifficulty === diff.key && (
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  )}
                </div>
                <p className={`text-sm ${
                  selectedDifficulty === diff.key ? 'text-white/80' : 'text-gray-500'
                }`}>
                  {diff.desc}
                </p>
              </button>
            ))}
          </div>

          <button
            onClick={handleStart}
            className="w-full md:w-auto px-12 py-4 bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 hover:from-blue-500 hover:via-cyan-500 hover:to-emerald-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 mx-auto"
          >
            开始挑战
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/30">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              核心训练目标
            </h3>
            <ul className="space-y-3">
              {[
                '准确识别客户情绪，避免情绪误判',
                '正确理解客户意图，匹配对应处理流程',
                '掌握机器人能力边界，不盲目依赖AI',
                '灵活运用坐席资源，平衡效率与质量',
                '识别脏数据，做出合理判断',
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-gray-300">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => navigate('/rules')}
            className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/30 hover:border-blue-500/30 transition-all duration-300 text-left group"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              查看完整规则
            </h3>
            <p className="text-gray-400 mb-4">
              详细了解12条分流规则、错误类型定义，以及正反案例对比。
            </p>
            <div className="flex items-center gap-2 text-blue-400 group-hover:gap-3 transition-all">
              <span>查看规则说明</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        <footer className="text-center text-gray-500 text-sm">
          <p>© 2024 AI客服分流挑战 · 让培训更高效</p>
        </footer>
      </div>
    </div>
  );
}
