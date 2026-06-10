import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import type { Batch } from '@/types'
import { useBatchStore } from '@/store/useBatchStore'
import { mockSamples, mockDataConflicts } from '@/data/mockData'
import BatchList from '@/components/batch/BatchList'
import DataMergePanel from '@/components/batch/DataMergePanel'

export default function HomePage() {
  const navigate = useNavigate()
  const batches = useBatchStore(s => s.batches)
  const [mergeBatchId, setMergeBatchId] = useState<string | null>(null)

  const pendingCount = batches.filter(b => b.status === 'pending').length
  const passedCount = batches.filter(b => b.status === 'passed').length
  const anomalyCount = batches.filter(b => b.status === 'anomaly').length

  const handleBatchClick = (batch: Batch) => {
    if (batch.status === 'anomaly') {
      navigate(`/anomaly/${batch.id}`)
    } else {
      navigate(`/review/${batch.id}`)
    }
  }

  const handleMergeClick = (batch: Batch) => {
    setMergeBatchId(batch.id)
  }

  const handleMerge = () => {
    setMergeBatchId(null)
  }

  const mergeSamples = mergeBatchId ? mockSamples.filter(s => s.batchId === mergeBatchId) : []
  const mergeConflicts = mergeBatchId ? mockDataConflicts.filter(c => c.sampleId.includes(mergeBatchId.split('-')[1])) : []

  const stats = [
    { icon: ClipboardList, label: '待复核', count: pendingCount, color: 'text-slate-600', bg: 'bg-slate-100' },
    { icon: CheckCircle2, label: '已通过', count: passedCount, color: 'text-teal-600', bg: 'bg-teal-50' },
    { icon: AlertTriangle, label: '异常', count: anomalyCount, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">批次复核总览</h1>
        <p className="mt-1 text-sm text-slate-500">
          管理测序批次复核流程，查看合并状态与异常预警
        </p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {stats.map(({ icon: Icon, label, count, color, bg }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{count}</div>
                <div className="text-sm text-slate-500">{label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <BatchList
        batches={batches}
        onBatchClick={handleBatchClick}
        onMergeClick={handleMergeClick}
      />

      {mergeBatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setMergeBatchId(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
            <DataMergePanel
              samples={mergeSamples}
              conflicts={mergeConflicts}
              onMerge={handleMerge}
            />
          </div>
        </div>
      )}
    </div>
  )
}
