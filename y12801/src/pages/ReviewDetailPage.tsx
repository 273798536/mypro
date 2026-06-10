import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Flag, CheckCircle } from 'lucide-react'
import { useBatchStore } from '@/store/useBatchStore'
import { useReviewStore } from '@/store/useReviewStore'
import { useAuditStore } from '@/store/useAuditStore'
import { mockSamples } from '@/data/mockData'
import ClusterChart from '@/components/review/ClusterChart'
import SampleTable from '@/components/review/SampleTable'
import ConclusionPanel from '@/components/review/ConclusionPanel'
import AnomalyMarker from '@/components/review/AnomalyMarker'
import type { AnomalySubmission, Sample } from '@/types'

const currentUser = { id: 'U-001', name: '张明远', role: 'breeder' as const }

export default function ReviewDetailPage() {
  const { batchId } = useParams<{ batchId: string }>()
  const getBatchById = useBatchStore(s => s.getBatchById)
  const updateBatchStatus = useBatchStore(s => s.updateBatchStatus)
  const reviewRecords = useReviewStore(s => s.reviewRecords)
  const addReviewRecord = useReviewStore(s => s.addReviewRecord)
  const highlightSample = useReviewStore(s => s.highlightSample)
  const highlightedSampleId = useReviewStore(s => s.highlightedSampleId)
  const addAuditLog = useAuditStore(s => s.addAuditLog)

  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null)
  const [anomalySample, setAnomalySample] = useState<Sample | null>(null)
  const [anomalyOpen, setAnomalyOpen] = useState(false)

  const batch = batchId ? getBatchById(batchId) : undefined
  const samples = mockSamples.filter(s => s.batchId === batchId)
  const reviewRecord = reviewRecords.find(r => r.batchId === batchId) || null

  const handleSampleClick = useCallback((sampleId: string) => {
    highlightSample(sampleId)
    const sample = samples.find(s => s.id === sampleId)
    if (sample) {
      setSelectedClusterId(sample.clusterId)
    }
  }, [samples, highlightSample])

  const handleClusterClick = useCallback((clusterId: string) => {
    setSelectedClusterId(prev => prev === clusterId ? null : clusterId)
  }, [])

  const handleMarkAnomaly = useCallback((sample: Sample) => {
    setAnomalySample(sample)
    setAnomalyOpen(true)
  }, [])

  const handleAnomalySubmit = useCallback((data: AnomalySubmission) => {
    if (!batchId || !anomalySample) return
    addAuditLog({
      entityType: 'anomaly',
      entityId: anomalySample.id,
      action: '标记异常',
      operator: currentUser.name,
      detail: `标记样本 ${anomalySample.sampleName} 为异常，原因：${data.reason}，类型：${data.modificationType}`,
      beforeData: { sampleId: anomalySample.id, isAnomaly: false },
      afterData: { sampleId: anomalySample.id, isAnomaly: true, reason: data.reason, modificationType: data.modificationType },
    })
  }, [batchId, anomalySample, addAuditLog])

  const handleApproveReview = useCallback(() => {
    if (!batchId) return
    const newRecord = {
      id: `REV-${Date.now()}`,
      batchId,
      reviewer: currentUser.name,
      reviewedAt: new Date().toISOString(),
      conclusion: '复核通过，全部样本聚类合理',
      conclusionType: 'pass' as const,
      samplesReviewed: samples.map(s => s.id),
    }
    addReviewRecord(newRecord)
    updateBatchStatus(batchId, 'passed')
    addAuditLog({
      entityType: 'review',
      entityId: newRecord.id,
      action: '复核通过',
      operator: currentUser.name,
      detail: `批次 ${batchId} 复核通过`,
      beforeData: { batchId, status: 'pending' },
      afterData: { batchId, status: 'passed' },
    })
  }, [batchId, samples, addReviewRecord, updateBatchStatus, addAuditLog])

  if (!batch) {
    return (
      <div className="p-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-800 mb-4">
          <ArrowLeft className="w-4 h-4" />
          返回批次列表
        </Link>
        <p className="text-slate-500">未找到该批次</p>
      </div>
    )
  }

  const anomalySamples = samples.filter(s => s.isAnomaly)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-800">
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </Link>
          <div className="h-4 w-px bg-slate-300" />
          <h1 className="text-xl font-semibold text-slate-800">{batch.name}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            batch.status === 'passed' ? 'bg-teal-50 text-teal-700' :
            batch.status === 'anomaly' ? 'bg-amber-50 text-amber-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            {batch.status === 'passed' ? '已通过' : batch.status === 'anomaly' ? '异常' : '待复核'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {batch.status === 'anomaly' && (
            <Link
              to={`/anomaly/${batchId}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              <Flag className="w-4 h-4" />
              查看异常复核
            </Link>
          )}
          {batch.status === 'pending' && !reviewRecord && (
            <button
              onClick={handleApproveReview}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <CheckCircle className="w-4 h-4" />
              发起复核
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">聚类可视化</h3>
            <ClusterChart
              samples={samples}
              height={380}
              highlightIds={highlightedSampleId ? [highlightedSampleId] : []}
              onPointClick={handleSampleClick}
            />
          </div>
        </div>

        <div className="col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">测序数据表</h3>
              {anomalySamples.length > 0 && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {anomalySamples.length} 个异常
                </span>
              )}
            </div>
            <SampleTable
              samples={samples}
              highlightedSampleId={highlightedSampleId}
              onRowClick={handleSampleClick}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                if (anomalySamples.length > 0) {
                  handleMarkAnomaly(anomalySamples[0])
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
            >
              <Flag className="w-3.5 h-3.5" />
              标记异常
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ConclusionPanel
          batch={batch}
          reviewRecord={reviewRecord}
          samples={samples}
          highlightedSampleId={highlightedSampleId}
          selectedClusterId={selectedClusterId}
        />
      </div>

      <AnomalyMarker
        sample={anomalySample}
        isOpen={anomalyOpen}
        onClose={() => setAnomalyOpen(false)}
        onSubmit={handleAnomalySubmit}
      />
    </div>
  )
}
