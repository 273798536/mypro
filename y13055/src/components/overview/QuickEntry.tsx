import { useNavigate } from 'react-router-dom'
import { Package, AlertTriangle, FileOutput, ArrowRight } from 'lucide-react'
import { useReviewStore } from '@/store/reviewStore'
import type { AnomalyType } from '@/types'

interface QuickCardProps {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}

function QuickCard({ icon, title, description, onClick }: QuickCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-neutral-200 p-6 cursor-pointer
        transition-all duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/10"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/5 text-primary flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-neutral-800 mb-1">{title}</h3>
          <p className="text-sm text-neutral-500">{description}</p>
        </div>
        <div className="text-neutral-400 flex-shrink-0 pt-1">
          <ArrowRight className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

function QuickEntry() {
  const navigate = useNavigate()
  const setFilters = useReviewStore((s) => s.setFilters)
  const selectReview = useReviewStore((s) => s.selectReview)

  const handleMaterialCabinet = () => {
    setFilters({ status: 'all', anomalyType: 'all' as AnomalyType | 'all', floor: 'all' })
    selectReview(null)
    navigate('/workbench')
  }

  const handleAnomalyDesk = () => {
    setFilters({ anomalyType: 'all', status: 'all', floor: 'all' })
    selectReview(null)
    navigate('/workbench', { state: { showAnomalyOnly: true } })
  }

  const handleExportStation = () => {
    navigate('/report')
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <QuickCard
        icon={<Package className="w-12 h-12" />}
        title="材料柜"
        description="查看巡检照片与材料"
        onClick={handleMaterialCabinet}
      />
      <QuickCard
        icon={<AlertTriangle className="w-12 h-12" />}
        title="异常台"
        description="查看所有异常记录"
        onClick={handleAnomalyDesk}
      />
      <QuickCard
        icon={<FileOutput className="w-12 h-12" />}
        title="导出站"
        description="重新导出复核报告"
        onClick={handleExportStation}
      />
    </div>
  )
}

export default QuickEntry
