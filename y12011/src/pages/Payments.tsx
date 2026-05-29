import { Search, Filter, Download, Plus, Clock } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { useRebateStore } from '../store/rebateStore';
import { useState } from 'react';

export default function Payments() {
  const { payments } = useRebateStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = payment.paymentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.dealerName && payment.dealerName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return <Badge variant="success">已匹配</Badge>;
      case 'pending':
        return <Badge variant="warning">待匹配</Badge>;
      case 'delayed':
        return <Badge variant="error">延迟</Badge>;
      default:
        return <Badge variant="default">未知</Badge>;
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">回款流水</h1>
          <p className="text-gray-500 mt-1">管理回款记录，支持延迟到账标记</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Download size={16} className="mr-2" />
            导出
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
            <Plus size={16} className="mr-2" />
            导入
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索回款单号、经销商..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部状态</option>
              <option value="matched">已匹配</option>
              <option value="pending">待匹配</option>
              <option value="delayed">延迟</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">回款单号</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">经销商</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">回款日期</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">金额</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">银行流水号</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">预计到账</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-blue-600">{payment.paymentNo}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{payment.dealerName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{payment.paymentDate}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(payment.amount)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 font-mono">{payment.bankFlowNo}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(payment.status)}
                      {payment.isDelayed && (
                        <Clock size={14} className="text-orange-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{payment.expectedArrivalDate}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">共 {filteredPayments.length} 条记录</span>
            <div className="flex items-center gap-2">
              <Badge variant="error" size="sm">
                {filteredPayments.filter(p => p.isDelayed).length} 笔延迟
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
