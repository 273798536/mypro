import { GroupResult, GROUP_LABELS, GROUP_COLORS } from '@/types';
import { TrendingUp, TrendingDown, Minus, Layers } from 'lucide-react';
import { formatPercent } from '@/utils/statistics';

interface GroupCalibrationCardProps {
  groupResult: GroupResult;
  targetCoverage: number;
}

export default function GroupCalibrationCard({
  groupResult,
  targetCoverage,
}: GroupCalibrationCardProps) {
  const { group, coverage, calibratedCoverage, sampleSize, calibrationFactor, categories, avgUnderEstimation, avgIntervalWidthRatio } = groupResult;
  const colors = GROUP_COLORS[group];
  const label = GROUP_LABELS[group];

  const improvement = calibratedCoverage - coverage;
  const hasImproved = improvement > 0.01;
  const hasDegraded = improvement < -0.01;

  const getStatusColor = (cov: number) => {
    if (cov >= targetCoverage) return 'text-green-600';
    if (cov >= targetCoverage * 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`card border-l-4 ${
      group === 'hot' ? 'border-l-red-500' :
      group === 'cold' ? 'border-l-gray-400' :
      'border-l-primary'
    } hover:shadow-lg transition-all duration-300`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
            <Layers className={colors.text} size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-neutral-800">{label}</h4>
            <p className="text-xs text-neutral-400">{categories.length} 个品类 · {sampleSize} 条数据</p>
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          group === 'hot' ? 'bg-red-100 text-red-700' :
          group === 'cold' ? 'bg-gray-100 text-gray-600' :
          'bg-blue-100 text-blue-700'
        }`}>
          {group === 'hot' ? '🔥 热销' : group === 'cold' ? '❄️ 冷销' : '📊 普通'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-neutral-50 rounded-lg p-3">
          <p className="text-xs text-neutral-500 mb-1">原始覆盖率</p>
          <p className={`text-xl font-bold ${getStatusColor(coverage)}`}>
            {formatPercent(coverage)}
          </p>
        </div>
        <div className="bg-primary/5 rounded-lg p-3">
          <p className="text-xs text-neutral-500 mb-1">校准后覆盖率</p>
          <p className={`text-xl font-bold ${getStatusColor(calibratedCoverage)}`}>
            {formatPercent(calibratedCoverage)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-neutral-500">校准效果</span>
        <div className={`flex items-center gap-1 text-sm font-medium ${
          hasImproved ? 'text-green-600' : hasDegraded ? 'text-red-600' : 'text-neutral-500'
        }`}>
          {hasImproved ? (
            <><TrendingUp size={16} /> 提升 {formatPercent(improvement)}</>
          ) : hasDegraded ? (
            <><TrendingDown size={16} /> 下降 {formatPercent(Math.abs(improvement))}</>
          ) : (
            <><Minus size={16} /> 基本持平</>
          )}
        </div>
      </div>

      <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden mb-4">
        <div className="h-full flex">
          <div
            className="h-full bg-neutral-300"
            style={{ width: `${coverage * 100}%` }}
          />
          <div
            className={`h-full ${
              hasImproved ? 'bg-green-400' : hasDegraded ? 'bg-red-300' : 'bg-transparent'
            }`}
            style={{
              width: `${Math.abs(improvement) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-100">
        <div>
          <p className="text-xs text-neutral-400 mb-1">校准系数</p>
          <p className="text-sm font-semibold text-primary">{calibrationFactor.toFixed(2)}x</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400 mb-1">平均低估</p>
          <p className="text-sm font-semibold text-accent-danger">{formatPercent(avgUnderEstimation)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400 mb-1">区间宽度比</p>
          <p className="text-sm font-semibold text-neutral-600">{formatPercent(avgIntervalWidthRatio)}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400 mb-1">目标覆盖率</p>
          <p className="text-sm font-semibold text-accent-warning">{formatPercent(targetCoverage)}</p>
        </div>
      </div>

      {group === 'hot' && (
        <div className="mt-4 p-3 bg-red-50 rounded-lg">
          <p className="text-xs text-red-600">
            💡 热门品类通常被系统低估，建议适当扩展预测区间上限
          </p>
        </div>
      )}
      {group === 'cold' && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            💡 冷门品类预测区间通常过宽，建议适当收缩区间范围
          </p>
        </div>
      )}
      {group === 'normal' && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600">
            💡 普通品类预测相对稳定，可根据实际偏差微调校准系数
          </p>
        </div>
      )}
    </div>
  );
}
