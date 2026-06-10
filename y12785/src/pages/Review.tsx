import { useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, MessageSquare, ClipboardCheck, RefreshCw } from 'lucide-react'
import { useAppStore, BatchStatus } from '@/store'
import StatusBadge from '@/components/StatusBadge'
import { fetchApi, fromSnakeData } from '@/lib/utils'

interface ReviewRecord {
  id: string
  batchId: string
  batchNo: string
  reviewer: string
  decision: 'approved' | 'pending_review' | 'rejected'
  comment: string
  reviewedAt: string
}

const reviewableStatuses: BatchStatus[] = ['pending_review', 'approved', 'rejected', 'analyzing']

export default function Review() {
  const { batches, currentRole, addToast, updateBatch, setBatches } = useAppStore()
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [commentMap, setCommentMap] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchApi<{ items: any[] }>('/api/batches')
      .then((res) => {
        const items = fromSnakeData<any[]>(res.items || [])
        setBatches(items)
      })
      .catch(() => {})
  }, [setBatches])

  useEffect(() => {
    const all: ReviewRecord[] = []
    Promise.all(
      batches
        .filter((b) => reviewableStatuses.includes(b.status))
        .map((b) =>
          fetchApi<any[]>(`/api/batches/${b.id}/reviews`)
            .then((res) => {
              const records = fromSnakeData<any[]>(res)
              records.forEach((r) =>
                all.push({
                  ...r,
                  batchNo: b.batchNo,
                  batchId: b.id,
                })
              )
            })
            .catch(() => {})
        )
    ).then(() => setReviews(all))
  }, [batches])

  const reviewableBatches = batches.filter((b) =>
    reviewableStatuses.includes(b.status)
  )

  async function handleDecision(
    batchId: string,
    decision: 'approved' | 'pending_review' | 'rejected'
  ) {
    const comment = commentMap[batchId] || ''
    try {
      const res = await fetch(`/api/batches/${batchId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer: currentRole,
          decision,
          comment,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        addToast({
          type: 'error',
          message: err.message || '操作失败',
          actionableHint: err.actionableHint,
        })
        return
      }

      const statusMap = {
        approved: 'approved',
        pending_review: 'pending_review',
        rejected: 'rejected',
      } as const
      const targetStatus = statusMap[decision] as BatchStatus

      const statusRes = await fetch(`/api/batches/${batchId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus, operator: currentRole }),
      })
      if (statusRes.ok) {
        updateBatch(batchId, { status: targetStatus })
      }

      addToast({
        type: decision === 'approved' ? 'success' : decision === 'rejected' ? 'error' : 'warning',
        message:
          decision === 'approved'
            ? '已通过'
            : decision === 'rejected'
              ? '已驳回'
              : '已标记为待复核',
      })
      setCommentMap((prev) => {
        const next = { ...prev }
        delete next[batchId]
        return next
      })
      setExpandedId(null)
    } catch {
      addToast({ type: 'error', message: '网络错误' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-indigo-900">
          复核审批
        </h2>
        <p className="text-sm text-cool-gray mt-1">
          {currentRole === 'quality_supervisor'
            ? '审核归因结果，标记通过或待复核'
            : '查看复核状态'}
        </p>
      </div>

      {currentRole !== 'quality_supervisor' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center gap-2 text-sm text-amber-500">
          <AlertTriangle size={16} />
          当前为材料工程师角色，仅质检主管可执行审批操作
        </div>
      )}

      <section className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <ClipboardCheck size={16} className="text-indigo-900" />
          <h3 className="font-serif text-base font-semibold text-indigo-900">
            审核列表
          </h3>
        </div>

        {reviewableBatches.length === 0 ? (
          <div className="px-4 py-12 text-center text-cool-gray text-sm">
            暂无待审核批次
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2.5 font-medium text-cool-gray">
                    批次号
                  </th>
                  <th className="px-4 py-2.5 font-medium text-cool-gray">
                    状态
                  </th>
                  <th className="px-4 py-2.5 font-medium text-cool-gray">
                    快速标记
                  </th>
                  <th className="px-4 py-2.5 font-medium text-cool-gray">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reviewableBatches.map((batch) => {
                  const isExpanded = expandedId === batch.id
                  return (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-indigo-900 font-medium">
                        {batch.batchNo}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={batch.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        {batch.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
                            <CheckCircle2 size={14} />
                            可直接用
                          </span>
                        ) : batch.status === 'pending_review' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-medium">
                            <AlertTriangle size={14} />
                            需材料工程师复核
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-coral-500 font-medium">
                            <XCircle size={14} />
                            已驳回
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {currentRole === 'quality_supervisor' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleDecision(batch.id, 'approved')
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                            >
                              <CheckCircle2 size={12} />
                              通过
                            </button>
                            <button
                              onClick={() =>
                                handleDecision(batch.id, 'pending_review')
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors"
                            >
                              <AlertTriangle size={12} />
                              待复核
                            </button>
                            <button
                              onClick={() =>
                                handleDecision(batch.id, 'rejected')
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-coral-500/10 text-coral-500 hover:bg-coral-500/20 transition-colors"
                            >
                              <XCircle size={12} />
                              驳回
                            </button>
                            <button
                              onClick={() =>
                                setExpandedId(isExpanded ? null : batch.id)
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-cool-gray hover:bg-gray-100 transition-colors"
                            >
                              <MessageSquare size={12} />
                              意见
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {expandedId && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-indigo-900 mb-2">
            复核意见
          </h4>
          <textarea
            value={commentMap[expandedId] || ''}
            onChange={(e) =>
              setCommentMap((prev) => ({
                ...prev,
                [expandedId]: e.target.value,
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-900/20 focus:border-indigo-900 resize-y"
            rows={3}
            placeholder="请输入复核意见..."
          />
        </div>
      )}

      {reviews.length > 0 && (
        <section className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-serif text-base font-semibold text-indigo-900">
              复核记录
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {reviews.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-indigo-900">
                      {r.batchNo}
                    </span>
                    <StatusBadge
                      status={
                        r.decision === 'approved'
                          ? 'approved'
                          : r.decision === 'rejected'
                            ? 'rejected'
                            : 'pending_review'
                      }
                    />
                  </div>
                  <span className="text-xs text-cool-gray">
                    {new Date(r.reviewedAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-xs text-cool-gray mt-1 ml-0">
                    {r.reviewer === 'quality_supervisor'
                      ? '质检主管'
                      : '材料工程师'}
                    ：{r.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
