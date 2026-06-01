import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3, RefreshCw, TrendingUp, Gauge } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getMaterialComparison } from '@/core/heatConduction';
import TraceChain from './TraceChain';

export default function ResultPanel() {
  const { experiments, results, anomalies, recalculateSingle } = useAppStore();
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);

  const normalResults = results.filter((r) => !isNaN(r.thermalConductivity) && r.rSquared >= 0.95);
  const comparison = getMaterialComparison(results, experiments);

  const selectedResult = selectedResultId
    ? results.find((r) => r.id === selectedResultId)
    : null;
  const selectedExperiment = selectedResult
    ? experiments.find((e) => e.id === selectedResult.experimentId)
    : null;

  const chartData =
    selectedResult && selectedExperiment
      ? selectedExperiment.temperaturePoints.map((p, idx) => ({
          time: p.time,
          实测温度: p.temperature,
          拟合温度:
            selectedResult.fitPoints && selectedResult.fitPoints[idx]
              ? selectedResult.fitPoints[idx].temperature
              : null,
        }))
      : [];

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-800" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            计算结果
          </h3>
          <span className="text-sm text-slate-500">
            正常 {normalResults.length} / 共 {results.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {results.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无计算结果</p>
              <p className="text-sm">点击"批量计算"开始分析</p>
            </div>
          </div>
        ) : (
          <>
            {comparison.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  材料导热率比对
                </h4>
                <div className="bg-slate-50 rounded-lg p-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-600">
                        <th className="text-left py-1 px-2 font-medium">材料</th>
                        <th className="text-right py-1 px-2 font-medium">导热率 (W/(m·K))</th>
                        <th className="text-right py-1 px-2 font-medium">R²</th>
                        <th className="text-right py-1 px-2 font-medium">实验数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.map((item, idx) => (
                        <tr
                          key={item.materialId}
                          className="border-t border-slate-200"
                        >
                          <td className="py-1.5 px-2 font-mono">
                            {idx + 1}. {item.materialId}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono font-medium text-slate-800">
                            {item.thermalConductivity.toFixed(4)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono text-slate-600">
                            {item.rSquared.toFixed(4)}
                          </td>
                          <td className="py-1.5 px-2 text-right text-slate-500">
                            {item.experimentCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                <Gauge className="w-4 h-4" />
                详细结果列表
              </h4>
              <div className="space-y-3">
                {normalResults.map((result) => {
                  const exp = experiments.find((e) => e.id === result.experimentId);
                  const isSelected = selectedResultId === result.id;

                  return (
                    <div
                      key={result.id}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-400 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() =>
                        setSelectedResultId(isSelected ? null : result.id)
                      }
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-slate-800">
                            {exp?.materialId || '未知材料'}
                          </span>
                          <span className="text-xs text-slate-500">
                            #{exp?.rowIndex !== undefined ? exp.rowIndex + 1 : '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-mono text-sm font-semibold text-slate-800">
                              λ = {result.thermalConductivity.toFixed(4)}
                            </div>
                            <div className="text-xs text-slate-500">
                              W/(m·K)
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              recalculateSingle(result.experimentId);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                            title="重新计算"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                        <span>
                          R² ={' '}
                          <span
                            className={`font-mono ${
                              result.rSquared >= 0.99
                                ? 'text-emerald-600'
                                : result.rSquared >= 0.95
                                ? 'text-amber-600'
                                : 'text-red-600'
                            }`}
                          >
                            {result.rSquared.toFixed(4)}
                          </span>
                        </span>
                        <span className="font-mono truncate max-w-[200px]">
                          {result.fitEquation}
                        </span>
                      </div>

                      <TraceChain trace={result.calculationTrace} />

                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <p className="text-xs text-slate-600 mb-2">
                            温升曲线拟合图
                          </p>
                          <div className="h-56 bg-white rounded border border-slate-200 p-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                  dataKey="time"
                                  tick={{ fontSize: 11 }}
                                  label={{ value: '时间 (s)', position: 'insideBottom', offset: -5, fontSize: 11 }}
                                />
                                <YAxis
                                  tick={{ fontSize: 11 }}
                                  label={{ value: '温度 (°C)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                                />
                                <Tooltip
                                  contentStyle={{ fontSize: 12, borderRadius: '4px' }}
                                />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Line
                                  type="monotone"
                                  dataKey="实测温度"
                                  stroke="#1e3a5f"
                                  strokeWidth={2}
                                  dot={{ r: 2 }}
                                  activeDot={{ r: 4 }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="拟合温度"
                                  stroke="#e67e22"
                                  strokeWidth={2}
                                  strokeDasharray="5 5"
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
