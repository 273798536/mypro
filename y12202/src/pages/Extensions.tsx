import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Plus, Eye } from 'lucide-react'
import useStore from '@/store/app'
import { Card, Button, StatusBadge, Loading, Empty, Input, Tag, RiskBadge } from '@/components/ui'
import { formatDate } from '@/lib/utils'

export default function Extensions() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { extensions, contracts, loadingExtensions, fetchExtensions, fetchContracts, allRiskFlags, fetchAllRiskFlags } = useStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')

  useEffect(() => {
    fetchExtensions()
    fetchContracts()
    fetchAllRiskFlags()
  }, [])

  const getContract = (contractId: string) => contracts.find(c => c.id === contractId)
  const getExtensionRisks = (extensionId: string) => allRiskFlags.filter(r => r.extension_id === extensionId)

  const filteredExtensions = extensions.filter(e => {
    const contract = getContract(e.contract_id)
    const matchSearch = !searchTerm ||
      e.extension_reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract?.contract_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract?.borrower_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = statusFilter === 'all' || e.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Input
            placeholder="搜索合同编号、借款人、展期原因..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-80"
            icon={<Search size={16} className="text-slate-400" />}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="all">全部状态</option>
            <option value="draft">草稿</option>
            <option value="submitted">待审批</option>
            <option value="approved">已批准</option>
            <option value="rejected">已驳回</option>
          </select>
        </div>
        <Button onClick={() => navigate('/extensions/new')}>
          <Plus size={16} className="mr-2" />
          新建展期
        </Button>
      </div>

      <Card>
        {loadingExtensions ? (
          <div className="py-16"><Loading size="lg" /></div>
        ) : filteredExtensions.length === 0 ? (
          <Empty
            icon={<Search size={48} />}
            title="暂无展期申请"
            description="点击右上角按钮创建新的展期申请"
            action={
              <Button onClick={() => navigate('/extensions/new')}>
                <Plus size={16} className="mr-2" />
                新建展期
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-zebra">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">展期编号</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">合同信息</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">展期次数</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">原到期日</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">新到期日</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">风险标记</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">申请时间</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExtensions.map(ext => {
                  const contract = getContract(ext.contract_id)
                  const risks = getExtensionRisks(ext.id)
                  return (
                    <tr key={ext.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">
                        <span className="font-mono text-sm text-slate-800">EXT-{String(ext.extension_no).padStart(3, '0')}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{contract?.contract_no}</p>
                          <p className="text-xs text-slate-500">{contract?.borrower_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Tag>第{ext.extension_no}次</Tag>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600">{formatDate(ext.original_end_date)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600">{formatDate(ext.new_end_date)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {risks.length > 0 ? (
                            risks.slice(0, 2).map(r => (
                              <RiskBadge key={r.id} type={r.type} severity={r.severity} />
                            ))
                          ) : (
                            <Tag variant="success">无风险</Tag>
                          )}
                          {risks.length > 2 && (
                            <Tag>+{risks.length - 2}</Tag>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={ext.status} />
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-500">{formatDate(ext.created_at)}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/extensions/${ext.id}`)}>
                          <Eye size={16} className="mr-1" />
                          查看
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
