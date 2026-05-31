import { useEffect, useState } from 'react'
import { Clock, ArrowRight, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import useStore from '@/store/app'
import { Card, Loading, StatusBadge, Tag, Empty } from '@/components/ui'
import { formatDate } from '@/lib/utils'

export default function AuditTrail() {
  const { auditTrail, loadingAuditTrail, fetchAuditTrail, contracts, fetchContracts, extensions, fetchExtensions } = useStore()
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null)

  useEffect(() => {
    fetchAuditTrail()
    fetchContracts()
    fetchExtensions()
  }, [])

  const getContract = (contractId: string) => contracts.find(c => c.id === contractId)
  const getExtension = (extensionId: string) => extensions.find(e => e.id === extensionId)

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approve': return <CheckCircle size={18} className="text-emerald-500" />
      case 'reject': return <XCircle size={18} className="text-red-500" />
      default: return <AlertCircle size={18} className="text-slate-400" />
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-800 font-serif mb-6">审批留痕时间线</h2>

          {loadingAuditTrail ? (
            <div className="py-16"><Loading size="lg" /></div>
          ) : auditTrail.length === 0 ? (
            <Empty
              icon={<Clock size={48} />}
              title="暂无审批记录"
              description="所有审批操作都会在这里留痕"
            />
          ) : (
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200"></div>
              <div className="space-y-8">
                {auditTrail.map((entry, index) => {
                  const contract = getContract(entry.contract_id)
                  const extension = getExtension(entry.extension_id)
                  return (
                    <div key={index} className="relative pl-16">
                      <div className="absolute left-5 w-3 h-3 rounded-full bg-white border-4 border-slate-400 -translate-x-0.5"></div>
                      <div className="p-5 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                              <User size={20} className="text-slate-500" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-800">{entry.approval.approver_name}</span>
                                <Tag>{entry.approval.approver_role}</Tag>
                              </div>
                              <p className="text-xs text-slate-500">{formatDate(entry.approval.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getActionIcon(entry.approval.action)}
                            <StatusBadge status={entry.approval.action === 'approve' ? 'approved' : entry.approval.action} />
                          </div>
                        </div>

                        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-sm text-slate-600">{contract?.contract_no}</span>
                            <ArrowRight size={14} className="text-slate-400" />
                            <span className="text-sm text-slate-600">第{entry.extension_no}次展期</span>
                            <Tag variant="default">状态: {extension?.status}</Tag>
                          </div>
                          {extension && (
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span>原到期: {formatDate(extension.original_end_date)}</span>
                              <span>→</span>
                              <span>新到期: {formatDate(extension.new_end_date)}</span>
                            </div>
                          )}
                        </div>

                        {entry.approval.opinion && (
                          <div className="text-sm text-slate-600">
                            <span className="text-slate-500">审批意见：</span>
                            {entry.approval.opinion}
                          </div>
                        )}

                        {entry.influences.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-xs text-slate-500 mb-2">影响链路：受以下审批影响</p>
                            <div className="flex flex-wrap gap-2">
                              {entry.influences.map(inf => (
                                <Tag key={inf.id} variant="default">
                                  #{inf.influenced_by_approval_id.slice(0, 8)}
                                </Tag>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
