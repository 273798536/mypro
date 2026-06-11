import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { useReviewStore } from '@/store/reviewStore'
import type { ReviewStatus } from '@/types'

interface StatCardProps {
  title: string
  value: number
  color: 'success' | 'primary' | 'warning'
  icon: React.ReactNode
  filterStatus: ReviewStatus | 'all'
}

function StatCard({ title, value, color, icon, filterStatus }: StatCardProps) {
  const navigate = useNavigate()
  const setFilters = useReviewStore((s) => s.setFilters)
  const selectReview = useReviewStore((s) => s.selectReview)

  const colorClasses: Record<string, string> = {
    success: 'text-success border-success/20 hover:shadow-success/20',
    primary: 'text-primary border-primary/20 hover:shadow-primary/20',
    warning: 'text-warning border-warning/20 hover:shadow-warning/20',
  }

  const trend = value > 0 ? 'up' : value < 0 ? 'down' : 'flat'
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  const handleClick = () => {
    setFilters({ status: filterStatus })
    selectReview(null)
    navigate('/workbench')
  }

  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-xl border ${colorClasses[color]} p-6 cursor-pointer
        transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-neutral-500 text-sm mb-2">{title}</p>
          <p className={`text-4xl font-bold ${colorClasses[color].split(' ')[0]}`}>
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-lg bg-neutral-50 ${colorClasses[color].split(' ')[0]}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-center mt-4 text-neutral-400 text-xs">
        <TrendIcon className="w-4 h-4 mr-1" />
        <span>点击查看详情</span>
      </div>
    </div>
  )
}

function ProgressBoard() {
  const stats = useReviewStore((s) => s.stats())

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard
        title="已复核"
        value={stats.reviewed}
        color="success"
        icon={<CheckCircle2 className="w-6 h-6" />}
        filterStatus="reviewed"
      />
      <StatCard
        title="待复核"
        value={stats.pending}
        color="primary"
        icon={<Clock className="w-6 h-6" />}
        filterStatus="pending"
      />
      <StatCard
        title="需补证据"
        value={stats.needEvidence}
        color="warning"
        icon={<AlertTriangle className="w-6 h-6" />}
        filterStatus="need_evidence"
      />
    </div>
  )
}

export default ProgressBoard
