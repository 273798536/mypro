import { useState } from 'react'
import { useReviewStore } from '@/store/reviewStore'
import { AnomalyTag } from '@/components/common/AnomalyTag'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { InspectionPhoto } from '@/types'

function getItemBackground(_photo: InspectionPhoto, reviewAnomalyType: string) {
  if (reviewAnomalyType === 'name_mismatch') return 'bg-red-50'
  if (reviewAnomalyType === 'floor_unit_mix') return 'bg-orange-50'
  if (reviewAnomalyType === 'coordinate_offset') return 'bg-indigo-50'
  return 'bg-white'
}

function MaterialList() {
  const filteredPhotos = useReviewStore((s) => s.filteredPhotos())
  const photos = useReviewStore((s) => s.photos)
  const getReviewByPhotoId = useReviewStore((s) => s.getReviewByPhotoId)
  const selectedPhotoId = useReviewStore((s) => s.selectedPhotoId)
  const selectPhoto = useReviewStore((s) => s.selectPhoto)
  const selectReview = useReviewStore((s) => s.selectReview)

  const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>({
    '1层': true,
    '2层': true,
    '3层': true
  })

  const toggleFloor = (floor: string) => {
    setExpandedFloors((prev) => ({ ...prev, [floor]: !prev[floor] }))
  }

  const handleClick = (photo: InspectionPhoto) => {
    selectPhoto(photo.id)
    const review = getReviewByPhotoId(photo.id)
    if (review) selectReview(review.id)
  }

  const photosByFloor = filteredPhotos.reduce<Record<string, InspectionPhoto[]>>((acc, photo) => {
    const floor = photo.floorNormalized
    if (!acc[floor]) acc[floor] = []
    acc[floor].push(photo)
    return acc
  }, {})

  const floorOrder = ['1层', '2层', '3层']

  return (
    <div className="w-[280px] bg-white flex flex-col shrink-0 h-full overflow-hidden">
      <div className="h-12 flex items-center px-4 border-b border-neutral-200 shrink-0">
        <span className="text-sm font-semibold text-neutral-800">巡检照片</span>
        <span className="ml-2 text-xs text-neutral-400">{filteredPhotos.length}/{photos.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {floorOrder.map((floor) => {
          const floorPhotos = photosByFloor[floor] || []
          const isExpanded = expandedFloors[floor]

          return (
            <div key={floor} className="border-b border-neutral-100">
              <div
                onClick={() => toggleFloor(floor)}
                className="sticky top-0 z-10 h-10 flex items-center px-4 bg-neutral-50 border-b border-neutral-100 cursor-pointer hover:bg-neutral-100 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-neutral-500 mr-1.5" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-neutral-500 mr-1.5" />
                )}
                <span className="text-sm font-medium text-neutral-700">{floor}</span>
                <span className="ml-2 text-xs text-neutral-400">{floorPhotos.length}</span>
              </div>

              {isExpanded && (
                <div className="py-1">
                  {floorPhotos.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-neutral-400">暂无照片</div>
                  ) : (
                    floorPhotos.map((photo) => {
                      const review = getReviewByPhotoId(photo.id)
                      const isSelected = selectedPhotoId === photo.id
                      const bgClass = review ? getItemBackground(photo, review.anomalyType) : 'bg-white'

                      return (
                        <div
                          key={photo.id}
                          onClick={() => handleClick(photo)}
                          className={`mx-2 my-1 p-2 rounded-md cursor-pointer transition-all ${bgClass} ${
                            isSelected ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-neutral-300'
                          }`}
                        >
                          <div className="flex gap-2">
                            <img
                              src={`https://picsum.photos/seed/${photo.id}/120/90`}
                              alt={photo.name}
                              className="w-[60px] h-[45px] object-cover rounded flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-neutral-800 truncate">{photo.name}</div>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {review && <AnomalyTag type={review.anomalyType} />}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {review && <StatusBadge status={review.status} />}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MaterialList
