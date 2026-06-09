import { Sigma, Activity, Gauge, TrendingDown, Layers } from 'lucide-react';
import { useStore } from '@/store';
import {
  formatConditionNumber,
  formatError,
  stabilityFromCondition,
  DEGRADATION_LABEL,
} from '@/utils/math/rank';

const DEG_COLORS = {
  none: 'bg-forest-50 text-forest-700 border-forest-200',
  mild: 'bg-amber-50 text-amber-700 border-amber-200',
  moderate: 'bg-amber-100/80 text-amber-800 border-amber-300',
  severe: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STAB_COLORS = {
  good: 'bg-forest-50 text-forest-700 border-forest-200',
  ok: 'bg-ink-50 text-ink-700 border-ink-200',
  warn: 'bg-amber-50 text-amber-700 border-amber-200',
  bad: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function RankResultPanel() {
  const result = useStore(s => s.rankResult);

  if (!result) {
    return (
      <div className="card p-6 text-center text-ink-400 animate-fade-up">
        <Layers className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">请录入矩阵数据，结果将在此实时呈现</p>
      </div>
    );
  }

  const stab = stabilityFromCondition(result.conditionNumber);
  const sigmaMax = result.singularValues[0] ?? 1;

  return (
    <div className="card p-5 animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sigma className="w-4 h-4 text-ink-600" />
          <h3 className="font-serif text-ink-800 font-semibold">计算结果</h3>
        </div>
        <span className={`chip border ${DEG_COLORS[result.degradationLevel]}`}>
          <TrendingDown className="w-3 h-3" />
          {DEGRADATION_LABEL[result.degradationLevel]}
        </span>
      </div>

      <div className="divider-gold mb-4" />

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-ink-800 to-ink-700 rounded-xl p-4 text-white shadow-card">
          <div className="text-[11px] text-ink-200 uppercase tracking-wider">矩阵秩</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-serif text-4xl font-bold">{result.rank}</span>
            <span className="text-ink-300 text-sm">/ {result.maxRank}</span>
          </div>
          <div className="mt-1 text-[11.5px] text-ink-300">
            阈值 ε = {result.tolerance.toExponential(2)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-ink-50 to-white rounded-xl p-4 border border-ink-100">
          <div className="flex items-center gap-1 text-[11px] text-ink-500 uppercase tracking-wider">
            <Gauge className="w-3 h-3" /> 条件数 κ
          </div>
          <div className="mt-1 font-mono text-2xl font-semibold text-ink-800">
            {formatConditionNumber(result.conditionNumber)}
          </div>
          <span className={`mt-1 inline-block chip border ${STAB_COLORS[stab.level]}`}>
            <Activity className="w-3 h-3" />
            {stab.label}
          </span>
        </div>

        <div className="bg-ink-50/60 rounded-xl p-4 border border-ink-100">
          <div className="text-[11px] text-ink-500 uppercase tracking-wider">相对误差估计</div>
          <div className="mt-1 font-mono text-xl font-semibold text-ink-800">
            {formatError(result.errorEstimate)}
          </div>
          <div className="mt-1 text-[11.5px] text-ink-400">≈ κ · εₘₐₙ</div>
        </div>

        <div className="bg-ink-50/60 rounded-xl p-4 border border-ink-100">
          <div className="text-[11px] text-ink-500 uppercase tracking-wider">奇异值（降序）</div>
          <div className="mt-2 flex items-end gap-1 h-14">
            {result.singularValues.slice(0, 8).map((s, i) => {
              const h = sigmaMax > 0 ? Math.max(6, (s / sigmaMax) * 100) : 0;
              const isCut = s <= result.tolerance;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${
                    isCut ? 'bg-rose-300/80' : 'bg-gradient-to-t from-ink-700 to-ink-500'
                  }`}
                  style={{ height: `${h}%` }}
                  title={`σ${i + 1} = ${s.toExponential(3)}`}
                />
              );
            })}
          </div>
          <div className="mt-1 text-[11px] text-ink-400">
            共 {result.singularValues.length} 个，红线为阈值
          </div>
        </div>
      </div>
    </div>
  );
}
