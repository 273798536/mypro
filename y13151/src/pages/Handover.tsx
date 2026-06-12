import { useState } from 'react'
import { Download, FileJson, FileSpreadsheet, Share2 } from 'lucide-react'
import LinkedTriplePanel from '@/components/LinkedTriplePanel'
import EventDrawer from '@/components/EventDrawer'
import {
  useBatches,
  useComputes,
  useAnomalies,
  useRows,
  useActions,
  useSelectedRowId,
  useComputeByRowId,
  useAnomaliesByRowId,
} from '@/hooks/useAppStore'
import { exportCsv, exportJson, triggerDownload } from '@/utils/exporter'
import StatusBadge from '@/components/StatusBadge'

const Handover = () => {
  const batches = useBatches()
  const rows = useRows()
  const computes = useComputes()
  const anomalies = useAnomalies()
  const selectedRowId = useSelectedRowId()
  const { setSelectedRowId } = useActions()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [exportMode, setExportMode] = useState<'csv' | 'json' | null>(null)

  const targetRow = selectedRowId ? rows.find((r) => r.id === selectedRowId) : undefined
  const targetCompute = selectedRowId ? useComputeByRowId(selectedRowId) : undefined
  const targetAnomalies = selectedRowId ? useAnomaliesByRowId(selectedRowId) : []

  const handleExportCsv = () => {
    const content = exportCsv(batches, rows, computes, anomalies)
    const fname = `reverb-handover-${new Date().toISOString().slice(0, 10)}.csv`
    triggerDownload(content, fname, 'text/csv;charset=utf-8')
  }

  const handleExportJson = () => {
    const content = exportJson(batches, rows, computes, anomalies)
    const fname = `reverb-handover-${new Date().toISOString().slice(0, 10)}.json`
    triggerDownload(content, fname, 'application/json')
  }

  const handleRowClick = (rowId: string) => {
    setSelectedRowId(rowId)
    setDrawerOpen(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-xl font-serif font-semibold text-primary flex items-center gap-2">
          <Share2 size={20} /> 交付视图
        </h2>
        <div className="text-sm text-gray-500 mt-1">
          三栏联动：点击任意一行可联动高亮其余两栏。筛选器三栏共享。
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex p-1 bg-gray-100 rounded-md">
          <button
            className={
              'btn btn-sm ' +
              (exportMode === 'csv' ? 'btn-primary' : 'btn-ghost')
            }
            onClick={() => {
              setExportMode('csv')
              handleExportCsv()
              setTimeout(() => setExportMode(null), 500)
            }}
          >
            <FileSpreadsheet size={13} /> 导出 CSV
          </button>
          <button
            className={
              'btn btn-sm ' +
              (exportMode === 'json' ? 'btn-primary' : 'btn-ghost')
            }
            onClick={() => {
              setExportMode('json')
              handleExportJson()
              setTimeout(() => setExportMode(null), 500)
            }}
          >
            <FileJson size={13} /> 导出 JSON
          </button>
        </div>
      </div>
      <LinkedTriplePanel onRowClick={handleRowClick} />
      <div className="mt-5 card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
          <h3 className="text-lg font-serif font-semibold text-primary flex items-center gap-2">
            <Download size={18} /> 交付快照导出
          </h3>
          <div className="text-sm text-gray-500 mt-1">
            完整交付包，包含批次信息、原始日志、计算记录、异常队列及备注，可用于归档或转交。
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="stat-card !p-4">
            <div className="stat-card-accent moss" />
            <div className="flex items-start justify-between">
              <div>
                <div className="stat-card-label">传感器日志</div>
                <div className="stat-card-number !text-2xl">{rows.length}</div>
              </div>
              <div
                className="w-9 h-9 rounded flex items-center justify-center"
                style={{ background: 'rgba(5, 150, 105, 0.1)' }}
              >
                <FileSpreadsheet size={18} color="var(--moss)" />
              </div>
            </div>
          </div>
          <div className="stat-card !p-4">
            <div className="stat-card-accent primary" />
            <div className="flex items-start justify-between">
              <div>
                <div className="stat-card-label">计算记录</div>
                <div className="stat-card-number !text-2xl">{computes.length}</div>
              </div>
              <div
                className="w-9 h-9 rounded flex items-center justify-center"
                style={{ background: 'rgba(11, 37, 69, 0.08)' }}
              >
                <FileJson size={18} color="var(--primary)" />
              </div>
            </div>
          </div>
          <div className="stat-card !p-4">
            <div className="stat-card-accent coral" />
            <div className="flex items-start justify-between">
              <div>
                <div className="stat-card-label">异常条目</div>
                <div className="stat-card-number !text-2xl">{anomalies.length}</div>
              </div>
              <div
                className="w-9 h-9 rounded flex items-center justify-center"
                style={{ background: 'rgba(220, 38, 38, 0.08)' }}
              >
                <Share2 size={18} color="var(--coral)" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
          <button className="btn btn-moss" onClick={handleExportCsv}>
            <Download size={15} /> 交付快照 · CSV
          </button>
          <button className="btn btn-primary" onClick={handleExportJson}>
            <Download size={15} /> 交付快照 · JSON
          </button>
          <div className="ml-auto flex items-center gap-2">
            <StatusBadge kind={{ type: 'result', value: 'normal' }} size="sm" />
            <span className="text-xs text-gray-500">
              正常 {computes.filter((c) => c.result === 'normal').length}
            </span>
            <StatusBadge kind={{ type: 'result', value: 'warning' }} size="sm" />
            <span className="text-xs text-gray-500">
              预警 {computes.filter((c) => c.result === 'warning').length}
            </span>
            <StatusBadge kind={{ type: 'result', value: 'critical' }} size="sm" />
            <span className="text-xs text-gray-500">
              临界 {computes.filter((c) => c.result === 'critical').length}
            </span>
          </div>
        </div>
      </div>
      <EventDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        row={targetRow}
        compute={targetCompute}
        anomaly={targetAnomalies[0]}
      />
    </div>
  )
}

export default Handover
