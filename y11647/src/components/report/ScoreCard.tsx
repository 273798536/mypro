import type { SimulationResult } from '../../engine/types';

interface ScoreCardProps {
  result: SimulationResult;
}

export function ScoreCard({ result }: ScoreCardProps) {
  const { score } = result;

  const scoreItems = [
    { label: '避障得分', value: score.obstacle, max: 30, color: 'bg-sky-500' },
    { label: '传球精度', value: score.pass, max: 30, color: 'bg-emerald-500' },
    { label: '能量效率', value: score.energy, max: 20, color: 'bg-amber-500' },
    { label: '完成度', value: score.completion, max: 20, color: 'bg-purple-500' },
  ];

  const getTotalScoreColor = () => {
    if (score.total >= 80) return 'text-emerald-400';
    if (score.total >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-slate-300 mb-2">比赛结果</h3>
        <div className={`text-6xl font-bold ${getTotalScoreColor()}`}>
          {score.total}
        </div>
        <span className="text-slate-400">/ 100</span>
      </div>

      <div className="space-y-4">
        {scoreItems.map((item) => {
          const percent = (item.value / item.max) * 100;
          return (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">{item.label}</span>
                <span className="text-slate-400">
                  {item.value} / {item.max}
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} transition-all duration-500`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-700">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">总事件数</span>
          <span className="text-slate-300">{result.events.length}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-slate-400">碰撞次数</span>
          <span className="text-red-400">
            {result.events.filter((e) => e.type === 'collision').length}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-slate-400">传球成功</span>
          <span className="text-emerald-400">
            {result.events.filter((e) => e.type === 'pass_complete').length}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-slate-400">能量耗尽</span>
          <span className="text-amber-400">
            {result.events.filter((e) => e.type === 'energy_empty').length}
          </span>
        </div>
      </div>
    </div>
  );
}
