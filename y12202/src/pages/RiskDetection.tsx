import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, Shield, XCircle, ArrowRight, Calendar } from 'lucide-react'
import useStore from '@/store/app'
import { Card, Loading, Tag, Empty, Button, RiskBadge } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

type RiskType = 'all' | 'repeated_extension' | 'overdue_covering' | 'guarantee_expired'

export default function RiskDetection() {
  const navigate = useNavigate()
  const { allRiskFlags, loadingAllRiskFlags, fetchAllRiskFlags, extensions, fetchExtensions, contracts, fetchContracts, consistencyCheck, fetchConsistencyCheck, loadingConsistencyCheck } = useStore()
  const [activeTab, setActiveTab] = useState<RiskType>('all')

  useEffect(() => {
    fetchAllRiskFlags()
    fetchExtensions()
    fetchContracts()
    fetchConsistencyCheck()
  }, [])

  const getExtension = (extensionId: string) => extensions.find(e => e.id === extensionId)
  const getContract = (contractId: string) => contracts.find(c => c.id === contractId)

  const riskTabs: { key: RiskType; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'all', label: '全部风险', icon: <AlertTriangle size={18} />, count: allRiskFlags.length },
    { key: 'repeated_extension', label: '重复展期', icon: <Clock size={18} />, count: allRiskFlags.filter(r => r.type === 'repeated_extension').length },
    { key: 'overdue_covering', label: '逾期遮盖', icon: <XCircle size={18} />, count: allRiskFlags.filter(r => r.type === 'overdue_covering').length },
    { key: 'guarantee_expired', label: '担保过期', icon: <Shield size={18} />, count: allRiskFlags.filter(r => r.type === 'guarantee_expired').length },
  ]

  const filteredRisks = activeTab === 'all'
    ? allRiskFlags
    : allRiskFlags.filter(r => r.type === activeTab)

  const mismatches = consistencyCheck.filter(c => c.mismatch)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {riskTabs.map(tab => (
          <Card
            key={tab.key}
            hover
            className={`cursor-pointer ${activeTab === tab.key ? 'ring-2 ring-slate-800' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    tab.count > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {tab.icon}
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{tab.label}</p>
                    <p className="text-2xl font-bold text-slate-800">{tab.count}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {mismatches.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle size={24} className="text-red-500" />
                <div>
                  <h3 className="font-semibold text-red-800">口径不一致警告</h3>
                  <p className="text-sm text-red-600">发现 {mismatches.length} 条展期状态与审批留痕口径不一致</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/export')}>
                查看详情
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-800 font-serif mb-6">
            {riskTabs.find(t => t.key === activeTab)?.label}列表
          </h2>

          {loadingAllRiskFlags ? (
            <div className="py-16"><Loading size="lg" /></div>
          ) : filteredRisks.length === 0 ? (
            <Empty
              icon={<Shield size={48} />}
              title="暂无风险项"
              description="系统未检测到相关风险"
            />
          ) : (
            <div className="space-y-4">
              {filteredRisks.map(flag => {
                const ext = getExtension(flag.extension_id)
                const contract = ext ? getContract(ext.contract_id) : null
                return (
                  <div
                    key={flag.id}
                    className="p-5 border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => ext && navigate(`/extensions/${ext.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <RiskBadge type={flag.type} severity={flag.severity} />
                          {contract && <Tag variant="default">{contract.contract_no}</Tag>}
                          {contract && <span className="text-sm text-slate-600">{contract.borrower_name}</span>}
                        </div>
                        <p className="text-slate-700 mb-3">{flag.description}</p>
                        <div className="flex items-center gap-6 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            检测于 {formatDate(flag.detected_at)}
                          </span>
                          {ext && (
                            <span>
                              展期次数：第{ext.extension_no}次 · 状态：{ext.status}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight size={20} className="text-slate-400" />
                    </div>

                    {flag.type === 'repeated_extension' && ext && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-sm font-medium text-slate-600 mb-2">展期历史链路（失败路径高亮）</p>
                        <div className="flex items-center gap-2">
                          {Array.from({ length: ext.extension_no }, (_, i) => i + 1).map((no, index) => (
                            <div key={no} className="flex items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                                ${no >= 2 ? 'bg-red-100 text-red-600 border-2 border-red-300' : 'bg-emerald-100 text-emerald-600'}`}>
                                {no}
                              </div>
                              {index < ext.extension_no - 1 && (
                                <div className={`w-8 h-0.5 ${no >= 2 ? 'bg-red-300' : 'bg-slate-200'}`}></div>
                              )}
                            </div>
                          ))}
                          {ext.extension_no >= 2 && (
                            <Tag variant="danger" className="ml-2">重复展期风险</Tag>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
