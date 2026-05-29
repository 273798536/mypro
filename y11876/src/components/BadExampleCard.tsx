import { BadExample } from '@/types';
import { AlertTriangle, TrendingUp, TrendingDown, XCircle } from 'lucide-react';
import { formatPercent, formatNumber } from '@/utils/statistics';

interface BadExampleCardProps {
  example: BadExample;
  rank: number;
}

export default function BadExampleCard({ example, rank }: BadExampleCardProps) {
  const { category, forecast, actual, lowerBound, upperBound, deviationPercent, reason } = example;

  const isUnderEstimate = actual > forecast;
  const deviationColor = deviationPercent > 1 ? 'text-red-600' : 'text-orange-500';

  const getReasonIcon = () => {
    if (reason.includes('预测值为0')) return <XCircle className="text-red-500" size={20} />;
    if (reason.includes('下限大于上限')) return <XCircle className="text-red-500" size={20} />;
    if (reason.includes('负数')) return <XCircle className="text-red-500" size={20} />;
    if (isUnderEstimate) return <TrendingUp className="text-red-500" size={20} />;
    return <TrendingDown className="text-orange-500" size={20} />;
  };

  const maxValue = Math.max(forecast, actual, upperBound, 1);
  const forecastWidth = Math.max(20, (forecast / maxValue) * 100);
  const actualWidth = Math.max(20, (actual / maxValue) * 100);
  const lowerWidth = Math.max(20, (lowerBound / maxValue) * 100);
  const upperWidth = Math.max(20, (upperBound / maxValue) * 100);

  return (
    <div className="card-danger animate-pulse-slow">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <span className="text-red-600 font-bold">{rank}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-neutral-800">{category}</h4>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 ${deviationColor}`}>
              {getReasonIcon()}
              <span className="text-sm font-bold">偏差 {formatPercent(deviationPercent)}</span>
            </div>
          </div>

          <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg mb-4">
            <AlertTriangle size={14} className="inline mr-1" />
            {reason}
          </p>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-neutral-500 mb-1">
                <span>预测区间</span>
                <span>[{formatNumber(lowerBound)}, {formatNumber(upperBound)}]</span>
              </div>
              <div className="relative h-8 bg-neutral-100 rounded-lg overflow-hidden">
                <div
                  className="absolute h-full bg-primary/30"
                  style={{ left: `${lowerWidth}%`, width: `${upperWidth - lowerWidth}%` }}
                />
                <div
                  className="absolute h-full w-1 bg-primary top-0"
                  style={{ left: `${forecastWidth}%` }}
                  title="预测值"
                />
                <div
                  className="absolute h-full w-2 bg-red-500 top-0 rounded"
                  style={{ left: `${actualWidth}%` }}
                  title="真实值"
                />
              </div>
              <div className="flex justify-between mt-1">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-primary rounded" />
                  <span className="text-xs text-neutral-500">预测值: {formatNumber(forecast)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded" />
                  <span className="text-xs text-neutral-500">真实值: {formatNumber(actual)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-neutral-100">
              <div className="text-center">
                <p className="text-xs text-neutral-400">预测值</p>
                <p className={`text-sm font-bold ${forecast === 0 ? 'text-red-600' : 'text-primary'}`}>
                  {formatNumber(forecast)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-neutral-400">真实值</p>
                <p className="text-sm font-bold text-red-600">{formatNumber(actual)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-neutral-400">偏差</p>
                <p className={`text-sm font-bold ${deviationColor}`}>
                  {isUnderEstimate ? '+' : ''}{formatPercent(deviationPercent)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-xs text-yellow-700">
              🎯 <strong>异常路径验证:</strong> 此样例数据已被正确识别为"明显坏值"，将被单独列出并在覆盖率计算中排除。
              您可以在右侧异常筛选中选择"明显坏值"查看所有此类问题。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
