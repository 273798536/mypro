import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CameraOff, AlertTriangle, Activity, Tag, ShieldCheck, X, AlertCircle, Link2 } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import TypeBadge from '@/components/TypeBadge'
import { useStore } from '@/store/useStore'

type AnomalyType = 'missing_photo' | 'annotation_conflict' | 'viability_anomaly' | 'label_unclear'

const TABS: { key: AnomalyType | 'all'; label: string; icon: typeof CameraOff }[] = [
  { key: 'all', label: '全部', icon: AlertTriangle },
  { key: 'missing_photo', label: '缺少照片', icon: CameraOff },
  { key: 'annotation_conflict', label: '标注冲突', icon: AlertTriangle },
  { key: 'viability_anomaly', label: '存活率异常', icon: Activity },
  { key: 'label_unclear', label: '标注不清', icon: Tag },
]

const TYPE_ICON: Record<AnomalyType, typeof CameraOff> = {
  missing_photo: CameraOff, annotation_conflict: AlertTriangle,
  viability_anomaly: Activity, label_unclear: Tag,
}

const TYPE_LABEL: Record<AnomalyType, string> = {
  missing_photo: '缺少照片', annotation_conflict: '标注冲突',
  viability_anomaly: '存活率异常', label_unclear: '标注不清',
}

interface AnomalyReview {
  id: string; record_id: string; anomaly_type: AnomalyType
  description: string; actionable_hint: string
  review_status: 'pending' | 'approved' | 'rejected'
  reviewer: string | null; review_comment: string | null
  reviewed_at: string | null; source_material_ids: string[]
  created_at: string
  cell_line?: string; date?: string; type?: string
}

function Skeleton() {
  return <div className="animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700 h-32" />
}

export default function Anomaly() {
  const [tab, setTab] = useState<AnomalyType | 'all'>('all')
  const [anomalies, setAnomalies] = useState<AnomalyReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewModal, setReviewModal] = useState<AnomalyReview | null>(null)
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved')
  const [reviewComment, setReviewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const currentUser = useStore(s => s.currentUser)

  const fetchAnomalies = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams()
      if (tab !== 'all') params.set('anomaly_type', tab)
      const res = await fetch(`/api/anomalies?${params}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || '获取异常列表失败')
      setAnomalies(json.data)
    } catch (e: any) {
      setError(e.message || '网络请求失败')
    } finally { setLoading(false) }
  }, [tab])

  useEffect(() => { fetchAnomalies() }, [fetchAnomalies])

  const handleReview = async () => {
    if (!reviewModal) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/anomalies/${reviewModal.id}/review`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer: currentUser?.name || '技术员', review_comment: reviewComment, review_status: reviewStatus }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || '复核提交失败')
      setAnomalies(prev => prev.map(a => a.id === reviewModal.id ? { ...a, ...json.data } : a))
      setReviewModal(null); setReviewComment('')
    } catch (e: any) {
      alert(e.message)
    } finally { setSubmitting(false) }
  }

  const filtered = tab === 'all' ? anomalies : anomalies.filter(a => a.anomaly_type === tab)

  if (loading) return <div className="space-y-4 p-6">{[1, 2, 3].map(i => <Skeleton key={i} />)}</div>

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">异常复核</h1>
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-primary shadow dark:bg-gray-700 dark:text-primary-300' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>

      {error && <div className="flex items-center gap-2 text-red-600"><AlertCircle className="h-4 w-4" /><span className="text-sm">{error}</span></div>}

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <ShieldCheck className="mx-auto h-10 w-10 mb-2" />
          <p className="text-sm">暂无异常记录</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(a => {
            const Icon = TYPE_ICON[a.anomaly_type]
            return (
              <div key={a.id} className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{TYPE_LABEL[a.anomaly_type]}</span>
                  </div>
                  <StatusBadge status={a.review_status as 'usable' | 'review_needed' | 'reviewed_ok' | 'reviewed_failed'} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{a.description}</p>
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  💡 {a.actionable_hint}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                  {a.cell_line && <span>细胞系: {a.cell_line}</span>}
                  {a.date && <span>日期: {a.date}</span>}
                  {a.type && <TypeBadge type={a.type as 'freeze' | 'thaw'} />}
                </div>
                {a.source_material_ids.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link2 className="h-3 w-3 text-gray-400" />
                    {a.source_material_ids.map(sid => (
                      <button key={sid} onClick={() => navigate(`/records/${sid}`)}
                        className="text-xs text-primary hover:underline">记录 {sid.slice(0, 8)}...</button>
                    ))}
                  </div>
                )}
                {a.review_status === 'pending' && currentUser?.role !== 'viewer' && (
                  <button onClick={() => setReviewModal(a)}
                    className="w-full rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-800">
                    复核
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setReviewModal(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">异常复核</h3>
              <button onClick={() => setReviewModal(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">{reviewModal.description}</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">复核结果</label>
                <select value={reviewStatus} onChange={e => setReviewStatus(e.target.value as 'approved' | 'rejected')}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                  <option value="approved">通过</option>
                  <option value="rejected">驳回</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">复核意见</label>
                <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={3}
                  placeholder="请输入复核意见..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
              </div>
              <button onClick={handleReview} disabled={submitting || !reviewComment.trim()}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50">
                {submitting ? '提交中...' : '提交复核'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
