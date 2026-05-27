import { useState } from 'react';
import {
  Activity,
  Clock,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ChevronDown,
  ChevronUp,
  History,
  Calculator,
  Gauge,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getScoreGrade } from '@/utils/scoring';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function DetailPanel() {
  const {
    waveParams,
    samplePoints,
    history,
    scores,
    fps,
    time,
    isPerformanceMode,
    calculateAndAddScore,
  } = useAppStore();

  const [expandedSections, setExpandedSections] = useState({
    params: true,
    samples: true,
    history: false,
    score: true,
    performance: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const latestScore = scores.length > 0 ? scores[scores.length - 1] : null;
  const scoreGrade = latestScore ? getScoreGrade(latestScore.totalScore) : null;

  const phaseDiff = Math.abs(waveParams.source1.phase - waveParams.source2.phase);
  const sourceDistance = Math.sqrt(
    (waveParams.source1.x - waveParams.source2.x) ** 2 +
    (waveParams.source1.y - waveParams.source2.y) ** 2
  );

  const getSampleChartData = (sampleId: string) => {
    const sp = samplePoints.find((s) => s.id === sampleId);
    if (!sp) return [];
    return sp.measurements.slice(-20).map((m, i) => ({
      index: i,
      amplitude: m.amplitude,
      phase: m.phase,
    }));
  };

  return (
    <div className="w-96 bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
        <h2
          className="text-lg font-bold text-emerald-400 tracking-wider"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          <Activity className="inline-block w-5 h-5 mr-2" />
          实验明细
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-4">
          <div className="border border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('performance')}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
            >
              <span className="font-medium text-cyan-300 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                实时状态
              </span>
              {expandedSections.performance ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expandedSections.performance && (
              <div className="p-4 bg-slate-900/50">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      模拟时间
                    </div>
                    <div className="text-xl font-mono text-cyan-400">
                      {time.toFixed(2)}s
                    </div>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                    <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      帧率 FPS
                    </div>
                    <div
                      className={`text-xl font-mono ${
                        fps >= 50
                          ? 'text-emerald-400'
                          : fps >= 30
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {fps.toFixed(0)}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 col-span-2">
                    <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      性能模式
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-medium ${
                          isPerformanceMode ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {isPerformanceMode ? '性能优先（低分辨率）' : '质量优先（高分辨率）'}
                      </span>
                      <span className="text-xs text-slate-500">
                        自动根据FPS调整
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('params')}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
            >
              <span className="font-medium text-blue-300 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                参数摘要
              </span>
              {expandedSections.params ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expandedSections.params && (
              <div className="p-4 bg-slate-900/50 space-y-3">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    波源对比
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500">
                          <th className="text-left py-2 px-2">参数</th>
                          <th className="text-cyan-400 py-2 px-2">波源1</th>
                          <th className="text-emerald-400 py-2 px-2">波源2</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-300">
                        <tr className="border-t border-slate-700">
                          <td className="py-2 px-2 text-slate-400">频率</td>
                          <td className="py-2 px-2">{waveParams.source1.frequency.toFixed(1)} Hz</td>
                          <td className="py-2 px-2">{waveParams.source2.frequency.toFixed(1)} Hz</td>
                        </tr>
                        <tr className="border-t border-slate-700">
                          <td className="py-2 px-2 text-slate-400">相位</td>
                          <td className="py-2 px-2">{(waveParams.source1.phase / Math.PI).toFixed(2)}π</td>
                          <td className="py-2 px-2">{(waveParams.source2.phase / Math.PI).toFixed(2)}π</td>
                        </tr>
                        <tr className="border-t border-slate-700">
                          <td className="py-2 px-2 text-slate-400">振幅</td>
                          <td className="py-2 px-2">{waveParams.source1.amplitude.toFixed(2)}</td>
                          <td className="py-2 px-2">{waveParams.source2.amplitude.toFixed(2)}</td>
                        </tr>
                        <tr className="border-t border-slate-700">
                          <td className="py-2 px-2 text-slate-400">位置</td>
                          <td className="py-2 px-2">({waveParams.source1.x.toFixed(1)}, {waveParams.source1.y.toFixed(1)})</td>
                          <td className="py-2 px-2">({waveParams.source2.x.toFixed(1)}, {waveParams.source2.y.toFixed(1)})</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-700">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    干涉条件
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800/30 p-2 rounded">
                      <div className="text-xs text-slate-500">波长 λ</div>
                      <div className="text-sm text-slate-200 font-mono">{waveParams.wavelength.toFixed(2)} m</div>
                    </div>
                    <div className="bg-slate-800/30 p-2 rounded">
                      <div className="text-xs text-slate-500">相位差 Δφ</div>
                      <div className="text-sm text-slate-200 font-mono">{(phaseDiff / Math.PI).toFixed(2)}π</div>
                    </div>
                    <div className="bg-slate-800/30 p-2 rounded">
                      <div className="text-xs text-slate-500">波源间距 d</div>
                      <div className="text-sm text-slate-200 font-mono">{sourceDistance.toFixed(2)} m</div>
                    </div>
                    <div className="bg-slate-800/30 p-2 rounded">
                      <div className="text-xs text-slate-500">d/λ 比值</div>
                      <div className="text-sm text-slate-200 font-mono">{(sourceDistance / waveParams.wavelength).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                  <div className="text-xs text-blue-300 font-medium mb-1">💡 物理原理</div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    当两列相干波相遇时，<span className="text-emerald-400">相长干涉</span>（波程差 = nλ）
                    和 <span className="text-red-400">相消干涉</span>（波程差 = (n+1/2)λ）
                    交替出现，形成稳定的干涉图样。
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border border-slate-700 rounded-lg overflow-hidden">
            <div
              onClick={() => toggleSection('score')}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors cursor-pointer"
            >
              <span className="font-medium text-amber-300 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                实验评分
                {latestScore && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{
                      backgroundColor: scoreGrade?.color + '30',
                      color: scoreGrade?.color,
                    }}
                  >
                    {scoreGrade?.grade} {latestScore.totalScore}/100
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    calculateAndAddScore();
                  }}
                  className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded hover:bg-amber-500/30 transition-colors"
                >
                  重新评分
                </button>
                {expandedSections.score ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>
            {expandedSections.score && latestScore && (
              <div className="p-4 bg-slate-900/50 space-y-3">
                <div className="flex items-center justify-center py-4">
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center border-4"
                    style={{ borderColor: scoreGrade?.color }}
                  >
                    <div className="text-center">
                      <div
                        className="text-3xl font-bold"
                        style={{ color: scoreGrade?.color }}
                      >
                        {latestScore.totalScore}
                      </div>
                      <div className="text-xs text-slate-400">总分</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {latestScore.breakdown.map((item, idx) => (
                    <div key={idx} className="bg-slate-800/30 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-300">{item.category}</span>
                        <span className="text-sm font-mono">
                          <span className="text-emerald-400">{item.score}</span>
                          <span className="text-slate-500">/{item.maxScore}</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${(item.score / item.maxScore) * 100}%`,
                            backgroundColor:
                              item.score / item.maxScore >= 0.8
                                ? '#2A9D8F'
                                : item.score / item.maxScore >= 0.5
                                ? '#F4A261'
                                : '#E63946',
                          }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {item.explanation}
                      </p>
                    </div>
                  ))}
                </div>
                {scores.length > 1 && (
                  <div className="pt-2 border-t border-slate-700">
                    <div className="text-xs text-slate-400 mb-2">评分历史</div>
                    <div className="h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={scores.slice(-10)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis
                            dataKey="timestamp"
                            tickFormatter={(t) => new Date(t).toLocaleTimeString().slice(3)}
                            stroke="#64748b"
                            fontSize={10}
                          />
                          <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '8px',
                            }}
                            labelFormatter={(t) => new Date(t).toLocaleString()}
                            formatter={(value: number) => [`${value}分`, '总分']}
                          />
                          <Line
                            type="monotone"
                            dataKey="totalScore"
                            stroke="#F4A261"
                            strokeWidth={2}
                            dot={{ fill: '#F4A261', r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {samplePoints.length > 0 && (
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('samples')}
                className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
              >
                <span className="font-medium text-purple-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  采样点数据
                  <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                    {samplePoints.length}
                  </span>
                </span>
                {expandedSections.samples ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {expandedSections.samples && (
                <div className="p-4 bg-slate-900/50 space-y-4">
                  {samplePoints.map((sp, idx) => {
                    const latest = sp.measurements.length > 0
                      ? sp.measurements[sp.measurements.length - 1]
                      : null;
                    return (
                      <div key={sp.id} className="bg-slate-800/30 p-3 rounded-lg border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-200">
                            采样点 {idx + 1}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            ({sp.position.x.toFixed(1)}, {sp.position.y.toFixed(1)})
                          </span>
                        </div>
                        {latest ? (
                          <>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              <div className="text-center">
                                <div className="text-xs text-slate-500">振幅</div>
                                <div className="text-sm font-mono text-cyan-400">{latest.amplitude.toFixed(3)}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-slate-500">相位</div>
                                <div className="text-sm font-mono text-emerald-400">{(latest.phase / Math.PI).toFixed(2)}π</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-slate-500">频率</div>
                                <div className="text-sm font-mono text-amber-400">{latest.frequency.toFixed(1)}Hz</div>
                              </div>
                            </div>
                            {sp.measurements.length > 5 && (
                              <div className="h-16">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={getSampleChartData(sp.id)}>
                                    <Line
                                      type="monotone"
                                      dataKey="amplitude"
                                      stroke="#3E92CC"
                                      strokeWidth={1.5}
                                      dot={false}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-xs text-slate-500 text-center py-2">
                            等待测量数据...
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {history.length > 0 && (
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('history')}
                className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
              >
                <span className="font-medium text-slate-300 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  操作痕迹
                  <span className="text-xs bg-slate-600/50 text-slate-400 px-2 py-0.5 rounded-full">
                    {history.length}
                  </span>
                </span>
                {expandedSections.history ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {expandedSections.history && (
                <div className="p-4 bg-slate-900/50 max-h-80 overflow-y-auto">
                  <div className="relative">
                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-700" />
                    <div className="space-y-3">
                      {history.slice().reverse().slice(0, 20).map((record, idx) => (
                        <div key={record.id} className="relative pl-8">
                          <div
                            className={`absolute left-1.5 top-2 w-3 h-3 rounded-full border-2 ${
                              record.anomalyId
                                ? 'bg-red-500 border-red-400'
                                : 'bg-slate-800 border-slate-600'
                            }`}
                          />
                          <div className="bg-slate-800/30 p-2 rounded border border-slate-700/50">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-slate-300">
                                {record.action}
                              </span>
                              <span className="text-xs text-slate-500">
                                {new Date(record.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            {record.anomalyId && (
                              <div className="text-xs text-red-400 bg-red-900/20 px-2 py-0.5 rounded mb-1">
                                ⚠️ 关联异常
                              </div>
                            )}
                            <div className="text-xs text-slate-500 font-mono break-words">
                              {record.before !== null && (
                                <span className="text-red-400">
                                  - {JSON.stringify(record.before).slice(0, 50)}
                                </span>
                              )}
                              {record.after !== null && (
                                <span className="text-emerald-400 block">
                                  + {JSON.stringify(record.after).slice(0, 50)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
