import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, FileText } from 'lucide-react'
import { useBatchStore } from '@/stores/batchStore'
import StepProgress from '@/components/StepProgress'
import StatusBadge from '@/components/StatusBadge'
import MaterialSection from '@/components/batch/MaterialSection'
import CalculationSection from '@/components/batch/CalculationSection'
import AnomalySection from '@/components/batch/AnomalySection'

const nextStatusMap: Record<string, string> = {
  pending_review: 'anomaly',
  anomaly: 'completed',
}

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentBatch, fetchBatchDetail, advanceStatus, fetchCalculation, calculation } = useBatchStore()
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (id) {
      fetchBatchDetail(id)
      fetchCalculation(id)
    }
  }, [id, fetchBatchDetail, fetchCalculation])

  if (!currentBatch) {
    return <div className="text-slate-500 text-center py-12">加载中...</div>
  }

  const nextStatus = nextStatusMap[currentBatch.status]

  const handleAdvance = async () => {
    if (!id || !nextStatus) return
    await advanceStatus(id, nextStatus)
    setConfirming(false)
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-slate-100">{currentBatch.modelNo}</h1>
              <StatusBadge status={currentBatch.status} />
            </div>
            <div className="text-sm text-slate-400 mt-1">
              批次号: <span className="font-mono">{currentBatch.batchNo}</span>
              <span className="mx-2">|</span>
              风洞: {currentBatch.windTunnelNo}
              <span className="mx-2">|</span>
              日期: {currentBatch.testDate}
            </div>
          </div>
          <button
            onClick={() => navigate(`/report/${id}`)}
            className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-amber-500 transition-colors border border-slate-600 px-3 py-1.5 rounded-md"
          >
            <FileText size={14} />
            查看报告
          </button>
        </div>
        <StepProgress status={currentBatch.status} className="justify-center" />
      </div>

      <MaterialSection />
      <CalculationSection />
      <AnomalySection />

      {nextStatus && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-5 py-2 rounded-md text-sm transition-colors"
            >
              推进状态
              <ArrowRight size={14} />
            </button>
          ) : (
            <>
              <span className="text-sm text-slate-400">确认推进到下一阶段？</span>
              <button
                onClick={() => setConfirming(false)}
                className="px-4 py-2 rounded-md text-sm text-slate-300 border border-slate-600 hover:bg-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAdvance}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-5 py-2 rounded-md text-sm transition-colors"
              >
                确认推进
                <ArrowRight size={14} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
