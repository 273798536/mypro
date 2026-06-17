import { useState } from 'react'
import { ClipboardList, Layers, GitMerge, Check, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useFetch } from '@/hooks/useFetch'
import { Panel, SectionTitle, Skeleton, StatusBadge } from '@/components/ui'
import type { Review } from '../../shared/types'

export default function Reviews() {
  const { data: reviews, loading, error, reload } = useFetch<Review[]>(() => api.reviews())

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="REVIEWS · 复核轮次"
        title="同轮材料复核"
        desc="不沿用旧流程通用样例。评测题库、切分清单、脏样本重复放进同一轮复核，让模型评审会看出本轮处理的是眼前这批具体材料。"
      />

      <Panel className="border-saffron/30 bg-saffron/5">
        <div className="flex items-start gap-3">
          <GitMerge className="mt-0.5 h-4 w-4 shrink-0 text-saffron" />
          <p className="text-sm leading-relaxed text-ink-300">
            <span className="font-medium text-paper">结论归一原则：</span>
            同一件事不出现两份结论。补录后以最新结论为准；重复导入被归并至原片，仅保留单一结论。
          </p>
        </div>
      </Panel>

      {error && (
        <Panel className="border-brick/50">
          <div className="flex items-center gap-2 text-sm text-brick">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        </Panel>
      )}

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      )}

      {reviews && reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} onResolved={reload} />
          ))}
        </div>
      )}
    </div>
  )
}

function ReviewCard({ review, onResolved }: { review: Review; onResolved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(review.conclusion ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const isPending = !review.conclusion || review.conclusion.startsWith('待确认')

  const save = async () => {
    if (!draft.trim()) {
      setErr('结论不能为空')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      await api.resolveReview(review.id, draft.trim())
      setEditing(false)
      onResolved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const materials = review.materials.split('+').map((m) => m.trim())

  return (
    <Panel className="animate-risein">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-700 bg-ink-850">
            <ClipboardList className="h-4 w-4 text-saffron" />
          </div>
          <div>
            <div className="font-mono text-xs text-ink-400">{review.id}</div>
            <h3 className="font-display text-lg font-semibold text-paper">{review.round_name}</h3>
          </div>
        </div>
        <StatusBadge status={isPending ? 'pending' : 'pass'} />
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
          <Layers className="h-3.5 w-3.5 text-saffron" /> 本轮材料清单（具体批次）
        </div>
        <div className="flex flex-wrap gap-2">
          {materials.map((m, i) => (
            <span
              key={i}
              className="rounded-md border border-ink-700 bg-ink-900/80 px-2.5 py-1 font-mono text-xs text-ink-300"
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
          单一结论
        </div>
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-ink-700 bg-ink-950/80 p-3 text-sm text-paper outline-none focus:border-saffron/50"
              placeholder="写入归一结论…"
            />
            {err && <div className="text-xs text-brick">{err}</div>}
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-saffron px-3 py-1.5 text-sm font-medium text-ink-950 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> 归一保存
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setDraft(review.conclusion ?? '')
                  setErr(null)
                }}
                className="rounded-lg border border-ink-700 px-3 py-1.5 text-sm text-ink-300 hover:text-paper"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-relaxed text-ink-300">
              {review.conclusion ?? '尚无结论'}
            </p>
            <button
              onClick={() => setEditing(true)}
              className="shrink-0 rounded-md border border-ink-700 px-2.5 py-1 text-xs text-ink-300 hover:border-saffron/50 hover:text-saffron"
            >
              {isPending ? '补录结论' : '修改'}
            </button>
          </div>
        )}
      </div>
    </Panel>
  )
}
