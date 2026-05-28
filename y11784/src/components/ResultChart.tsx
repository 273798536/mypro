import { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { useResultStore } from '@/store/resultStore';
import { usePathStore } from '@/store/pathStore';
import { useIntegrationStore } from '@/store/integrationStore';
import { getMethodLabel } from '@/utils/math/numericalIntegration';
import { cn } from '@/lib/utils';

export function ResultChart() {
  const { results, getLatestResultForPath } = useResultStore();
  const { paths, activeVectorFieldId } = usePathStore();
  const { selectedPathIds } = useIntegrationStore();
  const [hoveredPathId, setHoveredPathId] = useState<string | null>(null);

  const activePaths = paths.filter((p) => p.vectorFieldId === activeVectorFieldId);

  const chartData = useMemo(() => {
    return activePaths
      .map((path) => {
        const result = getLatestResultForPath(path.id);
        return {
          path,
          result,
          isSelected: selectedPathIds.includes(path.id),
        };
      })
      .filter((d) => d.result !== null);
  }, [activePaths, getLatestResultForPath, selectedPathIds]);

  const validResults = chartData.filter((d) => !d.result?.hasAnomalies);
  const hasAnomalyResults = chartData.some((d) => d.result?.hasAnomalies);

  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 1;
    const values = chartData.map((d) => Math.abs(d.result?.value || 0));
    return Math.max(...values, 0.001);
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-600" />
          <span className="font-medium text-slate-800">积分结果对比</span>
        </div>
        <div className="p-8 text-center text-slate-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">暂无计算结果</p>
          <p className="text-xs mt-1">选择路径后点击"开始计算"</p>
        </div>
      </div>
    );
  }

  const chartHeight = Math.max(200, chartData.length * 40);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-600" />
          <span className="font-medium text-slate-800">积分结果对比</span>
          <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded-full border">
            {chartData.length} 条结果
          </span>
        </div>
        {hasAnomalyResults && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle className="w-3 h-3" />
            <span>含异常数据</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="relative" style={{ height: `${chartHeight}px` }}>
          <div className="absolute inset-0 flex items-stretch">
            <div className="w-24 flex-shrink-0 border-r border-slate-200 pr-2">
              {chartData.map(({ path, result }) => (
                <div
                  key={path.id}
                  className="h-8 flex items-center justify-end text-xs text-slate-600"
                  style={{ height: `${100 / chartData.length}%` }}
                >
                  <span
                    className={cn(
                      'truncate max-w-20',
                      result?.hasAnomalies && 'line-through opacity-50'
                    )}
                    title={path.name}
                  >
                    {path.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 right-0 flex items-center border-b border-slate-100">
                <div className="w-full border-t border-dashed border-slate-200" />
              </div>

              {chartData.map(({ path, result, isSelected }) => {
                if (!result) return null;
                const barWidth = Math.max(
                  10,
                  (Math.abs(result.value) / maxValue) * 100
                );
                const isPositive = result.value >= 0;
                const isHovered = hoveredPathId === path.id;

                return (
                  <div
                    key={path.id}
                    className="relative flex items-center"
                    style={{ height: `${100 / chartData.length}%` }}
                    onMouseEnter={() => setHoveredPathId(path.id)}
                    onMouseLeave={() => setHoveredPathId(null)}
                  >
                    <div className="absolute left-1/2 w-px h-full bg-slate-200" />
                    <div
                      className={cn(
                        'absolute h-6 rounded transition-all duration-200 flex items-center',
                        isPositive ? 'left-1/2' : 'right-1/2',
                        result.hasAnomalies && 'opacity-40',
                        isSelected ? 'ring-2 ring-blue-400' : '',
                        isHovered ? 'brightness-110' : ''
                      )}
                      style={{
                        width: `${barWidth / 2}%`,
                        backgroundColor: result.hasAnomalies ? '#94a3b8' : path.color,
                        flexDirection: isPositive ? 'row' : 'row-reverse',
                      }}
                    >
                      <span
                        className={cn(
                          'text-xs font-mono px-2 whitespace-nowrap',
                          isPositive ? 'text-right' : 'text-left',
                          isPositive ? 'text-white' : 'text-white'
                        )}
                      >
                        {result.value.toFixed(4)}
                      </span>
                    </div>

                    {isHovered && (
                      <div className="absolute z-10 bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg left-1/2 -translate-x-1/2 -top-8">
                        <div className="font-medium">{path.name}</div>
                        <div className="font-mono">
                          值: {result.value.toFixed(6)}
                        </div>
                        <div>方法: {getMethodLabel(result.method)}</div>
                        <div>步长: {result.stepSize.toFixed(4)}</div>
                        <div>误差: {result.errorEstimate.toExponential(2)}</div>
                        {result.hasAnomalies && (
                          <div className="text-red-400">⚠ 含异常</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-between text-xs text-slate-500">
          <span>负方向</span>
          <span>0</span>
          <span>正方向</span>
        </div>
      </div>

      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
        <div className="grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <div className="text-slate-500">最大值</div>
            <div className="font-mono text-slate-800">
              {chartData.length > 0
                ? Math.max(...chartData.map((d) => d.result?.value || 0)).toFixed(4)
                : '-'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">最小值</div>
            <div className="font-mono text-slate-800">
              {chartData.length > 0
                ? Math.min(...chartData.map((d) => d.result?.value || 0)).toFixed(4)
                : '-'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">极差</div>
            <div className="font-mono text-slate-800">
              {chartData.length > 0
                ? (
                    Math.max(...chartData.map((d) => d.result?.value || 0)) -
                    Math.min(...chartData.map((d) => d.result?.value || 0))
                  ).toFixed(4)
                : '-'}
            </div>
          </div>
        </div>

        {validResults.length >= 2 && (
          <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
            <span className="font-medium">分析提示:</span>{' '}
            {Math.abs(
              Math.max(...validResults.map((d) => d.result?.value || 0)) -
                Math.min(...validResults.map((d) => d.result?.value || 0))
            ) < 1e-4
              ? '各路径积分结果基本一致，该向量场可能是保守场'
              : '不同路径积分结果有差异，该向量场是非保守场'}
          </div>
        )}
      </div>
    </div>
  );
}
