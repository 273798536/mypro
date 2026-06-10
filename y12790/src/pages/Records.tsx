import { Link } from 'react-router-dom'
import { useStore } from '@/store'
import StatusBadge from '@/components/StatusBadge'
import CompletenessRing from '@/components/CompletenessRing'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import type { ExperimentRecord } from '@/types'

const COLUMNS = ['样品编号', '浸提方法', '温度', 'pH', '实验员', '完整度', '结论分级'] as const

function CellValue({ record, field }: { record: ExperimentRecord; field: string }) {
  const valueMap: Record<string, string | null> = {
    样品编号: record.sampleCode,
    浸提方法: record.extractionMethod,
    温度: record.temperature !== null ? `${record.temperature}℃` : null,
    pH: record.ph !== null ? `${record.ph}` : null,
    实验员: record.operator,
  }
  const value = valueMap[field]
  if (value === null || value === undefined) {
    return <span className="inline-block rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">缺失</span>
  }
  return <span className="text-sm text-gray-900 dark:text-gray-100">{value}</span>
}

export default function Records() {
  const records = useStore((s) => s.records)

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">实验记录</h1>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          新增记录
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              {COLUMNS.map((col) => (
                <th key={col} className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-gray-500">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                key={record.id}
                className="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-indigo-50/50 dark:border-gray-800 dark:hover:bg-indigo-900/20"
              >
                <td className="px-4 py-2.5">
                  <Link to={`/records/${record.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                    <CellValue record={record} field="样品编号" />
                  </Link>
                </td>
                <td className="px-4 py-2.5"><CellValue record={record} field="浸提方法" /></td>
                <td className="px-4 py-2.5"><CellValue record={record} field="温度" /></td>
                <td className="px-4 py-2.5"><CellValue record={record} field="pH" /></td>
                <td className="px-4 py-2.5"><CellValue record={record} field="实验员" /></td>
                <td className="px-4 py-2.5">
                  <CompletenessRing score={record.completenessScore} size={36} strokeWidth={3} />
                </td>
                <td className="px-4 py-2.5">
                  <Link to={`/records/${record.id}`}>
                    <StatusBadge grade={record.status} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
