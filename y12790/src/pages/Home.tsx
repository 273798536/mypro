import { Link } from 'react-router-dom'
import { useStore } from '@/store'
import StatusBadge from '@/components/StatusBadge'
import CompletenessRing from '@/components/CompletenessRing'
import { cn } from '@/lib/utils'
import { Database, CheckCircle, AlertTriangle, XCircle, BarChart3, Bug } from 'lucide-react'

export default function Home() {
  const records = useStore((s) => s.records)

  const totalCount = records.length
  const usableCount = records.filter((r) => r.status === 'usable').length
  const reviewCount = records.filter((r) => r.status === 'review').length
  const badCount = records.filter((r) => r.status === 'bad').length
  const avgCompleteness = totalCount > 0
    ? Math.round(records.reduce((sum, r) => sum + r.completenessScore, 0) / totalCount)
    : 0
  const totalAnomalies = records.reduce((sum, r) => sum + r.anomalies.length, 0)

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard icon={<Database className="h-5 w-5" />} label="总记录数" value={totalCount} color="text-gray-700 dark:text-gray-300" bg="bg-gray-50 dark:bg-gray-800" />
        <SummaryCard icon={<CheckCircle className="h-5 w-5" />} label="可用" value={usableCount} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-900/30" />
        <SummaryCard icon={<AlertTriangle className="h-5 w-5" />} label="待复核" value={reviewCount} color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-900/30" />
        <SummaryCard icon={<XCircle className="h-5 w-5" />} label="数据坏" value={badCount} color="text-red-600 dark:text-red-400" bg="bg-red-50 dark:bg-red-900/30" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <BarChart3 className="h-5 w-5 text-indigo-500" />
          <div>
            <p className="text-xs text-gray-500">平均完整度</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{avgCompleteness}%</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <Bug className="h-5 w-5 text-rose-500" />
          <div>
            <p className="text-xs text-gray-500">异常总数</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{totalAnomalies}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-500">记录列表</h2>
        <div className="space-y-2">
          {records.map((record) => (
            <Link
              key={record.id}
              to={`/records/${record.id}`}
              className={cn(
                'flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3',
                'transition-colors hover:border-indigo-300 hover:bg-indigo-50/50',
                'dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-600 dark:hover:bg-indigo-900/20',
              )}
            >
              <CompletenessRing score={record.completenessScore} size={40} strokeWidth={3} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{record.sampleCode}</span>
                  <StatusBadge grade={record.status} />
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                  <span>{record.extractionMethod ?? '—'}</span>
                  <span>{record.operator ?? '—'}</span>
                  <span>{new Date(record.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value, color, bg }: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  bg: string
}) {
  return (
    <div className={cn('flex items-center gap-3 rounded-lg px-4 py-3', bg)}>
      <span className={color}>{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={cn('text-xl font-semibold', color)}>{value}</p>
      </div>
    </div>
  )
}
