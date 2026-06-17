import { useMemo } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { STATUS_LABELS, COLUMN_LABELS } from '@/types'
import { generateCsvPreview } from '@/utils/csv'
import { filterRecords } from '@/utils/timecode'

interface RowComparison {
  songName: string
  pageStatus: string
  csvStatus: string
  isConsistent: boolean
}

export default function ConsistencyCheck() {
  const records = useStore((s) => s.records)
  const filter = useStore((s) => s.filter)
  const exportConfig = useStore((s) => s.exportConfig)

  const filtered = useMemo(() => filterRecords(records, filter), [records, filter])

  const comparisons = useMemo<RowComparison[]>(() => {
    const csvPreview = generateCsvPreview(filtered, exportConfig, filter)
    const statusLabel = COLUMN_LABELS['status']
    const headerRowIndex = csvPreview.findIndex((row) => row.includes(statusLabel))

    if (headerRowIndex === -1) {
      return filtered.map((r) => ({
        songName: r.songName,
        pageStatus: STATUS_LABELS[r.status],
        csvStatus: STATUS_LABELS[r.status],
        isConsistent: true,
      }))
    }

    const headerRow = csvPreview[headerRowIndex]
    const statusColIndex = headerRow.findIndex((h) => h === statusLabel)

    return filtered.map((r, i) => {
      const csvRow = csvPreview[headerRowIndex + 1 + i]
      const csvStatus = csvRow?.[statusColIndex] ?? ''
      const pageStatus = STATUS_LABELS[r.status]
      return {
        songName: r.songName,
        pageStatus,
        csvStatus,
        isConsistent: pageStatus === csvStatus,
      }
    })
  }, [filtered, exportConfig, filter])

  const consistentCount = comparisons.filter((c) => c.isConsistent).length

  return (
    <div className="space-y-4">
      {comparisons.length === 0 ? (
        <p className="text-sm text-[#888]">暂无筛选记录可供比对</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-[#3a3a55]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#3a3a55]">
                  <th className="px-4 py-2 text-left text-[#e8e8e8]">曲名</th>
                  <th className="px-4 py-2 text-left text-[#e8e8e8]">页面状态</th>
                  <th className="px-4 py-2 text-left text-[#e8e8e8]">CSV状态</th>
                  <th className="px-4 py-2 text-center text-[#e8e8e8]">一致性</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((c, i) => (
                  <tr key={i} className="border-t border-[#3a3a55]">
                    <td className="px-4 py-2 text-[#e8e8e8]">{c.songName}</td>
                    <td className="px-4 py-2 text-[#e8e8e8]">{c.pageStatus}</td>
                    <td className="px-4 py-2 text-[#e8e8e8]">{c.csvStatus}</td>
                    <td className="px-4 py-2 text-center">
                      {c.isConsistent ? (
                        <CheckCircle2 size={18} className="inline-block text-green-400" />
                      ) : (
                        <XCircle size={18} className="inline-block text-red-400" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-[#b0b0b0]">
            {consistentCount} / {comparisons.length} 条记录一致
          </p>
        </>
      )}
    </div>
  )
}
