import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { XCircle, ChevronDown, ChevronUp, AlertOctagon, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ANOMALY_TYPE_LABELS } from '@/types';

export default function AnomalyList() {
  const { experiments, anomalies, results, recalculateSingle } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [animateIn, setAnimateIn] = useState<Set<string>>(new Set());

  const errorAnomalies = anomalies.filter((a) => a.severity === 'error');
  const anomalyExperimentIds = [
    ...new Set(errorAnomalies.map((a) => a.experimentId)),
  ];
  const anomalyExperiments = experiments.filter((e) =>
    anomalyExperimentIds.includes(e.id)
  );

  useEffect(() => {
    const ids = new Set(anomalyExperimentIds);
    setAnimateIn(ids);
    const timer = setTimeout(() => setAnimateIn(new Set()), 800);
    return () => clearTimeout(timer);
  }, [anomalyExperimentIds.length]);

  const getExpAnomalies = (expId: string) =>
    errorAnomalies.filter((a) => a.experimentId === expId);

  const getExpResult = (expId: string) =>
    results.find((r) => r.experimentId === expId);

  return (
    <div className="bg-white rounded-lg border-2 border-red-300 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-4 bg-red-50 border-b-2 border-red-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-red-600" />
          <h3
            className="font-semibold text-red-800"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            异常清单
          </h3>
          <span className="text-sm font-medium bg-red-200 text-red-800 px-2 py-0.5 rounded-full">
            {anomalyExperiments.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {anomalyExperiments.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-red-400">
            <div className="text-center">
              <XCircle className="w-10 h-10 mx-auto mb-1 opacity-50" />
              <p className="text-sm">暂无异常数据</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-red-100">
            {anomalyExperiments.map((exp) => {
              const expAnomalies = getExpAnomalies(exp.id);
              const expResult = getExpResult(exp.id);
              const isExpanded = expandedId === exp.id;
              const shouldAnimate = animateIn.has(exp.id);

              const affectedPointSet = new Set<number>();
              expAnomalies.forEach((a) => {
                if (a.affectedPoints) {
                  a.affectedPoints.forEach((p) => affectedPointSet.add(p));
                }
              });

              const chartData = exp.temperaturePoints.map((p, idx) => ({
                time: p.time,
                temperature: p.temperature,
                isAffected: affectedPointSet.has(idx),
              }));

              return (
                <div
                  key={exp.id}
                  className={`transition-all ${
                    shouldAnimate ? 'animate-shake bg-red-100/30' : ''
                  }`}
                >
                  <div
                    className={`p-3 cursor-pointer transition-colors hover:bg-red-50/50 ${
                      isExpanded ? 'bg-red-50/50' : ''
                    }`}
                    onClick={() =>
                      setExpandedId(isExpanded ? null : exp.id)
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium text-red-800">
                            {exp.materialId || '未命名材料'}
                          </span>
                          <span className="text-xs text-red-600">
                            #{exp.rowIndex !== undefined ? exp.rowIndex + 1 : '-'}
                          </span>
                        </div>
                        <div className="text-xs text-red-700 space-y-0.5">
                          {expAnomalies.map((a, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-red-500" />
                              {ANOMALY_TYPE_LABELS[a.type]}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            recalculateSingle(exp.id);
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="重新计算"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-red-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t border-red-200 pt-3 bg-red-50/30">
                      {expAnomalies.map((a, idx) => (
                        <div
                          key={idx}
                          className="text-xs bg-red-100/80 border border-red-200 p-3 rounded"
                        >
                          <div className="font-semibold text-red-800 mb-1 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            {ANOMALY_TYPE_LABELS[a.type]}
                          </div>
                          <div className="text-red-700 leading-relaxed">
                            {a.description}
                          </div>
                          {a.affectedPoints && a.affectedPoints.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-red-200">
                              <span className="text-red-600 font-medium">
                                受影响数据点:
                              </span>{' '}
                              <span className="font-mono text-red-700">
                                {a.affectedPoints.slice(0, 10).join(', ')}
                                {a.affectedPoints.length > 10 &&
                                  `... (共${a.affectedPoints.length}个)`}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}

                      {expResult && (
                        <div className="bg-white border border-red-200 p-3 rounded">
                          <div className="text-xs text-red-600 font-medium mb-2">
                            计算结果（异常）
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-red-500">导热率:</span>{' '}
                              <span className="font-mono text-red-700">
                                {isNaN(expResult.thermalConductivity)
                                  ? '无法计算'
                                  : `${expResult.thermalConductivity.toFixed(4)} W/(m·K)`}
                              </span>
                            </div>
                            <div>
                              <span className="text-red-500">R²:</span>{' '}
                              <span className="font-mono text-red-700">
                                {expResult.rSquared.toFixed(4)}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 text-xs font-mono text-red-600 bg-red-50 p-2 rounded">
                            {expResult.fitEquation}
                          </div>
                        </div>
                      )}

                      {affectedPointSet.size > 0 && (
                        <div className="bg-white border border-red-200 p-3 rounded">
                          <div className="text-xs text-red-600 font-medium mb-2">
                            温度曲线（红点为异常点）
                          </div>
                          <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#fecaca" />
                                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip
                                  contentStyle={{
                                    fontSize: 11,
                                    borderRadius: '4px',
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="temperature"
                                  stroke="#991b1b"
                                  strokeWidth={1.5}
                                  dot={{ r: 1.5 }}
                                />
                                {chartData.map(
                                  (entry, idx) =>
                                    entry.isAffected && (
                                      <ReferenceDot
                                        key={idx}
                                        x={entry.time}
                                        y={entry.temperature}
                                        r={4}
                                        fill="#ef4444"
                                        stroke="#fff"
                                        strokeWidth={1}
                                      />
                                    )
                                )}
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
