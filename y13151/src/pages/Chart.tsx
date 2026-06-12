import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ReferenceLine,
  Cell,
  ZAxis,
} from 'recharts'
import StatusBadge from '@/components/StatusBadge'
import EventDrawer from '@/components/EventDrawer'
import {
  useBatches,
  useConfig,
  useComputes,
  useRows,
  useSelectedBatchId,
  useActions,
  useComputeByRowId,
  useAnomaliesByRowId,
} from '@/hooks/useAppStore'
import type { ComputeRecord, SensorRow, AnomalyQueue } from '@/types'
import { formatTimeHM, formatTimestamp } from '@/utils/exporter'

interface ChartPoint {
  time: number
  timeLabel: string
  rowId: string
  computedValue: number | null
  rawValue: number
  threshold: number
  warningLine: number
  result: 'normal' | 'warning' | 'critical'
  hasAnomaly: boolean
  eventType?: 'anomaly' | 'manual' | 'jump' | 'failed'
  eventLabel?: string
}

const EVENT_COLORS: Record<string, string> = {
  normal: '#059669',
  warning: '#D97706',
  critical: '#DC2626',
  direction: '#D97706',
  failed: '#DC2626',
  manual: '#0B2545',
  jump: '#7c3aed',
}

const Chart = () => {
  const batches = useBatches()
  const computes = useComputes()
  const rows = useRows()
  const config = useConfig()
  const selectedBatchId = useSelectedBatchId()
  const { setSelectedBatchId } = useActions()

  const [activeBatchId, setActiveBatchId] = useState(selectedBatchId || batches[0]?.id || '')
  const [range, setRange] = useState<[number, number]>([0, 100])
  const [drawerRowId, setDrawerRowId] = useState<string | null>(null)

  const batchRows = useMemo(() => {
    return activeBatchId ? rows.filter((r) => r.batchId === activeBatchId) : rows
  }, [rows, activeBatchId])

  const rowMap = useMemo(() => {
    const m = new Map<string, SensorRow>()
    rows.forEach((r) => m.set(r.id, r))
    return m
  }, [rows])

  const computeMap = useMemo(() => {
    const m = new Map<string, ComputeRecord>()
    computes.forEach((c) => m.set(c.rowId, c))
    return m
  }, [computes])

  const allEvents = useMemo(() => {
    const list: { rowId: string; type: string; label: string; compute?: ComputeRecord }[] = []
    computes.forEach((c) => {
      if (c.status === 'failed') list.push({ rowId: c.rowId, type: 'failed', label: '算不出', compute: c })
      else if (c.status === 'manual') list.push({ rowId: c.rowId, type: 'manual', label: '人工改判', compute: c })
      if (c.jumpCause) list.push({ rowId: c.rowId, type: 'jump', label: '跳变', compute: c })
    })
    batchRows.filter((r) => r.directionSuspicious).forEach((r) => {
      list.push({ rowId: r.id, type: 'direction', label: '方向异常' })
    })
    return list
  }, [computes, batchRows])

  const eventByRow = useMemo(() => {
    const m = new Map<string, { type: string; label: string; compute?: ComputeRecord }>()
    allEvents.forEach((e) => {
      if (!m.has(e.rowId)) m.set(e.rowId, e)
    })
    return m
  }, [allEvents])

  const { chartData, eventPoints } = useMemo(() => {
    const sorted = [...batchRows].sort((a, b) => a.timestamp - b.timestamp)
    const total = sorted.length
    const startIdx = Math.floor((range[0] / 100) * Math.max(0, total - 1))
    const endIdx = Math.ceil((range[1] / 100) * Math.max(0, total - 1))
    const slice = sorted.slice(startIdx, endIdx + 1)

    const points: ChartPoint[] = slice.map((row) => {
      const c = computeMap.get(row.id)
      const event = eventByRow.get(row.id)
      return {
        time: row.timestamp,
        timeLabel: formatTimeHM(row.timestamp),
        rowId: row.id,
        computedValue: c ? (isNaN(c.computedValue) ? null : c.computedValue) : null,
        rawValue: row.reverb,
        threshold: c?.threshold || config.threshold,
        warningLine: (c?.threshold || config.threshold) * config.warningRatio,
        result: c?.result || 'normal',
        hasAnomaly: !!event,
        eventType: event?.type as ChartPoint['eventType'],
        eventLabel: event?.label,
      }
    })

    const events: (ChartPoint & { z: number })[] = points
      .filter((p) => p.eventType)
      .map((p) => ({ ...p, z: 120 }))

    return { chartData: points, eventPoints: events }
  }, [batchRows, range, computeMap, eventByRow, config])

  const timelineItems = useMemo(() => {
    return allEvents
      .filter((e) => {
        const row = rowMap.get(e.rowId)
        if (!row) return false
        if (!activeBatchId) return true
        return row.batchId === activeBatchId
      })
      .map((e) => {
        const row = rowMap.get(e.rowId)!
        const c = computeMap.get(e.rowId)
        return {
          id: e.rowId + '_' + e.type,
          rowId: e.rowId,
          time: row.timestamp,
          type: e.type,
          label: e.label,
          compute: c,
          reason: e.compute?.failNote || e.compute?.manualNote || e.compute?.jumpNote
            || row.directionImpact || '',
          result: c?.result,
          status: c?.status,
        }
      })
      .sort((a, b) => b.time - a.time)
  }, [allEvents, rowMap, computeMap, activeBatchId])

  const switchBatch = (id: string) => {
    setActiveBatchId(id)
    setSelectedBatchId(id)
    setRange([0, 100])
  }

  const targetRow = drawerRowId ? rowMap.get(drawerRowId) : undefined
  const targetCompute = drawerRowId ? useComputeByRowId(drawerRowId) : undefined
  const targetAnomalies = drawerRowId ? useAnomaliesByRowId(drawerRowId) : []

  const handleScatterClick = (p: { payload?: ChartPoint }) => {
    if (p.payload?.rowId) setDrawerRowId(p.payload.rowId)
  }

  const CustomDot = (props: { cx?: number; cy?: number; payload?: ChartPoint; onClick?: (p: ChartPoint) => void }) => {
    const { cx, cy, payload, onClick } = props
    if (!payload || !cx || !cy) return null
    if (payload.eventType) {
      const color = EVENT_COLORS[payload.eventType] || '#7c3aed'
      return (
        <g style={{ cursor: 'pointer' }} onClick={() => onClick?.(payload)}>
          <circle cx={cx} cy={cy} r={7} fill={color} fillOpacity={0.18} />
          <circle cx={cx} cy={cy} r={4.5} fill={color} stroke="white" strokeWidth={1.5} />
        </g>
      )
    }
    return <circle cx={cx} cy={cy} r={2.5} fill="#0B2545" />
  }

  return (
    <div>
      <div className="filter-bar">
        <div className="filter-item" style={{ minWidth: 200 }}>
          <div className="text-xs font-medium text-gray-700 mb-1">批次选择器</div>
          <select
            className="select input-sm"
            value={activeBatchId}
            onChange={(e) => switchBatch(e.target.value)}
          >
            {batches.length === 0 && <option value="">尚未导入批次</option>}
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.source}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-0" style={{ minWidth: 300 }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">时间范围</span>
            <span className="text-xs text-gray-500 font-mono">
              {chartData[0]?.timeLabel || '—'} ~ {chartData[chartData.length - 1]?.timeLabel || '—'}
              <span className="mx-1">·</span>
              共 {chartData.length} 点
            </span>
          </div>
          <div className="flex items-center gap-2 px-2">
            <input
              type="range"
              min={0}
              max={100}
              value={range[0]}
              onChange={(e) => {
                const v = Math.min(range[1] - 1, parseInt(e.target.value))
                setRange([v, range[1]])
              }}
              className="flex-1"
              style={{ accentColor: 'var(--primary)' }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={range[1]}
              onChange={(e) => {
                const v = Math.max(range[0] + 1, parseInt(e.target.value))
                setRange([range[0], v])
              }}
              className="flex-1"
              style={{ accentColor: 'var(--primary)' }}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-4" style={{ minHeight: 520 }}>
        <div className="col-span-4 card p-4 flex flex-col">
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 rounded" style={{ background: 'var(--primary)' }} />
              <span className="text-sm">计算值</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 rounded" style={{ background: 'var(--gray-400)', borderTop: '2px dashed var(--coral)' }} />
              <span className="text-sm">阈值 {config.threshold}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 rounded" style={{ borderTop: '2px dashed var(--amber)' }} />
              <span className="text-sm">预警线 {(config.threshold * config.warningRatio).toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap ml-2">
              {[
                ['moss', '正常'],
                ['amber', '预警'],
                ['coral', '临界'],
                ['amber', '方向异常'],
                ['coral', '算不出'],
                ['primary', '人工改判'],
                ['jump', '跳变'],
              ].map(([k, label]) => {
                const color = k === 'jump' ? '#7c3aed'
                  : k === 'primary' ? 'var(--primary)'
                  : k === 'coral' ? 'var(--coral)'
                  : k === 'amber' ? 'var(--amber)'
                  : 'var(--moss)'
                return (
                  <span key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    {label}
                  </span>
                )
              })}
            </div>
          </div>
          <div className="flex-1" style={{ minHeight: 400 }}>
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="empty-state">
                  <div className="empty-state-title">暂无数据</div>
                  <div className="empty-state-desc">请导入数据或切换批次</div>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="timeLabel"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    minTickGap={30}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    label={{ value: config.unit, angle: -90, position: 'insideLeft', fontSize: 12, fill: '#6b7280' }}
                  />
                  <ZAxis dataKey="z" range={[60, 400]} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 12, padding: '10px 12px' }}
                    content={({ payload }) => {
                      if (!payload || !payload[0]?.payload) return null
                      const p = payload[0].payload as ChartPoint
                      return (
                        <div className="bg-white border border-gray-200 rounded-md p-3 shadow-md" style={{ minWidth: 220 }}>
                          <div className="font-serif font-semibold text-primary text-sm mb-2">
                            {formatTimestamp(p.time)}
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-500">计算值</span>
                              <span className="font-mono font-semibold text-primary">
                                {p.computedValue === null ? '算不出' : p.computedValue.toFixed(2) + ' ' + config.unit}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">原始值</span>
                              <span className="font-mono">{p.rawValue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">阈值 / 预警线</span>
                              <span className="font-mono">{p.threshold} / {p.warningLine.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-gray-100 mt-1">
                              <span className="text-gray-500">判定</span>
                              <StatusBadge kind={{ type: 'result', value: p.result }} size="sm" />
                            </div>
                            {p.eventType && (
                              <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                                <span className="text-gray-500">事件</span>
                                <span
                                  className="chip chip-sm"
                                  style={{
                                    background: (EVENT_COLORS[p.eventType] || '#7c3aed') + '22',
                                    color: EVENT_COLORS[p.eventType] || '#7c3aed',
                                  }}
                                >
                                  {p.eventLabel}
                                </span>
                              </div>
                            )}
                            <div className="pt-2 text-xs text-gray-400">点击事件点查看完整解释</div>
                          </div>
                        </div>
                      )
                    }}
                  />
                  <ReferenceLine
                    y={config.threshold}
                    stroke="var(--coral)"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                  <ReferenceLine
                    y={config.threshold * config.warningRatio}
                    stroke="var(--amber)"
                    strokeDasharray="4 4"
                    strokeWidth={1.2}
                  />
                  <Line
                    type="monotone"
                    dataKey="computedValue"
                    stroke="#0B2545"
                    strokeWidth={2}
                    dot={<CustomDot onClick={(p) => setDrawerRowId(p.rowId)} />}
                    activeDot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Scatter data={eventPoints} dataKey="computedValue" isAnimationActive={false}>
                    {eventPoints.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={EVENT_COLORS[entry.eventType || 'manual'] || '#7c3aed'}
                        onClick={() => handleScatterClick({ payload: entry })}
                      />
                    ))}
                  </Scatter>
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="card p-4 flex flex-col overflow-hidden">
          <div className="font-serif font-semibold text-primary mb-3 text-base flex items-center gap-2">
            事件时间线
            <span className="chip chip-sm chip-outline ml-auto">{timelineItems.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto -mx-2 px-2">
            {timelineItems.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">暂无事件</div>
                <div className="empty-state-desc">计算后会出现异常/改判/跳变</div>
              </div>
            ) : (
              <div className="timeline">
                {timelineItems.map((item) => {
                  const kind = item.type === 'failed' ? 'coral'
                    : item.type === 'manual' ? 'primary'
                    : item.type === 'jump' ? 'amber'
                    : item.type === 'direction' ? 'amber'
                    : ''
                  return (
                    <div
                      key={item.id}
                      className={'timeline-item ' + kind}
                      onClick={() => setDrawerRowId(item.rowId)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex items-center gap-1 mb-1 flex-wrap">
                        <span
                          className="chip chip-sm"
                          style={{
                            background: (EVENT_COLORS[item.type] || '#7c3aed') + '22',
                            color: EVENT_COLORS[item.type] || '#7c3aed',
                          }}
                        >
                          {item.label}
                        </span>
                        {item.result && <StatusBadge kind={{ type: 'result', value: item.result }} size="sm" />}
                      </div>
                      <div className="text-xs font-mono text-gray-500 mb-1">
                        {formatTimestamp(item.time)}
                      </div>
                      {item.reason && (
                        <div className="text-xs text-gray-600 line-clamp-2">
                          {item.reason}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <EventDrawer
        open={drawerRowId !== null}
        onClose={() => setDrawerRowId(null)}
        row={targetRow}
        compute={targetCompute}
        anomaly={targetAnomalies[0] as AnomalyQueue | undefined}
      />
    </div>
  )
}

export default Chart
