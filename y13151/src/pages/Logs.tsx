import { useState, useMemo } from 'react'
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Navigation,
} from 'lucide-react'
import ImportPanel from '@/components/ImportPanel'
import StatusBadge from '@/components/StatusBadge'
import EventDrawer from '@/components/EventDrawer'
import {
  useBatches,
  useRows,
  useSelectedBatchId,
  useActions,
  useComputeByRowId,
  useAnomaliesByRowId,
} from '@/hooks/useAppStore'
import type { SensorRow, LogBatch } from '@/types'
import { formatTimestamp } from '@/utils/exporter'

type FilterKind = 'all' | 'suspicious' | 'dirty'

const Logs = () => {
  const batches = useBatches()
  const allRows = useRows()
  const selectedBatchId = useSelectedBatchId()
  const { setSelectedBatchId, confirmDirection, ignoreDirection } = useActions()

  const [filter, setFilter] = useState<FilterKind>('all')
  const [keyword, setKeyword] = useState('')
  const [drawerRow, setDrawerRow] = useState<SensorRow | null>(null)
  const [activeBatchId, setActiveBatchId] = useState(selectedBatchId || batches[0]?.id || '')

  const batchRows = useMemo(() => {
    let list = activeBatchId ? allRows.filter((r) => r.batchId === activeBatchId) : allRows
    if (filter === 'suspicious') list = list.filter((r) => r.directionSuspicious)
    else if (filter === 'dirty') list = list.filter((r) => r.dirtyFlag)
    if (keyword.trim()) {
      const kw = keyword.toLowerCase()
      list = list.filter(
        (r) =>
          r.id.toLowerCase().includes(kw) ||
          r.rawLine.toLowerCase().includes(kw) ||
          r.direction.toLowerCase().includes(kw),
      )
    }
    return list
  }, [allRows, activeBatchId, filter, keyword])

  const targetCompute = drawerRow ? useComputeByRowId(drawerRow.id) : undefined
  const targetAnomalies = drawerRow ? useAnomaliesByRowId(drawerRow.id) : []

  const switchBatch = (id: string) => {
    setActiveBatchId(id)
    setSelectedBatchId(id)
  }

  const currentBatch: LogBatch | undefined = batches.find((b) => b.id === activeBatchId)

  return (
    <div>
      <ImportPanel />
      <div className="card mb-5 overflow-hidden">
        <div className="tabs overflow-x-auto">
          {batches.map((b) => (
            <div
              key={b.id}
              className={'tab' + (b.id === activeBatchId ? ' active' : '')}
              onClick={() => switchBatch(b.id)}
            >
              <div className="flex items-center gap-2">
                <StatusBadge kind={{ type: 'batch', value: b.status }} size="sm" showIcon={false} />
                <span>{b.source}</span>
                <span className="chip chip-sm chip-outline font-mono">
                  {allRows.filter((r) => r.batchId === b.id).length}
                </span>
              </div>
            </div>
          ))}
          {batches.length === 0 && (
            <div className="tab active">尚未导入批次</div>
          )}
        </div>
      </div>
      <div className="filter-bar">
        <div className="flex gap-1 p-0.5 rounded bg-gray-100" style={{ minWidth: 280 }}>
          {([
            ['all', '全部'],
            ['suspicious', '方向疑点'],
            ['dirty', '脏数据'],
          ] as [FilterKind, string][]).map(([k, label]) => (
            <button
              key={k}
              className={
                'btn btn-sm flex-1 ' +
                (filter === k ? 'btn-primary' : 'btn-ghost')
              }
              onClick={() => setFilter(k)}
              style={filter === k ? {} : { border: 'none' }}
            >
              <Filter size={12} /> {label}
              {k === 'all' && currentBatch && (
                <span className="ml-1 chip chip-sm chip-outline">
                  {allRows.filter((r) => r.batchId === activeBatchId).length}
                </span>
              )}
              {k === 'suspicious' && (
                <span className="ml-1 chip chip-sm chip-coral">
                  {allRows.filter((r) => r.batchId === activeBatchId && r.directionSuspicious).length}
                </span>
              )}
              {k === 'dirty' && (
                <span className="ml-1 chip chip-sm chip-amber">
                  {allRows.filter((r) => r.batchId === activeBatchId && r.dirtyFlag).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-0" style={{ minWidth: 200 }}>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input input-sm"
              style={{ paddingLeft: 30 }}
              placeholder="搜索 ID / 原文 / 方向..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>
        <div className="text-xs text-gray-500">
          显示 {batchRows.length} / {allRows.filter((r) => r.batchId === activeBatchId).length || 0} 条
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table" style={{ minWidth: 1100 }}>
            <thead>
              <tr>
                <th style={{ width: 80 }}>ID</th>
                <th style={{ minWidth: 280 }}>原始行</th>
                <th style={{ width: 140 }}>时间</th>
                <th style={{ width: 80 }}>方向</th>
                <th style={{ width: 100 }}>混响</th>
                <th style={{ width: 80 }}>单位</th>
                <th style={{ width: 90 }}>方向疑点</th>
                <th style={{ minWidth: 150 }}>脏数据原因</th>
                <th style={{ width: 200 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {batchRows.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state py-10">
                      <div className="empty-state-title">暂无数据</div>
                      <div className="empty-state-desc">请先导入日志或切换筛选条件</div>
                    </div>
                  </td>
                </tr>
              ) : (
                batchRows.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.dirtyFlag ? 'amber-row' : row.directionSuspicious ? 'coral-row' : ''
                    }
                  >
                    <td>
                      <span className="font-mono text-xs text-primary">{row.id.slice(-6)}</span>
                    </td>
                    <td className="font-mono text-xs truncate" style={{ maxWidth: 280 }} title={row.rawLine}>
                      {row.rawLine}
                    </td>
                    <td className="text-xs text-gray-600">{formatTimestamp(row.timestamp)}</td>
                    <td className={row.directionSuspicious ? 'highlight-cell' : ''}>
                      <span className="chip chip-sm chip-outline font-mono font-semibold">
                        <Navigation size={10} className="mr-0.5" /> {row.direction}
                      </span>
                    </td>
                    <td className="font-mono text-sm">
                      {isNaN(row.reverb) ? '—' : row.reverb.toFixed(2)}
                    </td>
                    <td>
                      <span className="chip chip-sm chip-gray">{row.unit}</span>
                    </td>
                    <td>
                      {row.directionSuspicious
                        ? <StatusBadge kind={{ type: 'direction', value: true }} size="sm" />
                        : row.directionConfirmed
                          ? <StatusBadge kind={{ type: 'direction', value: false }} size="sm" />
                          : <span className="text-gray-400 text-sm">—</span>
                      }
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {row.dirtyFlag
                          ? row.dirtyReasons.map((r, i) => (
                              <span key={i} className="chip chip-sm chip-amber">{r}</span>
                            ))
                          : <span className="text-gray-400 text-sm">—</span>
                        }
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => setDrawerRow(row)}
                        >
                          <Eye size={12} /> 解释
                        </button>
                        {row.directionSuspicious && (
                          <>
                            <button
                              className="btn btn-sm btn-moss"
                              onClick={() => confirmDirection(row.id)}
                              title="确认方向"
                            >
                              <CheckCircle size={12} /> 确认
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => ignoreDirection(row.id)}
                              title="忽略此疑点"
                            >
                              <XCircle size={12} /> 忽略
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <EventDrawer
        open={drawerRow !== null}
        onClose={() => setDrawerRow(null)}
        row={drawerRow || undefined}
        compute={targetCompute}
        anomaly={targetAnomalies[0]}
      />
    </div>
  )
}

export default Logs
