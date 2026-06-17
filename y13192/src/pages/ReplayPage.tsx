import { useStore } from '@/store/useStore'
import { maintenanceNotes, cells, timestamps } from '@/data/mockData'
import HeatMap from '@/components/HeatMap'
import TimelineSlider from '@/components/TimelineSlider'
import { AlertTriangle, MapPin, Download } from 'lucide-react'
import { downloadCsv } from '@/utils/exportCsv'

function toMohm(value: number, unit: string, coeff: number = 1000): number {
  return unit === 'mΩ' ? value : value * coeff
}

export default function ReplayPage() {
  const { selectedCellId, currentTimestamp, readingsMap, thresholds } = useStore()
  const readings = readingsMap[currentTimestamp] || []
  const selectedReading = readings.find((r) => r.cellId === selectedCellId)
  const selectedCell = cells.find((c) => c.id === selectedCellId)
  const selectedNote = maintenanceNotes.filter((n) => n.cellId === selectedCellId)
  const thresholdConfig = thresholds.find((t) => t.parameter === '内阻安全阈值')
  const unitConfig = thresholds.find((t) => t.parameter === '单位换算系数')
  const threshold = thresholdConfig?.value ?? 40
  const unitCoeff = unitConfig?.value ?? 1000

  const tIndex = timestamps.indexOf(currentTimestamp)
  const tLabel = tIndex >= 0 ? `T${tIndex + 1}` : 'T'

  const handleExport = () => {
    const header = ['电池ID', '行', '列', '模块名称', '标注值', '单位', '换算后(mΩ)', '是否异常', '时间戳']
    const rows = readings.map((r) => {
      const cell = cells.find((c) => c.id === r.cellId)
      const valueMohm = toMohm(r.valueMohm, r.unitLabel, unitCoeff)
      return [
        r.cellId,
        cell?.row ?? '',
        cell?.col ?? '',
        cell?.moduleName ?? '',
        r.valueMohm,
        r.unitLabel,
        Math.round(valueMohm * 100) / 100,
        valueMohm > threshold ? '是' : '否',
        currentTimestamp,
      ]
    })
    downloadCsv([header, ...rows], `内阻参数回放_${tLabel}_${currentTimestamp}.csv`)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-3" style={{ background: '#1a1a2e' }}>
        <div>
          <h1 className="text-lg font-bold text-white">电池内阻参数回放</h1>
          <p className="text-xs text-gray-500">空间位置 · 异常高亮 · 维修备注来源</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-md bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/30"
          >
            <Download className="h-3.5 w-3.5" />
            导出CSV
          </button>
          <span>安全阈值: <span className="text-amber-400 font-mono">{threshold} mΩ</span></span>
          <span>异常电池: <span className="text-red-400 font-mono">{readings.filter((r) => r.isAnomaly).length}</span></span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-auto p-6">
            <HeatMap />
          </div>
          <div className="border-t border-gray-800 px-6 py-3">
            <TimelineSlider />
          </div>
        </div>

        <aside className="w-80 shrink-0 overflow-auto border-l border-gray-800" style={{ background: '#16213e' }}>
          {selectedCellId && selectedReading ? (
            <div className="p-4">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-white">{selectedCell?.moduleName}</span>
                <span className="text-xs text-gray-500">({selectedCellId})</span>
              </div>

              <div className="mb-4 rounded-lg border border-gray-700/50 p-3" style={{ background: '#1a1a2e' }}>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-xs text-gray-500">当前内阻</span>
                  <div className="text-right">
                    <span
                      className={`text-xl font-bold font-mono ${
                        selectedReading.isAnomaly ? 'text-red-400' : 'text-green-400'
                      }`}
                    >
                      {selectedReading.valueMohm.toFixed(selectedReading.unitLabel === 'mΩ' ? 2 : 5)} {selectedReading.unitLabel}
                    </span>
                    {selectedReading.unitLabel !== 'mΩ' && (
                      <div className="text-xs text-amber-400 mt-0.5">
                        = {toMohm(selectedReading.valueMohm, selectedReading.unitLabel, unitCoeff).toFixed(2)} mΩ
                      </div>
                    )}
                  </div>
                </div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-xs text-gray-500">安全阈值</span>
                  <span className="text-sm font-mono text-amber-400">{threshold} mΩ</span>
                </div>
                {selectedReading.isAnomaly && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    超标 {((toMohm(selectedReading.valueMohm, selectedReading.unitLabel, unitCoeff) - threshold) / threshold * 100).toFixed(1)}%
                  </div>
                )}
                {selectedReading.unitLabel !== 'mΩ' && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-orange-400">
                    <AlertTriangle className="h-3 w-3" />
                    单位标注: {selectedReading.unitLabel}（已自动换算为mΩ判断异常）
                  </div>
                )}
              </div>

              <div className="mb-2 text-xs font-semibold text-gray-400">关联维修备注</div>
              {selectedNote.length > 0 ? (
                selectedNote.map((n) => (
                  <div key={n.id} className="mb-2 rounded border border-gray-700/50 p-2 text-xs" style={{ background: '#1a1a2e' }}>
                    <p className="text-gray-300">{n.content}</p>
                    <div className="mt-1 flex items-center gap-2 text-gray-500">
                      <span className={`rounded px-1.5 py-0.5 ${
                        n.sourceType === 'written' ? 'bg-blue-500/20 text-blue-400' :
                        n.sourceType === 'oral' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {n.sourceType === 'written' ? '书面' : n.sourceType === 'oral' ? '口头' : '临时'}
                      </span>
                      <span>{n.sourceName}</span>
                      {n.conflictsWithMaterial && (
                        <span className="text-red-400">⚠ 与材料矛盾</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-600">暂无关联备注</p>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <MapPin className="mb-3 h-8 w-8 text-gray-600" />
              <p className="text-sm text-gray-500">点击电池单元格查看详情</p>
              <p className="mt-1 text-xs text-gray-600">异常电池将以红色高亮显示</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
