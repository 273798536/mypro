import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, MapPin, AlertTriangle, CheckCircle, FileText, ArrowLeft } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  coordinate_flip: '坐标翻转',
  scale_mismatch: '比例尺偏差',
  missing_equipment: '设备缺失',
}

const SEVERITY_BADGE: Record<string, { label: string; className: string }> = {
  need_material: {
    label: '需补材料',
    className: 'bg-orange-100 text-orange-700',
  },
  need_caliber_change: {
    label: '需改口径',
    className: 'bg-red-100 text-red-700',
  },
}

function formatTime(seconds: number): string {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

export default function Settlement() {
  const navigate = useNavigate()
  const loadFromStorage = useGameStore((s) => s.loadFromStorage)
  const round = useGameStore((s) => s.round)
  const elapsedTime = useGameStore((s) => s.elapsedTime)
  const points = useGameStore((s) => s.points)
  const anomalies = useGameStore((s) => s.anomalies)

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  const flippedPointIds = new Set(
    anomalies.filter((a) => a.type === 'coordinate_flip').map((a) => a.pointId)
  )
  const flippedPointCount = flippedPointIds.size
  const passRate =
    points.length > 0
      ? ((points.length - flippedPointCount) / points.length) * 100
      : 100

  const passRateColor =
    passRate >= 80
      ? 'text-green-600'
      : passRate >= 60
        ? 'text-yellow-600'
        : 'text-red-600'

  const grouped = anomalies.reduce<Record<string, typeof anomalies>>(
    (acc, a) => {
      ;(acc[a.type] ??= []).push(a)
      return acc
    },
    {}
  )

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-center text-2xl font-bold text-gray-900">
          校对结算
          <span className="ml-2 text-base font-normal text-gray-500">
            第 {round} 轮
          </span>
        </h1>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="h-4 w-4" />
              <span className="text-sm">校对时长</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {formatTime(elapsedTime)}
            </p>
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">标注点数</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {points.length}
            </p>
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">异常数</span>
            </div>
            <p
              className={cn(
                'mt-2 text-2xl font-semibold',
                anomalies.length > 0 ? 'text-red-600' : 'text-gray-900'
              )}
            >
              {anomalies.length}
            </p>
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">通过率</span>
            </div>
            <p className={cn('mt-2 text-2xl font-semibold', passRateColor)}>
              {passRate.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="mt-8">
          {anomalies.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border bg-green-50 px-6 py-8 text-green-700">
              <CheckCircle className="mr-2 h-5 w-5" />
              <span className="text-lg font-medium">校对通过，无异常</span>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 font-medium text-gray-600">
                      异常类型
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      摘要
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      处理建议
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(grouped).flatMap(([type, items]) =>
                    items.map((a) => (
                      <tr key={a.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3 text-gray-700">
                          {TYPE_LABELS[type] ?? type}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {a.description}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                              SEVERITY_BADGE[a.severity]?.className
                            )}
                          >
                            {SEVERITY_BADGE[a.severity]?.label}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => navigate('/replay')}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            <FileText className="h-4 w-4" />
            导出复盘报告
          </button>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-300"
          >
            <ArrowLeft className="h-4 w-4" />
            返回校对台
          </button>
        </div>
      </div>
    </div>
  )
}
