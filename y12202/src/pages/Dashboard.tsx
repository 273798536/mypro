import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, AlertTriangle, CheckCircle, FileText, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import useStore from '@/store/app'
import { Card, StatusBadge, RiskBadge, Loading } from '@/components/ui'

export default function Dashboard() {
  const navigate = useNavigate()
  const {
    extensions,
    contracts,
    loadingExtensions,
    fetchExtensions,
    fetchContracts,
    auditTrail,
    loadingAuditTrail,
    fetchAuditTrail,
    allRiskFlags,
    loadingAllRiskFlags,
    fetchAllRiskFlags,
  } = useStore()

  useEffect(() => {
    fetchExtensions()
    fetchContracts()
    fetchAuditTrail()
    fetchAllRiskFlags()
  }, [])

  const pendingApprovals = extensions.filter(e => e.status === 'submitted').length
  const riskCount = allRiskFlags.length
  const approvedCount = extensions.filter(e => e.status === 'approved').length

  const stats = [
    { label: '待审批', value: pendingApprovals, icon: Clock, color: 'amber', link: '/extensions?status=submitted' },
    { label: '风险预警', value: riskCount, icon: AlertTriangle, color: 'red', link: '/risk-detection' },
    { label: '已批准', value: approvedCount, icon: CheckCircle, color: 'emerald', link: '/extensions?status=approved' },
  ]

  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    emerald: 'bg-emerald-500',
  }

  const getContract = (contractId: string) => contracts.find(c => c.id === contractId)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} hover className="cursor-pointer" onClick={() => navigate(stat.link)}>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
                  </div>
                  <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', colorClasses[stat.color])}>
                    <Icon size={24} className="text-white" />
                  </div>
                </div>
                <div className="flex items-center justify-end mt-4 text-sm text-slate-500">
                  查看详情
                  <ArrowRight size={16} className="ml-1" />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800 font-serif">风险预警</h2>
          </div>
          <div className="p-4 max-h-80 overflow-auto">
            {loadingAllRiskFlags ? (
              <Loading className="py-8" />
            ) : allRiskFlags.length === 0 ? (
              <div className="text-center py-8 text-slate-500">暂无风险预警</div>
            ) : (
              <div className="space-y-3">
                {allRiskFlags.slice(0, 6).map(flag => (
                  <div key={flag.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <RiskBadge type={flag.type} severity={flag.severity} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">{flag.description}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(flag.detected_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800 font-serif">近期展期动态</h2>
          </div>
          <div className="p-4 max-h-80 overflow-auto">
            {loadingAuditTrail || loadingExtensions ? (
              <Loading className="py-8" />
            ) : auditTrail.length === 0 ? (
              <div className="text-center py-8 text-slate-500">暂无动态</div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200"></div>
                <div className="space-y-4">
                  {auditTrail.slice(0, 6).map((entry, index) => {
                    const ext = extensions.find(e => e.id === entry.extension_id)
                    const contract = ext ? getContract(ext.contract_id) : null
                    return (
                      <div key={index} className="relative pl-10">
                        <div className="absolute left-3 w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-white -translate-x-0.5"></div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-800">
                              {entry.approval.approver_name}
                            </span>
                            <StatusBadge status={entry.approval.action === 'approve' ? 'approved' : entry.approval.action} />
                          </div>
                          <p className="text-sm text-slate-600">
                            {contract?.contract_no || '-'} - 第{entry.extension_no}次展期
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(entry.approval.created_at).toLocaleString('zh-CN')}
                          </p>
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
    </div>
  )
}
