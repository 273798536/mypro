import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useReviewStore } from '@/store/reviewStore'
import { ANOMALY_CALIBER } from '@/data/caliber'
import type { AnomalyType, ReviewStatus } from '@/types'

const anomalyColorMap: Record<AnomalyType, string> = {
  name_mismatch: 'bg-danger/10 text-danger border-danger/20',
  floor_unit_mix: 'bg-warning/10 text-warning border-warning/20',
  coordinate_offset: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  none: 'bg-neutral-100 text-neutral-600 border-neutral-200',
}

const statusColorMap: Record<ReviewStatus, string> = {
  pending: 'bg-primary/10 text-primary border-primary/20',
  need_evidence: 'bg-warning/10 text-warning border-warning/20',
  reviewed: 'bg-success/10 text-success border-success/20',
}

const statusLabelMap: Record<ReviewStatus, string> = {
  pending: '待复核',
  need_evidence: '需补证据',
  reviewed: '已复核',
}

function TodoList() {
  const navigate = useNavigate()
  const reviews = useReviewStore((s) => s.reviews)
  const photos = useReviewStore((s) => s.photos)
  const setFilters = useReviewStore((s) => s.setFilters)
  const selectReview = useReviewStore((s) => s.selectReview)

  const todoReviews = reviews
    .filter(r => r.status === 'pending' || r.status === 'need_evidence')
    .sort((a, b) => {
      if (a.status === 'need_evidence' && b.status === 'pending') return -1
      if (a.status === 'pending' && b.status === 'need_evidence') return 1
      return 0
    })
    .slice(0, 6)

  const getPhotoById = (photoId: string) => photos.find(p => p.id === photoId)

  const handleClick = (reviewId: string) => {
    selectReview(reviewId)
    setFilters({ status: 'all', anomalyType: 'all', floor: 'all' })
    navigate('/workbench')
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6 flex flex-col">
      <h2 className="text-lg font-semibold text-neutral-800 mb-4">待办复核清单</h2>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="text-left py-3 px-2 text-sm font-medium text-neutral-500">异常标签</th>
              <th className="text-left py-3 px-2 text-sm font-medium text-neutral-500">楼层</th>
              <th className="text-left py-3 px-2 text-sm font-medium text-neutral-500">照片名称</th>
              <th className="text-left py-3 px-2 text-sm font-medium text-neutral-500">状态</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-neutral-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {todoReviews.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-neutral-400">
                  暂无待办事项
                </td>
              </tr>
            ) : (
              todoReviews.map(review => {
                const photo = getPhotoById(review.photoId)
                return (
                  <tr
                    key={review.id}
                    className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                  >
                    <td className="py-3 px-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${anomalyColorMap[review.anomalyType]}`}
                      >
                        {ANOMALY_CALIBER[review.anomalyType].label}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-neutral-700">
                      {photo?.floorNormalized || '-'}
                    </td>
                    <td className="py-3 px-2 text-sm text-neutral-700 truncate max-w-[150px]" title={photo?.name}>
                      {photo?.name || '-'}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${statusColorMap[review.status]}`}
                      >
                        {statusLabelMap[review.status]}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => handleClick(review.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/5 rounded-md transition-colors"
                      >
                        去处理
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TodoList
