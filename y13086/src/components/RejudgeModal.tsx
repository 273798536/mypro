import { useState } from 'react'
import { X, PenLine } from 'lucide-react'
import { rejudgeRecord } from '@/utils/api'

interface RejudgeModalProps {
  recordId: string
  currentJudgment: string
  onClose: () => void
  onSuccess: () => void
}

export default function RejudgeModal({ recordId, currentJudgment, onClose, onSuccess }: RejudgeModalProps) {
  const [newJudgment, setNewJudgment] = useState('')
  const [reason, setReason] = useState('')
  const [operatorName, setOperatorName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reason.trim() || !newJudgment.trim() || !operatorName.trim()) return
    setSubmitting(true)
    try {
      await rejudgeRecord(recordId, {
        judgment: newJudgment,
        reason,
        operatorName,
        operatorRole: 'teacher',
      })
      onSuccess()
      onClose()
    } catch {
      alert('重审提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-museum-surface border border-museum-border rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-museum-text flex items-center gap-2">
            <PenLine size={18} className="text-museum-amber" />
            重审判断
          </h2>
          <button onClick={onClose} className="text-museum-textDim hover:text-museum-text">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-museum-textMuted mb-1">当前判断</label>
            <div className="bg-museum-card border border-museum-border rounded-lg px-3 py-2 text-sm text-museum-textDim">
              {currentJudgment}
            </div>
          </div>

          <div>
            <label className="block text-xs text-museum-textMuted mb-1">新判断</label>
            <input
              value={newJudgment}
              onChange={(e) => setNewJudgment(e.target.value)}
              className="w-full bg-museum-card border border-museum-border rounded-lg px-3 py-2 text-sm text-museum-text focus:outline-none focus:border-museum-amber"
              placeholder="输入新的判断结果"
            />
          </div>

          <div>
            <label className="block text-xs text-museum-textMuted mb-1">
              重审原因 <span className="text-museum-red">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full bg-museum-card border border-museum-border rounded-lg px-3 py-2 text-sm text-museum-text focus:outline-none focus:border-museum-amber resize-none"
              placeholder="请输入重审原因"
            />
          </div>

          <div>
            <label className="block text-xs text-museum-textMuted mb-1">操作人</label>
            <input
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full bg-museum-card border border-museum-border rounded-lg px-3 py-2 text-sm text-museum-text focus:outline-none focus:border-museum-amber"
              placeholder="输入姓名"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !reason.trim() || !newJudgment.trim() || !operatorName.trim()}
            className="w-full py-2.5 rounded-lg bg-museum-amber text-museum-bg text-sm font-medium hover:bg-museum-amberDark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? '提交中...' : '提交重审'}
          </button>
        </div>
      </div>
    </div>
  )
}
