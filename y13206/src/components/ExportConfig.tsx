import { useMemo } from 'react'
import { Download, Eye } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { COLUMN_LABELS } from '@/types'
import { exportToCsv, generateCsvPreview } from '@/utils/csv'
import { filterRecords } from '@/utils/timecode'

export default function ExportConfig() {
  const records = useStore((s) => s.records)
  const filter = useStore((s) => s.filter)
  const exportConfig = useStore((s) => s.exportConfig)
  const setExportConfig = useStore((s) => s.setExportConfig)

  const filtered = useMemo(() => filterRecords(records, filter), [records, filter])

  const columnEntries = Object.entries(COLUMN_LABELS)

  const toggleColumn = (col: string) => {
    const next = exportConfig.selectedColumns.includes(col)
      ? exportConfig.selectedColumns.filter((c) => c !== col)
      : [...exportConfig.selectedColumns, col]
    setExportConfig({ selectedColumns: next })
  }

  const { headerRowIndex, displayRows } = useMemo(() => {
    const rows = generateCsvPreview(filtered.slice(0, 3), exportConfig, filter)
    const firstHeader = COLUMN_LABELS['songName']
    const idx = rows.findIndex((row) => row.includes(firstHeader))
    return { headerRowIndex: idx, displayRows: rows }
  }, [filtered, exportConfig, filter])

  const handleExport = () => {
    if (exportConfig.selectedColumns.length === 0) return
    exportToCsv(filtered, exportConfig, filter)
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[#e8e8e8]">选择导出列</h3>
        <div className="grid grid-cols-3 gap-2">
          {columnEntries.map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#e8e8e8] transition hover:bg-[#3a3a55]"
            >
              <input
                type="checkbox"
                checked={exportConfig.selectedColumns.includes(key)}
                onChange={() => toggleColumn(key)}
                className="accent-[#f0a500]"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-8">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#e8e8e8]">
          <input
            type="checkbox"
            checked={exportConfig.includeFilterCriteria}
            onChange={(e) => setExportConfig({ includeFilterCriteria: e.target.checked })}
            className="accent-[#f0a500]"
          />
          在CSV头部包含筛选条件
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#e8e8e8]">
          <input
            type="checkbox"
            checked={exportConfig.includeSupplementaryRemarks}
            onChange={(e) => setExportConfig({ includeSupplementaryRemarks: e.target.checked })}
            className="accent-[#f0a500]"
          />
          包含后补备注
        </label>
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#e8e8e8]">
          <Eye size={16} />
          预览（前3条）
        </h3>
        <div className="overflow-x-auto rounded-lg border border-[#3a3a55]">
          <table className="w-full text-xs">
            {headerRowIndex > 0 && (
              <tbody>
                {displayRows.slice(0, headerRowIndex).map((row, ri) => (
                  <tr key={`pre-${ri}`} className="border-t border-[#3a3a55]">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-3 py-2 text-[#f0a500] whitespace-nowrap max-w-[300px] truncate italic">
                        {cell || ' '}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            )}
            <thead>
              <tr className="bg-[#3a3a55]">
                {displayRows[headerRowIndex]?.map((header, i) => (
                  <th key={i} className="px-3 py-2 text-left text-[#e8e8e8] whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.slice(headerRowIndex + 1).map((row, ri) => (
                <tr key={ri} className="border-t border-[#3a3a55]">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-[#b0b0b0] whitespace-nowrap max-w-[200px] truncate">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button
        onClick={handleExport}
        disabled={exportConfig.selectedColumns.length === 0}
        className="flex items-center gap-2 rounded-xl bg-[#f0a500] px-6 py-2.5 text-sm font-semibold text-[#1a1a2e] shadow-[0_4px_0_#c78800] transition hover:shadow-[0_2px_0_#c78800] hover:translate-y-[2px] active:shadow-[0_0px_0_#c78800] active:translate-y-[4px] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Download size={16} />
        导出CSV
      </button>
    </div>
  )
}
