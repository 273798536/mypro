import { useState, useMemo } from 'react'
import { Search, List, Calculator, AlertTriangle, Filter } from 'lucide-react'
import type {
  SensorRow,
  ComputeRecord,
  AnomalyQueue,
  LogBatch,
  ResultLevel,
  AnomalyStatus,
} from '@/types'
import StatusBadge from './StatusBadge'
import {
  useBatches,
  useAnomaliesFiltered,
  useActions,
  useSelectedRowId,
} from '@/hooks/useAppStore'
import { formatTimeHM } from '@/utils/exporter'

export interface LinkedTriplePanelProps {
  onRowClick?: (rowId: string) => void
}

const LinkedTriplePanel = ({ onRowClick }: LinkedTriplePanelProps) => {
  const batches = useBatches()
  const selectedRowId = useSelectedRowId()
  const { setSelectedRowId } = useActions()

  const [batchId, setBatchId] = useState<string | 'all'>('all')
  const [resultLevel, setResultLevel] = useState<ResultLevel | 'all'>('all')
  const [anomalyStatus, setAnomalyStatus] = useState<AnomalyStatus | 'all'>('all')
  const [keyword, setKeyword] = useState('')

  const { rows, computes, anomalies } = useAnomaliesFiltered({
    batchId: batchId === 'all' ? null : batchId,
    resultLevel,
    anomalyStatus,
    keyword,
  })

  const computeMap = useMemo(() => {
    const m = new Map<string, ComputeRecord>()
    computes.forEach((c) => m.set(c.rowId, c))
    return m
  }, [computes])

  const anomaliesByRow = useMemo(() => {
    const m = new Map<string, AnomalyQueue[]>()
    anomalies.forEach((a) => {
      const arr = m.get(a.rowId) || []
      arr.push(a)
      m.set(a.rowId, arr)
    })
    return m
  }, [anomalies])

  const handleSelect = (rowId: string) => {
    setSelectedRowId(rowId)
    onRowClick?.(rowId)
  }

  return (
    <div>
      <div className="filter-bar">
        <div className="filter-item" style={{ minWidth: 180 }}>
          <div className="flex items-center gap-1 mb-1 text-xs font-medium text-gray-700">
            <Filter size={12} /> 批次筛选
          </div>
          <select
            className="select input-sm"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
          >
            <option value="all">全部批次</option>
            {batches.map((b: LogBatch) => (
              <option key={b.id} value={b.id}>{b.source}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <div className="text-xs font-medium text-gray-700 mb-1">结果等级</div>
          <select
            className="select input-sm"
            value={resultLevel}
            onChange={(e) => setResultLevel(e.target.value as ResultLevel | 'all')}
          >
            <option value="all">全部</option>
            <option value="normal">正常</option>
            <option value="warning">预警</option>
            <option value="critical">临界</option>
          </select>
        </div>
        <div className="filter-item">
          <div className="text-xs font-medium text-gray-700 mb-1">异常状态</div>
          <select
            className="select input-sm"
            value={anomalyStatus}
            onChange={(e) => setAnomalyStatus(e.target.value as AnomalyStatus | 'all')}
          >
            <option value="all">全部</option>
            <option value="open">待处理</option>
            <option value="confirmed">已确认</option>
            <option value="ignored">已忽略</option>
            <option value="resolved">已解决</option>
          </select>
        </div>
        <div className="filter-item flex-1" style={{ minWidth: 200 }}>
          <div className="text-xs font-medium text-gray-700 mb-1">关键词</div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input input-sm"
              style={{ paddingLeft: 30 }}
              placeholder="ID / 原文 / 原因..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>
        <div className="text-xs text-gray-500 self-end ml-auto">
          日志 {rows.length} 条 · 计算 {computes.length} 条 · 异常 {anomalies.length} 条
        </div>
      </div>
      <div className="triple-container">
        <div className="triple-column">
          <div className="triple-column-header">
            <span className="flex items-center gap-1.5"><List size={14} /> LogRows</span>
            <span className="chip chip-sm chip-gray">{rows.length}</span>
          </div>
          <div className="triple-column-body">
            {rows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-desc">暂无匹配记录</div>
              </div>
            ) : (
              rows.map((r: SensorRow) => {
                const selected = selectedRowId === r.id
                return (
                  <div
                    key={r.id}
                    className={'triple-row' + (selected ? ' selected' : '')}
                    onClick={() => handleSelect(r.id)}
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-primary font-medium">{r.id.slice(-6)}</span>
                      <span className="text-xs text-gray-500">{formatTimeHM(r.timestamp)}</span>
                      {r.directionSuspicious && <StatusBadge kind={{ type: 'direction', value: true }} size="sm" />}
                      {r.dirtyFlag && <span className="chip chip-sm chip-amber">脏数据</span>}
                    </div>
                    <div className="font-mono truncate text-gray-700 mb-1" style={{ fontSize: 11 }}>
                      {r.rawLine.slice(0, 40)}{r.rawLine.length > 40 ? '…' : ''}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="chip chip-sm chip-outline font-mono">
                        {r.direction} · {r.reverb.toFixed(1)} {r.unit}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
        <div className="triple-column">
          <div className="triple-column-header">
            <span className="flex items-center gap-1.5"><Calculator size={14} /> ComputeRecords</span>
            <span className="chip chip-sm chip-gray">{computes.length}</span>
          </div>
          <div className="triple-column-body">
            {computes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-desc">暂无计算记录</div>
              </div>
            ) : (
              computes.map((c: ComputeRecord) => {
                const selected = selectedRowId === c.rowId
                return (
                  <div
                    key={c.id}
                    className={'triple-row' + (selected ? ' selected' : '')}
                    onClick={() => handleSelect(c.rowId)}
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <StatusBadge kind={{ type: 'compute', value: c.status }} size="sm" />
                      <StatusBadge kind={{ type: 'result', value: c.result }} size="sm" />
                    </div>
                    <div className="font-mono text-sm mb-1 text-gray-800" style={{ fontSize: 12 }}>
                      <span className="text-gray-500">{isNaN(c.rawValue) ? '—' : c.rawValue.toFixed(2)}</span>
                      <span className="mx-1 text-gray-400">→</span>
                      <span className={
                        c.result === 'critical' ? 'text-coral font-semibold'
                          : c.result === 'warning' ? 'text-amber font-semibold'
                          : 'text-moss font-semibold'
                      }>
                        {isNaN(c.computedValue) ? '算不出' : c.computedValue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {c.failCategory && <StatusBadge kind={{ type: 'fail', value: c.failCategory }} size="sm" />}
                      {c.jumpCause && <StatusBadge kind={{ type: 'jump', value: c.jumpCause }} size="sm" />}
                      {c.manualReason && <StatusBadge kind={{ type: 'manual', value: c.manualReason }} size="sm" />}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
        <div className="triple-column">
          <div className="triple-column-header">
            <span className="flex items-center gap-1.5"><AlertTriangle size={14} /> Anomalies</span>
            <span className="chip chip-sm chip-gray">{anomalies.length}</span>
          </div>
          <div className="triple-column-body">
            {anomalies.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-desc">暂无异常条目</div>
              </div>
            ) : (
              anomalies.map((a: AnomalyQueue) => {
                const selected = selectedRowId === a.rowId
                return (
                  <div
                    key={a.id}
                    className={'triple-row' + (selected ? ' selected' : '')}
                    onClick={() => handleSelect(a.rowId)}
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <StatusBadge kind={{ type: 'anomalyType', value: a.type }} size="sm" />
                      <StatusBadge kind={{ type: 'anomaly', value: a.status }} size="sm" />
                    </div>
                    <div className="text-sm text-gray-800 mb-1 font-medium truncate">{a.reason}</div>
                    {a.impact && <div className="text-xs text-gray-500 truncate">{a.impact}</div>}
                    <div className="text-xs text-gray-400 mt-1">
                      {a.id.slice(-6)} · {new Date(a.createdAt).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LinkedTriplePanel
