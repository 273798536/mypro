import { useBatchStore } from '@/store/useBatchStore';
import { countDifficulties } from '@/utils/difficultyEngine';
import { BarChart3 } from 'lucide-react';

export default function DifficultyDistribution() {
  const { batch } = useBatchStore();
  const counts = countDifficulties(batch.problems);
  const total = counts.easy + counts.medium + counts.hard || 1;
  const actual = {
    easy: (counts.easy / total) * 100,
    medium: (counts.medium / total) * 100,
    hard: (counts.hard / total) * 100,
  };
  const target = {
    easy: batch.params.targetEasyRatio * 100,
    medium: batch.params.targetMediumRatio * 100,
    hard: batch.params.targetHardRatio * 100,
  };

  const rows = [
    { key: 'easy', label: '简单题', color: 'bg-teal-500', count: counts.easy },
    { key: 'medium', label: '中等题', color: 'bg-amber-500', count: counts.medium },
    { key: 'hard', label: '困难题', color: 'bg-red-500', count: counts.hard },
  ] as const;

  const overallPassed = batch.conclusions.find((c) => c.key === 'overall_balance')?.passed;

  return (
    <section className="card-base p-5 animate-fade-up" style={{ animationDelay: '200ms' }}>
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-navy-500" />
          <h2 className="font-serif text-base font-semibold text-navy-700">难度分布对比</h2>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded border ${
            overallPassed
              ? 'bg-teal-50 text-teal-600 border-teal-200'
              : 'bg-red-50 text-red-600 border-red-200'
          }`}
        >
          整体均衡：{overallPassed ? '通过' : '待调整'}
        </span>
      </header>

      <div className="space-y-3">
        {rows.map(({ key, label, color, count }) => {
          const gap = actual[key] - target[key];
          const passed = Math.abs(gap) <= 5;
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className="text-navy-700 font-medium">{label}</span>
                <span className="text-navy-500">
                  <b className="text-navy-800">{actual[key].toFixed(1)}%</b>
                  <span className="mx-1">/ 目标 {target[key].toFixed(0)}%</span>
                  <span className={`ml-1 ${passed ? 'text-teal-600' : 'text-red-500'}`}>
                    {gap >= 0 ? '+' : ''}
                    {gap.toFixed(1)}%
                  </span>
                </span>
              </div>
              <div className="relative h-6 rounded bg-slate-100 overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full opacity-30 border-r border-dashed border-navy-400"
                  style={{ width: `${target[key]}%` }}
                  title={`目标线 ${target[key].toFixed(0)}%`}
                />
                <div
                  className={`absolute top-0 left-0 h-full ${color} transition-all`}
                  style={{ width: `${Math.min(actual[key], 100)}%` }}
                />
                <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-white mix-blend-difference">
                  {count} 题
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 rounded bg-slate-50 border border-navy-100 text-xs text-navy-600 leading-relaxed">
        <b className="text-navy-700">说明：</b>
        容差 ±5%。实线表示实际占比，虚线标记目标位置。超出容差需在题目清单中针对性调整。
      </div>
    </section>
  );
}
