import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { ConclusionType } from '@/shared/types'
import { usePlaybackStore } from '@/store/playbackStore'
import { cn } from '@/lib/utils'

interface RejudgeModalProps {
  isOpen: boolean
  onClose: () => void
  playbackId: string
  operatorName: string
}

const conclusionOptions: { value: ConclusionType; label: string }[] = [
  { value: 'normal', label: '正常' },
  { value: 'abnormal', label: '异常' },
  { value: 'pending_review', label: '待复核' },
]

export default function RejudgeModal({ isOpen, onClose, playbackId, operatorName }: RejudgeModalProps) {
  const [conclusion, setConclusion] = useState<ConclusionType>('normal')
  const [reason, setReason] = useState('')
  const doRejudge = usePlaybackStore((state) => state.doRejudge)
  const loading = usePlaybackStore((state) => state.loading)

  useEffect(() => {
    if (isOpen) {
      setConclusion('normal')
      setReason('')
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!reason.trim()) return
    await doRejudge(playbackId, {
      conclusion,
      reason: reason.trim(),
      operatorName,
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 rounded-xl bg-white shadow-xl animate-fade-in-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slatefinance-100">
          <h3 className="text-lg font-semibold text-slatefinance-800">改判</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slatefinance-400 hover:text-slatefinance-600 hover:bg-slatefinance-50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slatefinance-700 mb-2">
              结论
            </label>
            <select
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value as ConclusionType)}
              className="w-full rounded-lg border border-slatefinance-200 bg-white px-4 py-2.5 text-sm text-slatefinance-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            >
              {conclusionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slatefinance-700 mb-2">
              改判理由 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请输入改判理由"
              className={cn(
                'w-full rounded-lg border bg-white px-4 py-3 text-sm text-slatefinance-800 placeholder-slatefinance-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent',
                reason.trim() ? 'border-slatefinance-200' : 'border-slatefinance-200'
              )}
              rows={4}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slatefinance-100 bg-slatefinance-50/50 rounded-b-xl">
          <button
            onClick={onClose}
            className="rounded-lg border border-slatefinance-200 bg-white px-5 py-2 text-sm font-medium text-slatefinance-700 hover:bg-slatefinance-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim() || loading}
            className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            确认改判
          </button>
        </div>
      </div>
    </div>
  )
}
