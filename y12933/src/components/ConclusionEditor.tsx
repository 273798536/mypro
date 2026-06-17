import { useEffect, useState } from 'react'
import { Save, Trash2, Loader2 } from 'lucide-react'
import type { Conclusion, ReviewRow } from '../../shared/types'
import { api } from '@/api/client'
import { useUiStore } from '@/store/useUi'
import { Modal } from './Modal'
import { PreferenceCompare } from './PreferenceCompare'
import { StatusBadge } from './StatusBadge'
import { cn } from '@/lib/utils'

const OPTIONS: Array<{ value: Conclusion; label: string; tone: string }> = [
  { value: '通过', label: '通过', tone: 'border-pass/40 hover:bg-pass/10 text-pass' },
  { value: '待确认', label: '待确认', tone: 'border-warn/40 hover:bg-warn/10 text-warn' },
  { value: '驳回', label: '驳回', tone: 'border-reject/40 hover:bg-reject/10 text-reject' },
]

const BIAS_TYPES = ['长度偏好', '风格偏好', '格式偏好', '位置偏好', '事实错误', '安全风险', '其他']

export function ConclusionEditor({
  row,
  open,
  onClose,
  onSaved,
}: {
  row: ReviewRow | null
  open: boolean
  onClose: () => void
  onSaved: (row: ReviewRow) => void
}) {
  const reviewer = useUiStore((s) => s.reviewer)
  const toast = useUiStore((s) => s.toast)
  const [conclusion, setConclusion] = useState<Conclusion>('通过')
  const [biasType, setBiasType] = useState('')
  const [severity, setSeverity] = useState('medium')
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (row) {
      setConclusion(row.conclusion ?? '通过')
      setBiasType(row.bias_type ?? '')
      setSeverity(row.severity ?? 'medium')
      setFeedback(row.feedback ?? '')
    }
  }, [row])

  if (!row) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await api.saveConclusion(row.record_id, {
        conclusion,
        bias_type: biasType || null,
        severity,
        reviewer,
        feedback: feedback || null,
      })
      toast(`已保存 ${row.record_id} 的结论：${conclusion}`, 'success')
      onSaved(updated)
      onClose()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setSaving(true)
    try {
      const updated = await api.deleteConclusion(row.record_id)
      toast(`已清除 ${row.record_id} 的结论`, 'info')
      onSaved(updated)
      onClose()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title={`复核 ${row.record_id}`}
      subtitle={`模型版本 ${row.model_version} · 当前结论 ${row.conclusion ? '' : '（待复核）'}`}
      footer={
        <>
          {row.conclusion && (
            <button
              className="btn-ghost ml-auto mr-auto text-reject hover:bg-reject/10"
              onClick={handleClear}
              disabled={saving}
            >
              <Trash2 className="h-4 w-4" />
              清除结论
            </button>
          )}
          <button className="btn-ghost" onClick={onClose} disabled={saving}>
            取消
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            保存结论
          </button>
        </>
      }
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs text-zinc-500">当前：</span>
        <StatusBadge conclusion={row.conclusion} />
      </div>

      <div className="mb-5">
        <PreferenceCompare row={row} />
      </div>

      <div className="space-y-4">
        <div>
          <label className="label">结论</label>
          <div className="grid grid-cols-3 gap-2">
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setConclusion(opt.value)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-medium transition',
                  conclusion === opt.value
                    ? cn(opt.tone, 'bg-white/5')
                    : 'border-white/10 text-zinc-400 hover:text-zinc-200',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">偏差类型</label>
            <select
              className="input"
              value={biasType}
              onChange={(e) => setBiasType(e.target.value)}
            >
              <option value="">（无）</option>
              {BIAS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">严重度</label>
            <select
              className="input"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">人工反馈（可选）</label>
          <textarea
            className="input min-h-[72px] resize-y"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="记录复核依据，便于后续回看"
          />
        </div>

        <div className="rounded-lg border border-white/5 bg-ink-900/50 px-3 py-2 text-xs text-zinc-500">
          复核人：<span className="font-mono text-zinc-300">{reviewer}</span>
          · 结论按 record_id 唯一保存，重存即更新，不会产生重复结论。
        </div>
      </div>
    </Modal>
  )
}
