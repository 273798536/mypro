import { forwardRef, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, BarChart3, AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react'
import { useReviewStore } from '@/store/reviewStore'
import { ANOMALY_CALIBER } from '@/data/caliber'
import { AnomalyTag } from '@/components/common/AnomalyTag'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { AnomalyType, InspectionPhoto, ReviewRecord } from '@/types'

export const ReportPreview = forwardRef<HTMLDivElement>(function ReportPreview(_, ref) {
  const filters = useReviewStore((s) => s.filters)
  const filteredPhotos = useReviewStore((s) => s.filteredPhotos)
  const getReviewByPhotoId = useReviewStore((s) => s.getReviewByPhotoId)

  const [normalExpanded, setNormalExpanded] = useState(false)

  const generatedAt = useMemo(() => {
    const now = new Date()
    return now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  const filterSummary = useMemo(() => {
    const parts: string[] = []
    parts.push(filters.floor === 'all' ? '楼层：全部' : `楼层：${filters.floor}`)
    parts.push(filters.anomalyType === 'all' ? '异常类型：全部' : `异常类型：${ANOMALY_CALIBER[filters.anomalyType as AnomalyType].label}`)
    parts.push(filters.status === 'all' ? '处理状态：全部' : `处理状态：${
      filters.status === 'pending' ? '待复核' : filters.status === 'need_evidence' ? '需补证据' : '已复核'
    }`)
    return parts.join(' | ')
  }, [filters])

  const photoList = filteredPhotos()

  const stats = useMemo(() => {
    const anomalyCounts: Record<AnomalyType, number> = {
      name_mismatch: 0,
      floor_unit_mix: 0,
      coordinate_offset: 0,
      none: 0
    }
    let reviewed = 0
    let pending = 0
    let needEvidence = 0

    photoList.forEach((photo) => {
      const review = getReviewByPhotoId(photo.id)
      if (review) {
        anomalyCounts[review.anomalyType]++
        if (review.status === 'reviewed') reviewed++
        else if (review.status === 'pending') pending++
        else if (review.status === 'need_evidence') needEvidence++
      }
    })

    return {
      total: photoList.length,
      reviewed,
      pending,
      needEvidence,
      anomalyCounts
    }
  }, [photoList, getReviewByPhotoId])

  const abnormalRecords = useMemo(() => {
    return photoList
      .map((photo) => ({ photo, review: getReviewByPhotoId(photo.id) }))
      .filter((item): item is { photo: InspectionPhoto; review: ReviewRecord } =>
        !!item.review && item.review.anomalyType !== 'none'
      )
  }, [photoList, getReviewByPhotoId])

  const normalRecords = useMemo(() => {
    return photoList
      .map((photo) => ({ photo, review: getReviewByPhotoId(photo.id) }))
      .filter((item): item is { photo: InspectionPhoto; review: ReviewRecord } =>
        !!item.review && item.review.anomalyType === 'none'
      )
  }, [photoList, getReviewByPhotoId])

  return (
    <div className="mb-24">
      <div
        ref={ref}
        className="bg-white mx-auto py-12 px-12"
        style={{
          width: '794px',
          minHeight: '1123px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">医院物流机器人空间复核报告</h1>
          <div className="text-sm text-gray-500 space-y-1">
            <p>生成时间：{generatedAt}</p>
            <p>筛选条件：{filterSummary}</p>
          </div>
        </div>

        <hr className="border-gray-300 mb-8" />

        <section className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">复核概览</h2>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="bg-gray-50 rounded-md p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">总记录数</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-green-50 rounded-md p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">已复核</div>
              <div className="text-2xl font-bold text-green-600">{stats.reviewed}</div>
            </div>
            <div className="bg-blue-50 rounded-md p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">待复核</div>
              <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            </div>
            <div className="bg-orange-50 rounded-md p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">需补证据</div>
              <div className="text-2xl font-bold text-orange-600">{stats.needEvidence}</div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-md p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">各异常类型数量统计</div>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(ANOMALY_CALIBER) as AnomalyType[]).map((type) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-600">
                    {type === 'none' ? (
                      <CheckCircle className="w-4 h-4 text-slate-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    )}
                    {ANOMALY_CALIBER[type].label}
                  </span>
                  <span className="font-semibold text-gray-900">{stats.anomalyCounts[type]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">异常明细</h2>
          </div>

          {abnormalRecords.length === 0 ? (
            <div className="bg-gray-50 rounded-md p-8 text-center">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">当前筛选条件下无异常记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {abnormalRecords.map(({ photo, review }, index) => (
                <div key={photo.id} className="border border-gray-200 rounded-md p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{photo.floorNormalized}</span>
                      <span className="text-sm text-gray-700">{photo.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AnomalyTag type={review.anomalyType} />
                      <StatusBadge status={review.status} />
                    </div>
                  </div>
                  <div className="ml-8">
                    <div className="flex items-start gap-1.5 text-sm text-gray-600 mb-2">
                      <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span>{ANOMALY_CALIBER[review.anomalyType].reportText}</span>
                    </div>
                    {review.reviewNote && (
                      <div className="flex items-start gap-1.5 text-sm text-gray-500 bg-gray-50 rounded p-2">
                        <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-gray-600">复核备注：</span>
                          <span>{review.reviewNote}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {normalRecords.length > 0 && (
          <section className="mb-8">
            <button
              onClick={() => setNormalExpanded(!normalExpanded)}
              className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              {normalExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              正常记录（{normalRecords.length} 条）
            </button>

            {normalExpanded && (
              <div className="space-y-2">
                {normalRecords.map(({ photo, review }, index) => (
                  <div key={photo.id} className="border border-gray-100 rounded-md p-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                          {abnormalRecords.length + index + 1}
                        </span>
                        <span className="text-sm text-gray-700">{photo.floorNormalized}</span>
                        <span className="text-sm text-gray-600">{photo.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AnomalyTag type={review.anomalyType} />
                        <StatusBadge status={review.status} />
                      </div>
                    </div>
                    {review.reviewNote && (
                      <div className="ml-7 mt-2 text-xs text-gray-500">
                        复核备注：{review.reviewNote}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="pt-8 mt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-400">本报告由医院物流机器人空间复核系统自动生成</p>
        </div>
      </div>
    </div>
  )
})
