import { useState, useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import type { Sample, AnomalySubmission } from '@/types'
import { cn } from '@/lib/utils'

interface AnomalyMarkerProps {
  sample: Sample | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: AnomalySubmission) => void
}

export default function AnomalyMarker({ sample, isOpen, onClose, onSubmit }: AnomalyMarkerProps) {
  const [reason, setReason] = useState('')
  const [modificationType, setModificationType] = useState<AnomalySubmission['modificationType']>('数据修正')
  const [newConclusion, setNewConclusion] = useState('')

  useEffect(() => {
    if (isOpen) {
      setReason('')
      setModificationType('数据修正')
      setNewConclusion('')
    }
  }, [isOpen])

  if (!isOpen || !sample) return null

  const handleSubmit = () => {
    if (!reason.trim()) return
    onSubmit({ reason: reason.trim(), modificationType, newConclusion: newConclusion.trim() })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-800">标记异常样本</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-slate-50 p-3">
          <p className="text-sm text-slate-600"><span className="font-medium">样本编号:</span> {sample.id}</p>
          <p className="text-sm text-slate-600"><span className="font-medium">样本名称:</span> {sample.sampleName}</p>
          <p className="text-sm text-slate-600"><span className="font-medium">聚类:</span> {sample.clusterId}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              修改原因 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="请输入标记异常的原因..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">修改类型</label>
            <select
              value={modificationType}
              onChange={e => setModificationType(e.target.value as AnomalySubmission['modificationType'])}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="数据修正">数据修正</option>
              <option value="样本剔除">样本剔除</option>
              <option value="结论推翻">结论推翻</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">新结论</label>
            <textarea
              value={newConclusion}
              onChange={e => setNewConclusion(e.target.value)}
              rows={2}
              placeholder="请输入新的结论说明..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim()}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
              reason.trim() ? 'bg-teal-600 hover:bg-teal-700' : 'cursor-not-allowed bg-teal-300'
            )}
          >
            提交异常复核
          </button>
        </div>
      </div>
    </div>
  )
}
