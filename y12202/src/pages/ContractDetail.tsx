import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Clock, FileText, User, Shield, TrendingUp } from 'lucide-react'
import useStore from '@/store/app'
import { Card, Button, StatusBadge, Loading, Tag, Empty } from '@/components/ui'
import { formatMoney, formatDate } from '@/lib/utils'

type TabType = 'guarantee' | 'repayment' | 'extension'

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('guarantee')
  const { selectedContract, loadingContractDetail, fetchContractDetail, extensions, fetchExtensions } = useStore()

  useEffect(() => {
    if (id) {
      fetchContractDetail(id)
      fetchExtensions({ contract_id: id })
    }
  }, [id])

  if (loadingContractDetail || !selectedContract) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loading size="lg" />
      </div>
    )
  }

  const { contract, guarantees, repayment_records } = selectedContract
  const contractExtensions = extensions.filter(e => e.contract_id === contract.id)

  const tabs: { key: TabType; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'guarantee', label: '担保资料', icon: <Shield size={16} />, count: guarantees.length },
    { key: 'repayment', label: '还款流水', icon: <TrendingUp size={16} />, count: repayment_records.length },
    { key: 'extension', label: '展期历史', icon: <Clock size={16} />, count: contractExtensions.length },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/contracts')}>
          <ArrowLeft size={16} className="mr-1" />
          返回
        </Button>
        <h1 className="text-xl font-semibold text-slate-800 font-serif">
          {contract.contract_no} - 合同详情
        </h1>
        <StatusBadge status={contract.status} />
      </div>

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-800 font-serif mb-4">基本信息</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 uppercase">借款人</label>
                <div className="flex items-center gap-2 mt-1">
                  <User size={18} className="text-slate-400" />
                  <span className="text-slate-800">{contract.borrower_name}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase">证件号</label>
                <p className="text-slate-700 mt-1 font-mono text-sm">{contract.borrower_id}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase">借款金额</label>
                <p className="text-2xl font-bold text-slate-800 mt-1">¥{formatMoney(contract.amount)}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 uppercase">借款期限</label>
                <p className="text-slate-800 mt-1">{contract.term}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase">起始日期</label>
                <p className="text-slate-700 mt-1">{formatDate(contract.start_date)}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase">到期日期</label>
                <p className="text-slate-700 mt-1">{formatDate(contract.end_date)}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 uppercase">年利率</label>
                <p className="text-slate-800 mt-1">{contract.rate}%</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase">创建人</label>
                <p className="text-slate-700 mt-1">{contract.created_by}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase">创建时间</label>
                <p className="text-slate-700 mt-1">{formatDate(contract.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b border-slate-200">
          <div className="flex">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-slate-800 text-slate-800'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.icon}
                {tab.label}
                <Tag variant={activeTab === tab.key ? 'default' : 'default'}>{tab.count}</Tag>
              </button>
            ))}
          </div>
          {activeTab === 'extension' && (
            <div className="px-4">
              <Button onClick={() => navigate('/extensions/new', { state: { contractId: contract.id } })}>
                <Plus size={16} className="mr-2" />
                申请展期
              </Button>
            </div>
          )}
        </div>

        <div className="p-6">
          {activeTab === 'guarantee' && (
            <div>
              {guarantees.length === 0 ? (
                <Empty
                  icon={<Shield size={40} />}
                  title="暂无担保资料"
                  description="该合同尚未添加担保信息"
                />
              ) : (
                <div className="space-y-4">
                  {guarantees.map(g => (
                    <div key={g.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{g.guarantor_name}</span>
                          <Tag variant={g.is_expired ? 'danger' : 'success'}>
                            {g.is_expired ? '已过期' : '有效'}
                          </Tag>
                          <Tag>{g.guarantee_type}</Tag>
                        </div>
                        <span className="text-sm text-slate-500">来源: {g.source_person}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">担保人证件号：</span>
                          <span className="text-slate-700 font-mono">{g.guarantor_id}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">担保金额：</span>
                          <span className="text-slate-700">¥{formatMoney(g.guarantee_amount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">担保起始：</span>
                          <span className="text-slate-700">{formatDate(g.start_date)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">担保到期：</span>
                          <span className="text-slate-700">{formatDate(g.end_date)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'repayment' && (
            <div className="overflow-x-auto">
              <table className="w-full table-zebra">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">期数</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">应还日期</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">实还日期</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">应还金额</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">本金</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">利息</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">状态</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {repayment_records.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700">第{r.period}期</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(r.due_date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.actual_date ? formatDate(r.actual_date) : '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-right">¥{formatMoney(r.amount)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-right">¥{formatMoney(r.principal)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-right">¥{formatMoney(r.interest)}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3">
                        {r.is_extension_node ? <Tag variant="warning">展期节点</Tag> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'extension' && (
            <div>
              {contractExtensions.length === 0 ? (
                <Empty
                  icon={<Clock size={40} />}
                  title="暂无展期记录"
                  description="点击右上角按钮申请展期"
                  action={
                    <Button onClick={() => navigate('/extensions/new', { state: { contractId: contract.id } })}>
                      <Plus size={16} className="mr-2" />
                      申请展期
                    </Button>
                  }
                />
              ) : (
                <div className="relative">
                  <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200"></div>
                  <div className="space-y-6">
                    {contractExtensions.sort((a, b) => a.extension_no - b.extension_no).map((ext, index) => (
                      <div key={ext.id} className="relative pl-16">
                        <div className={`absolute left-4 w-5 h-5 rounded-full border-4 border-white
                          ${ext.status === 'approved' ? 'bg-emerald-500' : ext.status === 'rejected' ? 'bg-red-500' : ext.status === 'submitted' ? 'bg-amber-500' : 'bg-slate-400'}`}>
                        </div>
                        <Card hover className="cursor-pointer" onClick={() => navigate(`/extensions/${ext.id}`)}>
                          <div className="p-5">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-slate-800">第{ext.extension_no}次展期</span>
                                <StatusBadge status={ext.status} />
                              </div>
                              <span className="text-sm text-slate-500">{formatDate(ext.created_at)}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-slate-500">原到期日：</span>
                                <span className="text-slate-700">{formatDate(ext.original_end_date)}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">新到期日：</span>
                                <span className="text-slate-700">{formatDate(ext.new_end_date)}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">申请人：</span>
                                <span className="text-slate-700">{ext.created_by}</span>
                              </div>
                            </div>
                            <p className="mt-3 text-sm text-slate-600 line-clamp-2">
                              <span className="text-slate-500">展期原因：</span>
                              {ext.extension_reason}
                            </p>
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
