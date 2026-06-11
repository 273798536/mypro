import { forwardRef } from 'react'
import { useReviewStore } from '@/store/reviewStore'
import { AnomalyTag } from '@/components/common/AnomalyTag'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Eye } from 'lucide-react'
import type { InspectionPhoto } from '@/types'

const FloorPlanView = forwardRef<HTMLDivElement>(function FloorPlanView(_props, ref) {
  const filters = useReviewStore((s) => s.filters)
  const filteredPhotos = useReviewStore((s) => s.filteredPhotos())
  const photos = useReviewStore((s) => s.photos)
  const selectedPhotoId = useReviewStore((s) => s.selectedPhotoId)
  const selectPhoto = useReviewStore((s) => s.selectPhoto)
  const selectReview = useReviewStore((s) => s.selectReview)
  const getReviewByPhotoId = useReviewStore((s) => s.getReviewByPhotoId)

  const selectedPhoto = photos.find((p) => p.id === selectedPhotoId)
  const displayFloor = selectedPhoto
    ? selectedPhoto.floorNormalized
    : filters.floor !== 'all'
      ? filters.floor
      : '全部楼层'

  const displayPhotos = selectedPhoto
    ? photos.filter((p) => p.floorNormalized === selectedPhoto.floorNormalized)
    : filters.floor !== 'all'
      ? filteredPhotos.filter((p) => p.floorNormalized === filters.floor)
      : filteredPhotos

  const handlePointClick = (photo: InspectionPhoto) => {
    selectPhoto(photo.id)
    const review = getReviewByPhotoId(photo.id)
    if (review) selectReview(review.id)
  }

  if (filters.viewMode === 'list') {
    return (
      <div ref={ref} className="flex-1 flex flex-col overflow-hidden">
        <div className="h-12 flex items-center px-4 border-b border-neutral-200 shrink-0">
          <span className="text-sm font-semibold text-neutral-800">{displayFloor} - 列表视图</span>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-3 py-2.5 font-medium text-neutral-600">照片</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-600">坐标</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-600">异常类型</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-600">状态</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredPhotos.map((photo) => {
                const review = getReviewByPhotoId(photo.id)
                const isSelected = selectedPhotoId === photo.id
                return (
                  <tr
                    key={photo.id}
                    onClick={() => handlePointClick(photo)}
                    className={`border-b border-neutral-100 cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/5' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://picsum.photos/seed/${photo.id}/120/90`}
                          alt={photo.name}
                          className="w-14 h-10 object-cover rounded"
                        />
                        <div>
                          <div className="font-medium text-neutral-800">{photo.name}</div>
                          <div className="text-xs text-neutral-400">{photo.takenAt}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-neutral-600">
                      ({photo.coordinateX}, {photo.coordinateY})
                      <span className="ml-1 text-xs text-neutral-400">[{photo.coordinateSystem}]</span>
                    </td>
                    <td className="px-3 py-2.5">{review && <AnomalyTag type={review.anomalyType} />}</td>
                    <td className="px-3 py-2.5">{review && <StatusBadge status={review.status} />}</td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePointClick(photo)
                        }}
                        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        查看
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} className="flex-1 flex flex-col overflow-hidden">
      <div className="h-12 flex items-center px-4 border-b border-neutral-200 shrink-0">
        <span className="text-sm font-semibold text-neutral-800">{displayFloor} - 平面视图</span>
      </div>

      <div className="flex-1 overflow-auto p-6 relative">
        <div className="absolute top-4 right-4 bg-white rounded-md border border-neutral-200 px-3 py-2 text-xs text-neutral-500 z-10 shadow-sm">
          <div>坐标系说明：</div>
          <div className="mt-1"><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5" />A系：基准坐标系</div>
          <div className="mt-0.5"><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5" />B系：辅助坐标系</div>
        </div>

        <div className="relative mx-auto" style={{ width: 700, height: 500 }}>
          <svg width="700" height="500" viewBox="0 0 700 500" className="bg-neutral-100 rounded-lg border border-neutral-200">
            <rect x="20" y="20" width="660" height="460" fill="#fff" stroke="#94a3b8" strokeWidth="1" rx="4" />

            <rect x="60" y="80" width="160" height="120" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" rx="2" />
            <text x="140" y="145" textAnchor="middle" fontSize="12" fill="#64748b">房间 101</text>

            <rect x="260" y="80" width="160" height="120" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" rx="2" />
            <text x="340" y="145" textAnchor="middle" fontSize="12" fill="#64748b">房间 102</text>

            <rect x="460" y="80" width="160" height="120" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" rx="2" />
            <text x="540" y="145" textAnchor="middle" fontSize="12" fill="#64748b">房间 103</text>

            <rect x="60" y="280" width="160" height="120" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" rx="2" />
            <text x="140" y="345" textAnchor="middle" fontSize="12" fill="#64748b">房间 104</text>

            <rect x="260" y="280" width="160" height="120" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" rx="2" />
            <text x="340" y="345" textAnchor="middle" fontSize="12" fill="#64748b">存储室</text>

            <rect x="460" y="280" width="160" height="120" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" rx="2" />
            <text x="540" y="345" textAnchor="middle" fontSize="12" fill="#64748b">设备间</text>

            <rect x="230" y="220" width="240" height="30" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
            <text x="350" y="240" textAnchor="middle" fontSize="11" fill="#64748b">走廊</text>

            {displayPhotos.map((photo, idx) => {
              const review = getReviewByPhotoId(photo.id)
              const isAnomaly = review && review.anomalyType !== 'none'
              const isSelected = selectedPhotoId === photo.id
              const cx = 40 + photo.coordinateX
              const cy = 40 + photo.coordinateY

              return (
                <g
                  key={photo.id}
                  transform={`translate(${cx}, ${cy})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handlePointClick(photo)}
                >
                  {isAnomaly && (
                    <circle
                      cx="0"
                      cy="0"
                      r="8"
                      fill="#D9414E"
                      opacity="0.3"
                      className="animate-pulse-ring"
                    />
                  )}

                  {isSelected && (
                    <circle
                      cx="0"
                      cy="0"
                      r="14"
                      fill="none"
                      stroke="#0D3B4C"
                      strokeWidth="2.5"
                    />
                  )}

                  <circle
                    cx="0"
                    cy="0"
                    r="8"
                    fill={isAnomaly ? '#D9414E' : '#3DA36F'}
                    stroke="#fff"
                    strokeWidth="2"
                  />

                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="600"
                    fill="#fff"
                  >
                    {idx + 1}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    </div>
  )
})

export default FloorPlanView
