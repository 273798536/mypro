import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Eye, FileText } from 'lucide-react'
import useStore from '@/store/app'
import { Card, Button, StatusBadge, Loading, Empty, Input, Tag } from '@/components/ui'
import { formatMoney } from '@/lib/utils'

export default function Contracts() {
  const navigate = useNavigate()
  const { contracts, loadingContracts, fetchContracts } = useStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchContracts()
  }, [])

  const filteredContracts = contracts.filter(c => {
    const matchSearch = c.contract_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.borrower_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Input
            placeholder="搜索合同编号、借款人..."
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
            <option value="active">正常</option>
            <option value="overdue">逾期</option>
            <option value="extended">已展期</option>
            <option value="completed">已结清</option>
          </select>
        </div>
        <Button onClick={() => navigate('/contracts/new')}>
          <Plus size={16} className="mr-2" />
          新建合同
        </Button>
      </div>

      <Card>
        {loadingContracts ? (
          <div className="py-16"><Loading size="lg" /></div>
        ) : filteredContracts.length === 0 ? (
          <Empty
            icon={<FileText size={48} />}
            title="暂无借款合同"
            description="点击右上角按钮创建新的借款合同"
            action={
              <Button onClick={() => navigate('/contracts/new')}>
                <Plus size={16} className="mr-2" />
                新建合同
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-zebra">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">合同编号</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">借款人</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">借款金额</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">期限</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">到期日</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContracts.map(contract => (
                  <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <span className="font-mono text-sm text-slate-800">{contract.contract_no}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-800">{contract.borrower_name}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-medium text-slate-800">¥{formatMoney(contract.amount)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <Tag>{contract.term}</Tag>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-600">{contract.end_date}</span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={contract.status} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/contracts/${contract.id}`)}>
                        <Eye size={16} className="mr-1" />
                        查看
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
