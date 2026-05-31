import { useState, useEffect, useCallback } from 'react'
import { getReviewList, submitReview } from '@/api'
import StatusBadge from '@/components/StatusBadge'
import IssueBadge from '@/components/IssueBadge'
import type { VerificationRecord } from '@/types'
import { cn } from '@/lib/utils'
import { ClipboardCheck, Search, CheckCircle2, XCircle, FileText, ArrowRight } from 'lucide-react'

export default function ReviewPage() {
  const [records, setRecords] = useState<VerificationRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reviewOpinion, setReviewOpinion] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getReviewList({ page, pageSize: 20, keyword: keyword || undefined })
      setRecords(data.data)
      setTotal(data.total)
      if (data.data.length > 0 && !selectedId) {
        setSelectedId(data.data[0].id)
      }
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [page, keyword, selectedId])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const selected = records.find((r) => r.id === selectedId)

  async function handleSubmit(conclusion: 'passed' | 'rejected') {
    if (!selectedId) return
    setSubmitting(true)
    try {
      await submitReview(selectedId, { conclusion, opinion: reviewOpinion })
      setReviewOpinion('')
      setSelectedId(null)
      await fetchRecords()
    } catch { /* ignore */ } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-serif font-semibold text-primary">人工复核</h2>
        <p className="text-sm text-gray-500 mt-1">逐条复核可疑数据，标记复核结论</p>
      </div>

      <div className="flex gap-6 h-[calc(100vh-160px)]">
        <div className="w-80 shrink-0 card flex flex-col overflow-hidden">
          <div className="p-3 border-b border-surface-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={keyword}
                onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
                placeholder="搜索农户姓名或地块编号"
                className="input-field pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-3 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-lg space-y-2">
                    <div className="skeleton h-4 w-20" />
                    <div className="skeleton h-3 w-28" />
                    <div className="skeleton h-3 w-16" />
                  </div>
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="p-6 text-center">
                <ClipboardCheck className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">暂无待复核记录</p>
              </div>
            ) : (
              records.map((record) => (
                <button
                  key={record.id}
                  onClick={() => { setSelectedId(record.id); setReviewOpinion('') }}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-surface-border transition-colors duration-150',
                    record.id === selectedId ? 'bg-primary-50 border-l-2 border-l-primary' : 'hover:bg-surface-hover'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800">{record.farmerName}</span>
                    <StatusBadge status={record.status} />
                  </div>
                  <p className="text-xs text-gray-500">地块编号: {record.plotNo}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {record.issues?.map((iss) => (
                      <IssueBadge key={iss.id} type={iss.type} />
                    ))}
                  </div>
                </button>
              ))
            )}
          </div>

          {total > 20 && (
            <div className="flex items-center justify-center gap-1 p-3 border-t border-surface-border text-xs text-gray-500">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30"
              >
                上一页
              </button>
              <span>{page} / {Math.ceil(total / 20)}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30"
              >
                下一页
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 card overflow-auto">
          {selected ? (
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-serif font-semibold text-primary">复核详情</h3>
                <StatusBadge status={selected.status} className="ml-2" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-600 border-b border-surface-border pb-2">原始材料</h4>
                  <div className="space-y-3">
                    <DetailRow label="农户姓名" value={selected.farmerName} />
                    <DetailRow label="地块编号" value={selected.plotNo} />
                    <DetailRow label="作物类型" value={selected.cropType} />
                    <DetailRow label="申报面积" value={`${selected.declaredArea.toFixed(2)} 亩`} mono />
                    <DetailRow label="轨迹面积" value={`${selected.trackArea.toFixed(2)} 亩`} mono />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-600 border-b border-surface-border pb-2">核验结果</h4>
                  <div className="space-y-3">
                    <DetailRow label="核验面积" value={`${selected.verifiedArea.toFixed(2)} 亩`} mono highlight />
                    <DetailRow
                      label="面积偏差"
                      value={`${((selected.verifiedArea - selected.declaredArea) / selected.declaredArea * 100).toFixed(1)}%`}
                      mono
                    />
                    <div className="flex items-start gap-2">
                      <span className="text-sm text-gray-500 w-20 shrink-0">问题标记</span>
                      <div className="flex flex-wrap gap-1">
                        {selected.issues?.length > 0 ? selected.issues.map((iss) => (
                          <IssueBadge key={iss.id} type={iss.type} />
                        )) : <span className="text-sm text-gray-400">无</span>}
                      </div>
                    </div>
                    {selected.issues?.map((iss) => (
                      <div key={iss.id} className="ml-20 text-xs text-gray-500">
                        <span className="font-medium">{iss.type === 'breakpoint' ? '轨迹断点' : iss.type === 'duplicate' ? '面积重复' : iss.type === 'missing_signature' ? '签字缺失' : '面积不一致'}</span>
                        {iss.description && `: ${iss.description}`}
                        <span className="ml-2 text-gray-400">({iss.severity === 'high' ? '高' : iss.severity === 'medium' ? '中' : '低'})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-surface-border pt-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-600">复核意见</h4>
                <textarea
                  value={reviewOpinion}
                  onChange={(e) => setReviewOpinion(e.target.value)}
                  placeholder="请填写复核意见..."
                  rows={3}
                  className="input-field resize-none"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSubmit('passed')}
                    disabled={submitting}
                    className="btn-success inline-flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {submitting ? '提交中...' : '通过'}
                  </button>
                  <button
                    onClick={() => handleSubmit('rejected')}
                    disabled={submitting}
                    className="btn-danger inline-flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    {submitting ? '提交中...' : '驳回'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ArrowRight className="w-10 h-10 mb-3 text-gray-200" />
              <p className="text-sm">请从左侧选择一条待复核记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 w-20 shrink-0">{label}</span>
      <span className={cn('text-sm', mono && 'font-mono', highlight && 'font-semibold text-primary')}>
        {value}
      </span>
    </div>
  )
}
