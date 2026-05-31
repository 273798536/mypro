import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { CheckSquare, Clock, AlertTriangle, FileText, User } from 'lucide-react'

export default function Approvals() {
  const { approvals, fetchApprovals, expenditures, fetchExpenditures, updateApproval, loading } = useAppStore()

  useEffect(() => {
    fetchApprovals()
    fetchExpenditures()
  }, [fetchApprovals, fetchExpenditures])

  const getExpenditureTitle = (id: string) => {
    return expenditures.find(e => e.id === id)?.title || '未知'
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { color: string; text: string; icon: any }> = {
      pending: { color: 'bg-slate-100 text-slate-700', text: '待审批', icon: Clock },
      approved: { color: 'bg-green-100 text-green-700', text: '已通过', icon: CheckSquare },
      rejected: { color: 'bg-red-100 text-red-700', text: '已驳回', icon: AlertTriangle },
      page_missing: { color: 'bg-orange-100 text-orange-700', text: '缺页待补', icon: FileText }
    }
    return map[status] || map.pending
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">审批追踪</h1>
        <p className="text-slate-500 mt-1">追踪审批流程，查看缺页情况</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {Object.entries({
          pending: '待审批',
          approved: '已通过',
          page_missing: '缺页待补',
          rejected: '已驳回'
        }).map(([status, label]) => {
          const count = approvals.filter(a => a.status === status).length
          const badge = getStatusBadge(status)
          return (
            <div key={status} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${badge.color.replace('text-', 'bg-').replace('700', '100')}`}>
                  <badge.icon size={20} className={badge.color.split(' ')[1]} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="text-2xl font-bold text-slate-900">{count}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">审批列表</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {approvals.map((approval) => {
            const badge = getStatusBadge(approval.status)
            return (
              <div key={approval.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
                        {badge.text}
                      </span>
                      <span className="text-sm text-slate-500">第{approval.step_order}级审批</span>
                    </div>
                    <h3 className="font-medium text-slate-900 mb-1">{getExpenditureTitle(approval.expenditure_id)}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <User size={14} />
                        {approval.approver} ({approval.approver_role})
                      </div>
                      {approval.page_number && (
                        <div className="flex items-center gap-1">
                          <FileText size={14} />
                          页码：{approval.page_number}
                        </div>
                      )}
                    </div>
                    {approval.comments && (
                      <p className="mt-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                        审批意见：{approval.comments}
                      </p>
                    )}
                  </div>
                  {approval.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateApproval(approval.id, { status: 'approved', comments: '审批通过' })}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        通过
                      </button>
                      <button
                        onClick={() => updateApproval(approval.id, { status: 'page_missing', comments: '审批附件缺页' })}
                        className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                      >
                        标记缺页
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {approvals.length === 0 && (
            <div className="p-12 text-center text-slate-400">暂无审批记录</div>
          )}
        </div>
      </div>
    </div>
  )
}
