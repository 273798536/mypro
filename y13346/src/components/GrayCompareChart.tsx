import { useMemo } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ZAxis,
} from 'recharts'
import { AlertTriangle, Pause, Hand, ArrowRight } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { riskLabel, statusLabel } from '../utils/format'
import clsx from 'clsx'
import type { GrayComparePoint, RiskLevel, ReviewStatus } from '../types'

const riskY: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 }
const riskLabelsY = [
  { y: 0, label: '低风险' },
  { y: 1, label: '中风险' },
  { y: 2, label: '高风险' },
  { y: 3, label: '严重' },
]

interface DotProps {
  cx?: number
  cy?: number
  payload?: GrayComparePoint
  onClick?: () => void
}

function ChartDot({ cx, cy, payload, onClick }: DotProps) {
  if (!payload) return null
  const { diff, baseline, candidate } = payload
  let fill = '#3b82f6'
  let stroke = '#1d4ed8'
  let shape = 'circle'

  if (diff.isSuspended) {
    fill = '#8b5cf6'
    stroke = '#6d28d9'
  } else if (diff.hasManualOverrideConflict) {
    fill = '#f97316'
    stroke = '#c2410c'
  } else if (diff.riskChanged || diff.statusChanged) {
    fill = '#f59e0b'
    stroke = '#b45309'
    shape = 'square'
  } else if (baseline.hasManualCorrection) {
    fill = '#0ea5e9'
    stroke = '#0369a1'
  }

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {shape === 'square' ? (
        <rect x={(cx ?? 0) - 7} y={(cy ?? 0) - 7} width={14} height={14} rx={2} fill={fill} stroke={stroke} strokeWidth={1.5} />
      ) : (
        <circle cx={cx} cy={cy} r={8} fill={fill} stroke={stroke} strokeWidth={1.5} />
      )}
      {diff.isSuspended && (
        <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold">!</text>
      )}
      {diff.hasManualOverrideConflict && (
        <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold">?</text>
      )}
      {baseline.hasManualCorrection && !diff.hasManualOverrideConflict && !diff.isSuspended && (
        <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold">M</text>
      )}
    </g>
  )
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: GrayComparePoint }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null
  const p = payload[0].payload
  return (
    <div className="card !shadow-lg p-3 min-w-[280px]">
      <div className="text-sm font-semibold text-slate-900 mb-2">{p.prTitle}</div>
      <div className="text-xs text-slate-500 mb-3 font-mono">#{p.recordId.split('-')[1]}</div>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="text-[10px] uppercase text-slate-500 mb-1">基线 {p.baseline.modelVersion}</div>
          <div className="flex flex-wrap gap-1">
            <span className={clsx('badge', `risk-${p.baseline.riskLevel}`)}>{riskLabel[p.baseline.riskLevel]}</span>
            <span className={clsx('badge', `status-${p.baseline.status}`)}>{statusLabel[p.baseline.status]}</span>
            {p.baseline.hasManualCorrection && <span className="badge bg-sky-50 text-sky-700 border-sky-300">含人工修正</span>}
          </div>
        </div>
        <ArrowRight size={16} className="mt-4 text-slate-400" />
        <div className="flex-1">
          <div className="text-[10px] uppercase text-slate-500 mb-1">灰度 {p.candidate.modelVersion}</div>
          <div className="flex flex-wrap gap-1">
            <span className={clsx('badge', `risk-${p.candidate.riskLevel}`)}>{riskLabel[p.candidate.riskLevel]}</span>
            <span className={clsx('badge', `status-${p.candidate.status}`)}>{statusLabel[p.candidate.status]}</span>
            <span className="badge bg-slate-50 text-slate-600 border-slate-300">置信度 {Math.round(p.candidate.confidence * 100)}%</span>
          </div>
        </div>
      </div>
      {(p.diff.riskChanged || p.diff.statusChanged || p.diff.isSuspended || p.diff.hasManualOverrideConflict) && (
        <div className="mt-3 pt-2 border-t border-slate-100 space-y-1">
          {p.diff.isSuspended && (
            <div className="flex items-center gap-1.5 text-xs text-violet-700">
              <Pause size={12} /> 已挂起，需算法值班人确认
            </div>
          )}
          {p.diff.hasManualOverrideConflict && (
            <div className="flex items-center gap-1.5 text-xs text-orange-700">
              <Hand size={12} /> 人工修正与灰度预测冲突
            </div>
          )}
          {!p.diff.isSuspended && !p.diff.hasManualOverrideConflict && (p.diff.riskChanged || p.diff.statusChanged) && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700">
              <AlertTriangle size={12} /> 基线与灰度结果不一致
            </div>
          )}
        </div>
      )}
      <div className="mt-3 text-[11px] text-slate-400">点击查看详细材料 →</div>
    </div>
  )
}

export default function GrayCompareChart() {
  const buildComparePoints = useAppStore((s) => s.buildComparePoints)
  const setSelectedRecordId = useAppStore((s) => s.setSelectedRecordId)
  const setSelectedTab = useAppStore((s) => s.setSelectedTab)

  const points = useMemo(() => buildComparePoints(), [buildComparePoints])

  const chartData = useMemo(() => {
    return points.map((p, idx) => ({
      ...p,
      x: idx,
      y: riskY[p.candidate.riskLevel],
      z: p.candidate.confidence * 200 + 50,
      prTitle: p.prTitle,
    }))
  }, [points])

  const summary = useMemo(() => {
    const total = points.length
    const same = points.filter((p) => !p.diff.riskChanged && !p.diff.statusChanged && !p.diff.isSuspended).length
    const changed = points.filter((p) => (p.diff.riskChanged || p.diff.statusChanged) && !p.diff.isSuspended && !p.diff.hasManualOverrideConflict).length
    const conflicts = points.filter((p) => p.diff.hasManualOverrideConflict).length
    const suspended = points.filter((p) => p.diff.isSuspended).length
    const withManual = points.filter((p) => p.baseline.hasManualCorrection).length
    return { total, same, changed, conflicts, suspended, withManual }
  }, [points])

  const handleDotClick = (recordId: string) => {
    setSelectedRecordId(recordId)
    setSelectedTab('detail')
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card card-body">
          <div className="text-xs text-slate-500">总评测数</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{summary.total}</div>
        </div>
        <div className="card card-body">
          <div className="text-xs text-slate-500">结果一致</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{summary.same}</div>
        </div>
        <div className="card card-body">
          <div className="text-xs text-slate-500">结果变化</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{summary.changed}</div>
        </div>
        <div className="card card-body">
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Hand size={12} className="text-orange-500" /> 人工冲突
          </div>
          <div className="text-2xl font-bold text-orange-600 mt-1">{summary.conflicts}</div>
        </div>
        <div className="card card-body">
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Pause size={12} className="text-violet-500" /> 挂起待确认
          </div>
          <div className="text-2xl font-bold text-violet-600 mt-1">{summary.suspended}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">风险等级对比散点图</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              横轴为 PR 序号，纵轴为灰度模型预测风险等级。点击散点查看详细材料。
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-brand-600" /> 无变化
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" /> 结果变化
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-sky-500 text-center text-white leading-3 font-bold text-[9px]">M</span> 含人工修正
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-orange-500 text-center text-white leading-3 font-bold text-[9px]">?</span> 人工冲突
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-violet-500 text-center text-white leading-3 font-bold text-[9px]">!</span> 挂起
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="PR"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => `#${(v + 1).toString().padStart(3, '0')}`}
                  label={{ value: 'PR 序号', position: 'bottom', offset: 0, style: { fontSize: 11, fill: '#64748b' } }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="风险等级"
                  domain={[-0.2, 3.2]}
                  ticks={riskLabelsY.map((r) => r.y)}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => riskLabelsY.find((r) => r.y === v)?.label ?? ''}
                  width={60}
                />
                <ZAxis type="number" dataKey="z" range={[60, 260]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Scatter
                  name="灰度预测结果"
                  data={chartData}
                  fill="#3b82f6"
                  shape={(props: unknown) => {
                    const p = props as DotProps
                    return <ChartDot {...p} onClick={() => handleDotClick(p.payload?.recordId ?? '')} />
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-slate-900">逐条对比明细</h2>
          <p className="text-xs text-slate-500">含人工修正 / 冲突 / 挂起的记录优先展示</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-header">PR</th>
                <th className="table-header">基线结果</th>
                <th className="table-header">灰度结果</th>
                <th className="table-header">状态</th>
                <th className="table-header">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {points
                .slice()
                .sort((a, b) => {
                  const score = (p: GrayComparePoint) =>
                    (p.diff.isSuspended ? 100 : 0) +
                    (p.diff.hasManualOverrideConflict ? 50 : 0) +
                    (p.diff.riskChanged ? 10 : 0) +
                    (p.diff.statusChanged ? 5 : 0)
                  return score(b) - score(a)
                })
                .map((p) => (
                  <tr key={p.recordId} className="hover:bg-slate-50">
                    <td className="table-cell">
                      <div className="font-medium text-slate-900">{p.prTitle}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{p.recordId}</div>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1">
                        <span className={clsx('badge', `risk-${p.baseline.riskLevel}`)}>{riskLabel[p.baseline.riskLevel]}</span>
                        <span className={clsx('badge', `status-${p.baseline.status}`)}>{statusLabel[p.baseline.status]}</span>
                        {p.baseline.hasManualCorrection && <span className="badge bg-sky-50 text-sky-700 border-sky-300">人工</span>}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">{p.baseline.modelVersion}</div>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1">
                        <span className={clsx('badge', `risk-${p.candidate.riskLevel}`)}>{riskLabel[p.candidate.riskLevel]}</span>
                        <span className={clsx('badge', `status-${p.candidate.status}`)}>{statusLabel[p.candidate.status]}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {p.candidate.modelVersion} · 置信度 {Math.round(p.candidate.confidence * 100)}%
                      </div>
                    </td>
                    <td className="table-cell">
                      {p.diff.isSuspended ? (
                        <span className="badge bg-violet-100 text-violet-700 border-violet-300">挂起待确认</span>
                      ) : p.diff.hasManualOverrideConflict ? (
                        <span className="badge bg-orange-100 text-orange-700 border-orange-300">人工冲突</span>
                      ) : p.diff.riskChanged || p.diff.statusChanged ? (
                        <span className="badge bg-amber-100 text-amber-700 border-amber-300">结果变化</span>
                      ) : (
                        <span className="badge bg-emerald-100 text-emerald-700 border-emerald-300">一致</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <button className="btn btn-secondary text-xs" onClick={() => { setSelectedRecordId(p.recordId); setSelectedTab('detail') }}>
                        查看材料
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
