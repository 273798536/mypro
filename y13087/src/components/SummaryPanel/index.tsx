import { CheckCircle, Clock, FileWarning } from 'lucide-react'
import type { LightPointStatus } from '@/types'
import { STATUS_LABELS, STATUS_COLORS } from '@/types'
import { useReviewStore } from '@/store/useReviewStore'
import { cn } from '@/lib/utils'

interface StatCardProps {
  status: LightPointStatus
  count: number
  isActive: boolean
  onClick: () => void
}

function StatCard({ status, count, isActive, onClick }: StatCardProps) {
  const iconMap = {
    normal: CheckCircle,
    pending_material: Clock,
    manual_review: FileWarning,
  }

  const Icon = iconMap[status]
  const color = STATUS_COLORS[status]
  const label = STATUS_LABELS[status]

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full p-4 rounded-xl border transition-all duration-300 text-left',
        'hover:scale-[1.02] active:scale-[0.98]',
        isActive
          ? 'border-white/30 bg-white/10 shadow-lg shadow-white/5'
          : 'border-white/10 bg-white/5 hover:bg-white/10'
      )}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{count}</div>
          <div className="text-sm text-slate-400">{label}</div>
        </div>
      </div>
    </button>
  )
}

export function SummaryPanel() {
  const getStatusCounts = useReviewStore((s) => s.getStatusCounts)
  const currentStage = useReviewStore((s) => s.currentStage)
  const filterStatus = useReviewStore((s) => s.filterStatus)
  const setFilterStatus = useReviewStore((s) => s.setFilterStatus)

  const counts = getStatusCounts(currentStage)

  const handleCardClick = (status: LightPointStatus) => {
    if (filterStatus === status) {
      setFilterStatus('all')
    } else {
      setFilterStatus(status)
    }
  }

  return (
    <div className="w-64 flex flex-col gap-3 p-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-1">
        页面摘要
      </h3>

      <StatCard
        status="normal"
        count={counts.normal}
        isActive={filterStatus === 'normal'}
        onClick={() => handleCardClick('normal')}
      />
      <StatCard
        status="pending_material"
        count={counts.pending_material}
        isActive={filterStatus === 'pending_material'}
        onClick={() => handleCardClick('pending_material')}
      />
      <StatCard
        status="manual_review"
        count={counts.manual_review}
        isActive={filterStatus === 'manual_review'}
        onClick={() => handleCardClick('manual_review')}
      />

      <div className="mt-2 pt-3 border-t border-white/10">
        <p className="text-xs text-slate-500 leading-relaxed">
          点击卡片可快速筛选对应状态的灯光点位
        </p>
      </div>
    </div>
  )
}
