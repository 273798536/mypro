import { useStore } from '@/store'
import { Link, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { AlertTriangle, Droplets, FlaskConical, Ruler, ChevronRight } from 'lucide-react'
import type { RecordStatus, BlockPointType, AnomalyLevel, AttributionRecord } from '@/types'

const statusLabels: Record<RecordStatus, string> = {
  processed: '已处理',
  pending_material: '待补材料',
  manual_override: '人工改判',
}

const statusColors: Record<RecordStatus, string> = {
  processed: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  pending_material: 'bg-iron-500/10 text-iron-300 border-iron-500/20',
  manual_override: 'bg-danger-500/10 text-danger-500 border-danger-500/20',
}

const blockPointLabels: Record<BlockPointType, string> = {
  formula: '公式',
  unit: '单位',
  threshold: '阈值',
}

const blockPointIcons: Record<BlockPointType, typeof FlaskConical> = {
  formula: FlaskConical,
  unit: Ruler,
  threshold: AlertTriangle,
}

const blockPointColors: Record<BlockPointType, string> = {
  formula: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  unit: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  threshold: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

const anomalyLevelLabels: Record<AnomalyLevel, string> = {
  low: '低',
  medium: '中',
  high: '高',
}

const anomalyLevelDots: Record<AnomalyLevel, string> = {
  low: 'bg-success-500',
  medium: 'bg-amber-500',
  high: 'bg-danger-500',
}

export default function Records() {
  const records = useStore((s) => s.records)
  const filters = useStore((s) => s.filters)
  const setFilter = useStore((s) => s.setFilter)
  const resetFilters = useStore((s) => s.resetFilters)
  const [searchParams, setSearchParams] = useSearchParams()

  const urlStatus = searchParams.get('status') as RecordStatus | null
  useEffect(() => {
    if (urlStatus && filters.status !== urlStatus) {
      if (urlStatus === 'processed' || urlStatus === 'pending_material' || urlStatus === 'manual_override') {
        setFilter('status', urlStatus)
        setSearchParams({})
      }
    }
  }, [urlStatus, filters.status, setFilter, setSearchParams])

  const filtered = records.filter((r) => {
    if (filters.status !== 'all' && r.status !== filters.status) return false
    if (filters.blockPoint !== 'all' && r.blockPoint !== filters.blockPoint) return false
    if (filters.anomalyLevel !== 'all' && r.anomalyLevel !== filters.anomalyLevel) return false
    return true
  })

  const normalRecords = filtered.filter((r) => !r.isExtreme && !r.hasSamplingGap)
  const extremeRecords = filtered.filter((r) => r.isExtreme)
  const samplingGapRecords = filtered.filter((r) => r.hasSamplingGap)

  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-iron-50 mb-1">归因记录</h1>
        <p className="text-iron-400 text-sm">极端值独立展示 · 采样缺口单独标记 · 后补备注标注卡点</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-iron-400">状态</span>
          {(['all', 'processed', 'pending_material', 'manual_override'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilter('status', v)}
              className={`px-3 py-1 rounded-full text-xs border transition-all ${
                filters.status === v
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-iron-800 text-iron-400 border-iron-700 hover:border-iron-600'
              }`}
            >
              {v === 'all' ? '全部' : statusLabels[v]}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-iron-700" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-iron-400">卡点</span>
          {(['all', 'formula', 'unit', 'threshold'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilter('blockPoint', v)}
              className={`px-3 py-1 rounded-full text-xs border transition-all ${
                filters.blockPoint === v
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-iron-800 text-iron-400 border-iron-700 hover:border-iron-600'
              }`}
            >
              {v === 'all' ? '全部' : blockPointLabels[v]}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-iron-700" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-iron-400">异常</span>
          {(['all', 'low', 'medium', 'high'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilter('anomalyLevel', v)}
              className={`px-3 py-1 rounded-full text-xs border transition-all ${
                filters.anomalyLevel === v
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-iron-800 text-iron-400 border-iron-700 hover:border-iron-600'
              }`}
            >
              {v === 'all' ? '全部' : anomalyLevelLabels[v]}
            </button>
          ))}
        </div>

        <button
          onClick={resetFilters}
          className="ml-auto text-xs text-iron-500 hover:text-iron-300 transition-colors"
        >
          重置筛选
        </button>
      </div>

      <div className="space-y-6">
        {extremeRecords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-danger-500" />
              <span className="text-sm font-semibold text-danger-500">极端值</span>
              <span className="text-xs text-iron-500">（不参与均值计算，风险不可忽视）</span>
            </div>
            <div className="space-y-2">
              {extremeRecords.map((record) => (
                <RecordRow key={record.id} record={record} />
              ))}
            </div>
          </div>
        )}

        {samplingGapRecords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-500">采样缺口</span>
              <span className="text-xs text-iron-500">（单独标记，不混入正常结果）</span>
            </div>
            <div className="space-y-2">
              {samplingGapRecords.map((record) => (
                <SamplingGapRow key={record.id} record={record} />
              ))}
            </div>
          </div>
        )}

        {normalRecords.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-iron-300">正常记录</span>
            </div>
            <div className="space-y-2">
              {normalRecords.map((record) => (
                <RecordRow key={record.id} record={record} />
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-iron-500 text-sm">无匹配记录</div>
        )}
      </div>
    </div>
  )
}

function RecordRow({ record }: { record: AttributionRecord }) {
  return (
    <Link
      to={`/records/${record.id}`}
      className={`group block rounded-xl border p-4 transition-all duration-200 hover:shadow-lg ${
        record.isExtreme
          ? 'border-danger-500/30 bg-danger-500/5 hover:border-danger-500/50'
          : 'border-iron-700 bg-iron-900 hover:border-iron-600'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-xs text-iron-500 shrink-0">{record.id}</span>
          <span className="text-sm font-medium text-iron-100 truncate">{record.cycleName}</span>
          <span
            className={`shrink-0 px-2 py-0.5 rounded-full text-xs border ${statusColors[record.status]}`}
          >
            {statusLabels[record.status]}
          </span>
          {record.blockPoint && (
            <span
              className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
                blockPointColors[record.blockPoint]
              }`}
              title={record.blockNote}
            >
              {(() => {
                const Icon = blockPointIcons[record.blockPoint!]
                return <Icon className="w-3 h-3" />
              })()}
              {blockPointLabels[record.blockPoint]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${anomalyLevelDots[record.anomalyLevel]}`} />
            <span className="text-xs text-iron-400">{anomalyLevelLabels[record.anomalyLevel]}</span>
          </div>
          <div className="text-right">
            <span className="font-mono text-sm text-iron-200">{record.deviation.toFixed(2)}%</span>
          </div>
          <ChevronRight className="w-4 h-4 text-iron-600 group-hover:text-iron-400 transition-colors" />
        </div>
      </div>
      {record.blockNote && (
        <div className="mt-2 text-xs text-iron-500 pl-16 truncate" title={record.blockNote}>
          {record.blockNote}
        </div>
      )}
    </Link>
  )
}

function SamplingGapRow({ record }: { record: AttributionRecord }) {
  return (
    <Link
      to={`/records/${record.id}`}
      className="group block rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 transition-all duration-200 hover:border-amber-500/40 hover:shadow-lg"
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(245,158,11,0.03) 10px, rgba(245,158,11,0.03) 20px)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-xs text-iron-500 shrink-0">{record.id}</span>
          <span className="text-sm font-medium text-iron-100 truncate">{record.cycleName}</span>
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-amber-500/10 text-amber-500 border-amber-500/20">
            <Droplets className="w-3 h-3" />
            采样缺口
          </span>
          {record.blockPoint && (
            <span
              className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
                blockPointColors[record.blockPoint]
              }`}
              title={record.blockNote}
            >
              {(() => {
                const Icon = blockPointIcons[record.blockPoint!]
                return <Icon className="w-3 h-3" />
              })()}
              {blockPointLabels[record.blockPoint]}
            </span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-iron-600 group-hover:text-amber-400 transition-colors shrink-0" />
      </div>
      {record.blockNote && (
        <div className="mt-2 text-xs text-iron-500 pl-16 truncate" title={record.blockNote}>
          {record.blockNote}
        </div>
      )}
    </Link>
  )
}
