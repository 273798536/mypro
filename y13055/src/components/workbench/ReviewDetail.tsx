import { useState } from 'react'
import { useReviewStore } from '@/store/reviewStore'
import { AnomalyTag } from '@/components/common/AnomalyTag'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ANOMALY_CALIBER } from '@/data/caliber'
import { Upload, AlertCircle, MapPin, Calendar, Package, FileText, X, Image as ImageIcon } from 'lucide-react'
import type { ReviewStatus } from '@/types'

function ReviewDetail() {
  const selectedPhotoId = useReviewStore((s) => s.selectedPhotoId)
  const photos = useReviewStore((s) => s.photos)
  const materials = useReviewStore((s) => s.materials)
  const getReviewByPhotoId = useReviewStore((s) => s.getReviewByPhotoId)
  const updateReviewStatus = useReviewStore((s) => s.updateReviewStatus)
  const addEvidence = useReviewStore((s) => s.addEvidence)

  const [note, setNote] = useState('')

  const photo = photos.find((p) => p.id === selectedPhotoId)
  const review = selectedPhotoId ? getReviewByPhotoId(selectedPhotoId) : undefined
  const material = review ? materials.find((m) => m.id === review.materialId) : undefined

  if (!photo || !review) {
    return (
      <div className="w-[360px] bg-white flex flex-col shrink-0 h-full">
        <div className="h-12 flex items-center px-4 border-b border-neutral-200 shrink-0">
          <span className="text-sm font-semibold text-neutral-800">复核明细</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="w-12 h-12 text-neutral-300 mb-3" />
          <p className="text-sm text-neutral-500 leading-relaxed">
            请从左侧选择巡检照片
            <br />
            或点击平面图上的坐标点
          </p>
        </div>
      </div>
    )
  }

  const caliber = ANOMALY_CALIBER[review.anomalyType]
  const floorMismatch = photo.floorRaw !== photo.floorNormalized
  const materialMismatch = material && material.name !== photo.materialNameOnPhoto

  const handleStatusChange = (status: ReviewStatus) => {
    updateReviewStatus(review.id, status, note || review.reviewNote)
  }

  const handleUploadEvidence = () => {
    const mockEvidenceUrl = `https://picsum.photos/seed/ev-${Date.now()}/400/300`
    addEvidence(review.id, mockEvidenceUrl)
  }

  return (
    <div className="w-[360px] bg-white flex flex-col shrink-0 h-full overflow-hidden">
      <div className="h-12 flex items-center px-4 border-b border-neutral-200 shrink-0">
        <span className="text-sm font-semibold text-neutral-800">复核明细</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <img
            src={`https://picsum.photos/seed/${photo.id}/640/480`}
            alt={photo.name}
            className="w-full h-auto rounded-lg object-cover border border-neutral-200"
          />
        </div>

        <div className="px-4 pb-3 border-b border-neutral-100">
          <h3 className="text-base font-semibold text-neutral-800 mb-1">{photo.name}</h3>
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <Calendar className="w-3.5 h-3.5" />
            {photo.takenAt}
          </div>
        </div>

        <div className="p-4 space-y-3 border-b border-neutral-100">
          <div>
            <div className="text-xs text-neutral-500 mb-1.5">楼层</div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-neutral-400" />
              <span className="text-neutral-700">{photo.floorRaw}</span>
              {floorMismatch && (
                <>
                  <X className="w-3.5 h-3.5 text-orange-500" />
                  <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-xs font-medium">
                    规范：{photo.floorNormalized}
                  </span>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs text-neutral-500 mb-1.5">坐标</div>
            <div className="text-sm text-neutral-700">
              ({photo.coordinateX}, {photo.coordinateY})
              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 text-xs">
                坐标系 {photo.coordinateSystem}
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs text-neutral-500 mb-1.5">材料</div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-sm">
                <Package className="w-4 h-4 text-neutral-400" />
                <span className="text-neutral-500 text-xs">清单：</span>
                <span className={materialMismatch ? 'text-red-600 font-medium' : 'text-neutral-700'}>
                  {material?.name || '-'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm pl-5.5">
                <span className="text-neutral-500 text-xs">照片：</span>
                <span className={materialMismatch ? 'text-red-600 font-medium' : 'text-neutral-700'}>
                  {photo.materialNameOnPhoto}
                </span>
                {materialMismatch && (
                  <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs font-medium">不一致</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-neutral-100">
          <div className="text-xs text-neutral-500 mb-2">异常说明</div>
          <div className="mb-2">
            <AnomalyTag type={review.anomalyType} />
          </div>
          <div className="flex items-start gap-2 text-sm text-neutral-600 bg-neutral-50 rounded-md p-3 border border-neutral-100">
            <FileText className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
            <span>{caliber.description}</span>
          </div>
        </div>

        <div className="p-4 border-b border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-neutral-500">当前状态</span>
            <StatusBadge status={review.status} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleStatusChange('need_evidence')}
              className="h-9 px-2 rounded-md bg-warning text-white text-xs font-medium hover:bg-warning/90 transition-colors"
            >
              标记需补证据
            </button>
            <button
              onClick={() => handleStatusChange('reviewed')}
              className="h-9 px-2 rounded-md bg-success text-white text-xs font-medium hover:bg-success/90 transition-colors"
            >
              确认已复核
            </button>
            <button
              onClick={() => handleStatusChange('pending')}
              className="h-9 px-2 rounded-md bg-neutral-200 text-neutral-700 text-xs font-medium hover:bg-neutral-300 transition-colors"
            >
              退回待复核
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-neutral-100">
          <div className="text-xs text-neutral-500 mb-2">复核备注</div>
          <textarea
            value={note || review.reviewNote}
            onChange={(e) => setNote(e.target.value)}
            placeholder="请输入复核备注..."
            className="w-full h-24 p-3 rounded-md border border-neutral-200 text-sm text-neutral-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none placeholder:text-neutral-400"
          />
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-neutral-500">证据补充</span>
            <button
              onClick={handleUploadEvidence}
              className="inline-flex items-center gap-1 h-7 px-3 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              上传证据
            </button>
          </div>
          {review.evidenceUrl ? (
            <div className="relative group">
              <img
                src={review.evidenceUrl}
                alt="证据"
                className="w-full h-32 object-cover rounded-md border border-neutral-200"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-2">
                <button className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-neutral-700 hover:bg-white transition-colors">
                  <ImageIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-1.5 text-xs text-neutral-400">已上传证据照片</div>
            </div>
          ) : (
            <div className="h-32 rounded-md border border-dashed border-neutral-300 flex flex-col items-center justify-center text-neutral-400">
              <Upload className="w-8 h-8 mb-1.5" />
              <span className="text-xs">暂无证据，点击上方按钮上传</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReviewDetail
