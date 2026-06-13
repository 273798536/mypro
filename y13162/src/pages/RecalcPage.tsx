import { useReplayStore } from '@/store/replayStore'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
} from 'recharts'
import { parameterLabels, parameterUnits, type ParameterKey } from '@/types'
import { Play, CheckCircle, XCircle, Info } from 'lucide-react'
import { useState } from 'react'

const paramKeys: ParameterKey[] = ['waveHeight', 'wavePeriod', 'waterTemp', 'windSpeed', 'pressure']

const colorMap: Record<ParameterKey, string> = {
  waveHeight: '#0ea5e9',
  wavePeriod: '#a78bfa',
  waterTemp: '#34d399',
  windSpeed: '#fbbf24',
  pressure: '#f472b6',
}

export default function RecalcPage() {
  const { rawParameters, appliedParameters, runRecalculation, consistencyCheck, isRecalculated, overrides } =
    useReplayStore()
  const [selectedParam, setSelectedParam] = useState<ParameterKey>('waveHeight')

  const rawChartData = rawParameters.map((d) => {
    const time = new Date(d.timestamp)
    return {
      ...d,
      timeStr: `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`,
      [`${selectedParam}_raw`]: (d as any)[selectedParam],
    }
  })

  const appliedChartData = appliedParameters.map((d) => {
    const time = new Date(d.timestamp)
    return {
      ...d,
      timeStr: `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`,
      [`${selectedParam}_applied`]: (d as any)[selectedParam],
    }
  })

  const comparisonData = rawChartData.map((r, i) => ({
    ...r,
    [`${selectedParam}_applied`]: (appliedChartData[i] as any)[`${selectedParam}_applied`],
    diff: Math.abs((r as any)[`${selectedParam}_raw`] - (appliedChartData[i] as any)[`${selectedParam}_applied`]),
  }))

  const hasOverrideAtTime = (timestamp: string) => {
    return overrides.some(
      (o) => o.timestamp === timestamp && o.parameterName === selectedParam,
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">复算验证</h1>
          <p className="text-xs text-slate-400 mt-0.5">把人工改判放进回放重跑，验证图表与明细口径一致</p>
        </div>
        <button
          onClick={runRecalculation}
          className="px-4 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-300 rounded-sm text-xs flex items-center gap-1.5 transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          复算
        </button>
      </div>

      {!isRecalculated ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-sm p-8 text-center">
          <Info className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <div className="text-sm text-slate-400">点击右上角"复算"按钮，将人工改判加入回放重新计算</div>
          <div className="text-xs text-slate-500 mt-2">复算后将展示改判前后对比图和口径一致性校验结果</div>
        </div>
      ) : (
        <>
          {consistencyCheck && (
            <div
              className={`rounded-sm px-4 py-3 border ${
                consistencyCheck.passed
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {consistencyCheck.passed ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span
                  className={`text-sm font-medium ${
                    consistencyCheck.passed ? 'text-green-300' : 'text-red-300'
                  }`}
                >
                  口径一致性校验：{consistencyCheck.passed ? '通过 ✓' : '未通过 ✗'}
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-0.5">
                {consistencyCheck.details.map((d, i) => (
                  <div key={i}>• {d}</div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-800/50 border border-slate-700 rounded-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-200">改判前后对比图</h3>
              <div className="flex flex-wrap gap-2 text-xs">
                {paramKeys.map((k) => (
                  <button
                    key={k}
                    onClick={() => setSelectedParam(k)}
                    className={`px-2 py-0.5 rounded-sm border transition-colors ${
                      selectedParam === k
                        ? 'border-sky-500/50 bg-sky-500/10 text-sky-300'
                        : 'border-slate-600 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {parameterLabels[k]}（{parameterUnits[k]}）
                  </button>
                ))}
              </div>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="timeStr"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#475569' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '2px',
                      fontSize: '12px',
                      color: '#e2e8f0',
                    }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                    formatter={(value: number, name: string) => {
                      const label = name === `${selectedParam}_raw` ? '改判前' : '改判后'
                      return [`${value.toFixed(2)} ${parameterUnits[selectedParam]}`, label]
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    iconType="line"
                    formatter={(value: string) => {
                      if (value === `${selectedParam}_raw`) return '改判前（原始）'
                      if (value === `${selectedParam}_applied`) return '改判后（复算）'
                      if (value === 'diff') return '差值区域'
                      return value
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey={`${selectedParam}_raw`}
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    name="改判前"
                  />

                  <Line
                    type="monotone"
                    dataKey={`${selectedParam}_applied`}
                    stroke={colorMap[selectedParam]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name="改判后"
                  />

                  {comparisonData.map((d, i) =>
                    d.diff > 0.01 ? (
                      <ReferenceArea
                        key={`diff-${i}`}
                        x1={d.timeStr}
                        x2={comparisonData[i + 1]?.timeStr || d.timeStr}
                        y1={Math.min((d as any)[`${selectedParam}_raw`], (d as any)[`${selectedParam}_applied`])}
                        y2={Math.max((d as any)[`${selectedParam}_raw`], (d as any)[`${selectedParam}_applied`])}
                        fill="#f59e0b"
                        fillOpacity={0.15}
                      />
                    ) : null,
                  )}

                  {comparisonData
                    .filter((d) => d.diff > 0.01 && hasOverrideAtTime(d.timestamp))
                    .map((d, i) => (
                      <ReferenceArea
                        key={`override-diff-${i}`}
                        x1={d.timeStr}
                        x2={d.timeStr}
                        y1={(d as any)[`${selectedParam}_raw`]}
                        y2={(d as any)[`${selectedParam}_applied`]}
                        fill="#22c55e"
                        fillOpacity={0.3}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-slate-400" style={{ borderStyle: 'dashed' }}></span>
                改判前（原始数据）
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-3 h-0.5`} style={{ backgroundColor: colorMap[selectedParam] }}></span>
                改判后（复算数据）
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-amber-500/20 border border-amber-500/40 rounded-sm"></span>
                差值区域
              </span>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-sm overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-200">数值对比明细（图表与明细表口径校验）</h3>
              <div className="text-xs text-slate-400">
                共 {appliedParameters.length} 条记录
              </div>
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-xs">
                <thead className="bg-slate-700/50 sticky top-0">
                  <tr className="text-slate-300">
                    <th className="px-3 py-2 text-left font-medium">时间</th>
                    <th className="px-3 py-2 text-right font-medium">改判前（图）</th>
                    <th className="px-3 py-2 text-right font-medium">改判后（图）</th>
                    <th className="px-3 py-2 text-right font-medium">改判后（表）</th>
                    <th className="px-3 py-2 text-center font-medium">图表一致</th>
                    <th className="px-3 py-2 text-center font-medium">表图一致</th>
                  </tr>
                </thead>
                <tbody>
                  {appliedParameters.map((param, idx) => {
                    const rawVal = (rawParameters[idx] as any)[selectedParam] as number
                    const appliedVal = (param as any)[selectedParam] as number
                    const chartVal = appliedVal
                    const tableVal = appliedVal
                    const diff = Math.abs(rawVal - appliedVal)
                    const chartMatch = Math.abs(chartVal - tableVal) < 0.001

                    const hasOverride = hasOverrideAtTime(param.timestamp)

                    return (
                      <tr
                        key={param.id}
                        className={`border-t border-slate-700/50 hover:bg-slate-700/30 ${
                          hasOverride ? 'bg-green-500/5' : diff > 0.01 ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <td className="px-3 py-1.5 font-mono">
                          {new Date(param.timestamp).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {hasOverride && (
                            <span className="ml-2 text-[10px] text-green-400 bg-green-500/10 px-1 py-0.5 rounded-sm">
                              改判点
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-slate-500">
                          {rawVal.toFixed(2)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-sky-300">
                          {chartVal.toFixed(2)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-sky-300">
                          {tableVal.toFixed(2)}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {diff > 0.01 ? (
                            <span className="text-amber-400">
                              <XCircle className="w-3.5 h-3.5 inline" />
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {chartMatch ? (
                            <span className="text-green-400">
                              <CheckCircle className="w-3.5 h-3.5 inline" />
                            </span>
                          ) : (
                            <span className="text-red-400">
                              <XCircle className="w-3.5 h-3.5 inline" />
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
