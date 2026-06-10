import { useMemo, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, FlaskConical, AlertCircle } from 'lucide-react'
import BeforeAfterCompare from '@/components/anomaly/BeforeAfterCompare'
import ChartAnnotation from '@/components/anomaly/ChartAnnotation'
import ModificationForm from '@/components/anomaly/ModificationForm'
import ClusterChart from '@/components/review/ClusterChart'
import { useBatchStore } from '@/store/useBatchStore'
import { useReviewStore } from '@/store/useReviewStore'
import { useAuditStore } from '@/store/useAuditStore'
import type { CurrentUser } from '@/types'

const CURRENT_USER: CurrentUser = { id: 'U002', name: '李晓峰', role: 'supervisor' }

export default function AnomalyReviewPage() {
  const { batchId } = useParams<{ batchId: string }>()
  const batch = batchId ? useBatchStore(s => s.getBatchById(batchId)) : undefined
  const anomalyReviews = useReviewStore(s => s.anomalyReviews)
  const approveAnomalyReview = useReviewStore(s => s.approveAnomalyReview)
  const rejectAnomalyReview = useReviewStore(s => s.rejectAnomalyReview)
  const addAuditLog = useAuditStore(s => s.addAuditLog)

  const anomalyReview = useMemo(
    () => anomalyReviews.find(r => r.batchId === batchId),
    [anomalyReviews, batchId]
  )

  const oldSamples = anomalyReview?.oldSamples ?? []
  const newSamples = anomalyReview?.newSamples ?? []
  const changedSampleIds = anomalyReview?.changedSamples ?? []

  const chartBounds = useMemo(() => {
    const all = [...oldSamples, ...newSamples]
    if (!all.length) return { xMin: 0, xMax: 10, yMin: 0, yMax: 10 }
    const xs = all.map(s => s.umapX)
    const ys = all.map(s => s.umapY)
    return {
      xMin: Math.min(...xs) - 1,
      xMax: Math.max(...xs) + 1,
      yMin: Math.min(...ys) - 1,
      yMax: Math.max(...ys) + 1,
    }
  }, [oldSamples, newSamples])

  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(600)
  const chartHeight = 400

  const handleApprove = useCallback((id: string, opinion?: string) => {
    approveAnomalyReview(id, CURRENT_USER.name)
    addAuditLog({
      entityType: 'anomaly',
      entityId: id,
      action: '审批通过',
      operator: CURRENT_USER.name,
      detail: `异常复核已通过审批${opinion ? '，意见：' + opinion : ''}`,
      beforeData: { approvalStatus: 'pending' },
      afterData: { approvalStatus: 'approved', approver: CURRENT_USER.name },
    })
  }, [approveAnomalyReview, addAuditLog])

  const handleReject = useCallback((id: string, opinion?: string) => {
    rejectAnomalyReview(id, CURRENT_USER.name)
    addAuditLog({
      entityType: 'anomaly',
      entityId: id,
      action: '审批驳回',
      operator: CURRENT_USER.name,
      detail: `异常复核已被驳回${opinion ? '，意见：' + opinion : ''}`,
      beforeData: { approvalStatus: 'pending' },
      afterData: { approvalStatus: 'rejected', approver: CURRENT_USER.name },
    })
  }, [rejectAnomalyReview, addAuditLog])

  const measureChart = useCallback((el: HTMLDivElement | null) => {
    if (el && el.clientWidth !== chartWidth) {
      setChartWidth(el.clientWidth)
    }
  }, [chartWidth])

  if (!anomalyReview) {
    return (
      <div className="p-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-800 mb-6">
          <ArrowLeft className="w-4 h-4" />
          返回批次列表
        </Link>
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <AlertCircle className="w-12 h-12 mb-3" />
          <p className="text-lg font-medium text-slate-500">暂无异常复核记录</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/review/${batchId}`} className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-800">
            <ArrowLeft className="w-4 h-4" />
            返回复核详情
          </Link>
        </div>
        {batch && (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <FlaskConical className="w-4 h-4" />
            <span>{batch.name}</span>
            <span className="text-slate-300">|</span>
            <span>{batch.platform}</span>
            <span className="text-slate-300">|</span>
            <span>{batch.sampleCount} 个样本</span>
          </div>
        )}
      </div>

      <BeforeAfterCompare
        oldConclusion={anomalyReview.oldConclusion}
        newConclusion={anomalyReview.newConclusion}
        oldSamples={oldSamples}
        newSamples={newSamples}
        changedSampleIds={changedSampleIds}
      />

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-800">聚类图标注对比</h3>
            </div>
            <div className="p-4">
              <div className="relative" ref={measureChart}>
                <ClusterChart
                  samples={newSamples}
                  height={chartHeight}
                  highlightIds={changedSampleIds}
                />
                <ChartAnnotation
                  oldSamples={oldSamples}
                  newSamples={newSamples}
                  chartBounds={chartBounds}
                  chartWidth={chartWidth}
                  chartHeight={chartHeight}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <ModificationForm
            anomalyReview={anomalyReview}
            currentUser={CURRENT_USER}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>
      </div>
    </div>
  )
}
