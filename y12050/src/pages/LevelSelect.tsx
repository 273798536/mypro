import { useNavigate } from 'react-router-dom';
import { Brain, Timer, Lightbulb, ChevronRight, GraduationCap, BookOpen } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { levels } from '@/data/levels';
import type { UserRole } from '@/types';
import { twMerge } from 'tailwind-merge';

const difficultyColors: Record<string, string> = {
  easy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  hard: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

const difficultyLabels: Record<string, string> = {
  easy: '入门',
  medium: '进阶',
  hard: '挑战',
};

export default function LevelSelect() {
  const navigate = useNavigate();
  const { userRole, setRole, selectLevel, addDemoReviewCases } = useGameStore();

  const handleLevelClick = (levelId: string) => {
    selectLevel(levelId);
    navigate(`/level/${levelId}`);
  };

  const handleRoleSwitch = (role: UserRole) => {
    setRole(role);
    if (role === 'instructor') {
      addDemoReviewCases();
      navigate('/review');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent_60%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,212,170,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,170,0.015)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      <header className="relative border-b border-slate-800/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">核磁共振调参局</h1>
              <p className="text-xs text-slate-500">MRI 参数调优培训</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/80 rounded-xl p-1 border border-slate-800">
            <button
              onClick={() => handleRoleSwitch('student')}
              className={twMerge(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                userRole === 'student'
                  ? 'bg-cyan-500/20 text-cyan-400 shadow-inner'
                  : 'text-slate-400 hover:text-slate-300'
              )}
            >
              <GraduationCap className="w-4 h-4" />
              学员模式
            </button>
            <button
              onClick={() => handleRoleSwitch('instructor')}
              className={twMerge(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                userRole === 'instructor'
                  ? 'bg-cyan-500/20 text-cyan-400 shadow-inner'
                  : 'text-slate-400 hover:text-slate-300'
              )}
            >
              <BookOpen className="w-4 h-4" />
              讲师模式
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-cyan-400 via-blue-400 to-slate-300 bg-clip-text text-transparent">
            选择调参关卡
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            调整 MRI 扫描参数，观察图像质量变化，在时间预算内获得最佳成像效果
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {levels.map((level) => (
            <button
              key={level.id}
              onClick={() => handleLevelClick(level.id)}
              className="group relative text-left bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-cyan-500/40 hover:bg-slate-800/40 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/5 hover:-translate-y-1"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-cyan-500/30 transition-colors">
                    <Brain className="w-6 h-6 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <span className={twMerge('px-2.5 py-1 text-xs font-medium rounded-lg border', difficultyColors[level.difficulty])}>
                    {difficultyLabels[level.difficulty]}
                  </span>
                </div>

                <h3 className="text-lg font-semibold mb-1 group-hover:text-cyan-400 transition-colors">{level.name}</h3>
                <p className="text-sm text-slate-500 mb-4">目标部位：{level.targetPart}</p>
                <p className="text-sm text-slate-400 mb-4 line-clamp-2">{level.description}</p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Timer className="w-4 h-4" />
                    <span className="text-sm">{level.timeBudget}s 预算</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-16 max-w-2xl mx-auto">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-cyan-400" />
              培训提示
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400">•</span>
                参数模板包含真实场景中的空行、备注、缺列和噪声条
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400">•</span>
                参数冲突会红色高亮阻止结算，确保您看到这条失败路径
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400">•</span>
                结算后可查看完整分数解释，导出含坏行列表的 CSV 报告
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
