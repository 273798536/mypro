import { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, Filter, Download, Search, Calendar, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, getEntryTypeLabel } from '../utils/format';
import { cn } from '../lib/utils';
import { EntryType } from '../types';

export function Ledger() {
  const ledgerEntries = useStore((state) => state.ledgerEntries);
  const currentBalance = useStore((state) => state.currentBalance);
  const [filterType, setFilterType] = useState<EntryType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const totalRecharge = ledgerEntries
    .filter((e) => e.entryType === 'recharge')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalConsume = ledgerEntries
    .filter((e) => e.entryType === 'consume')
    .reduce((sum, e) => sum + Math.abs(e.amount), 0);
  const totalRefund = ledgerEntries
    .filter((e) => e.entryType === 'refund')
    .reduce((sum, e) => sum + e.amount, 0);

  const filteredEntries = ledgerEntries.filter((entry) => {
    const matchType = filterType === 'all' || entry.entryType === filterType;
    const matchSearch =
      entry.sourceDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.operator.toLowerCase().includes(searchTerm.toLowerCase());
    return matchType && matchSearch;
  });

  const getEntryIcon = (type: EntryType) => {
    switch (type) {
      case 'recharge':
        return <TrendingUp className="w-5 h-5 text-success-600" />;
      case 'consume':
        return <TrendingDown className="w-5 h-5 text-gray-600" />;
      case 'refund':
        return <RefreshCw className="w-5 h-5 text-warning-600" />;
    }
  };

  const getEntryBgColor = (type: EntryType) => {
    switch (type) {
      case 'recharge':
        return 'bg-success-50';
      case 'consume':
        return 'bg-gray-50';
      case 'refund':
        return 'bg-warning-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">余额账本</h1>
          <p className="text-gray-500 mt-1">预付费账户余额与流水明细</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Calendar className="w-4 h-4" />
            2024年5月
            <ChevronDown className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            <Download className="w-4 h-4" />
            导出报表
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <p className="text-primary-100 text-sm">当前余额</p>
          <p className="text-3xl font-bold mt-2">{formatCurrency(currentBalance)}</p>
          <p className="text-primary-200 text-sm mt-2">可用余额充足</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success-600" />
            </div>
          </div>
          <p className="text-gray-500 text-sm">累计充值</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(totalRecharge)}
          </p>
          <p className="text-success-600 text-sm mt-2">+ 800,000.00 本月</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-gray-600" />
            </div>
          </div>
          <p className="text-gray-500 text-sm">累计消耗</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(totalConsume)}
          </p>
          <p className="text-gray-500 text-sm mt-2">- 330,211.60 本月</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-warning-600" />
            </div>
          </div>
          <p className="text-gray-500 text-sm">累计退款</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(totalRefund)}
          </p>
          <p className="text-warning-600 text-sm mt-2">+ 8,020.00 本月</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">流水明细</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索流水..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as EntryType | 'all')}
                  className="h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="all">全部类型</option>
                  <option value="recharge">充值</option>
                  <option value="consume">消耗</option>
                  <option value="refund">退款</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            {(['all', 'recharge', 'consume', 'refund'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  filterType === type
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {type === 'all' ? '全部' : getEntryTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  描述
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  金额
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  变动后余额
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作人
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  关联单据
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEntries.map((entry) => (
                <tr key={entry.entryId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(entry.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm',
                        getEntryBgColor(entry.entryType),
                        entry.entryType === 'recharge'
                          ? 'text-success-700'
                          : entry.entryType === 'refund'
                          ? 'text-warning-700'
                          : 'text-gray-700'
                      )}
                    >
                      {getEntryIcon(entry.entryType)}
                      {getEntryTypeLabel(entry.entryType)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.sourceDesc}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        entry.amount > 0 ? 'text-success-600' : 'text-gray-900'
                      )}
                    >
                      {entry.amount > 0 ? '+' : ''}
                      {formatCurrency(entry.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {formatCurrency(entry.balanceAfter)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.operator}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-primary-600 hover:text-primary-700 cursor-pointer">
                      {entry.sourceId}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            共 {filteredEntries.length} 条记录
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50">
              上一页
            </button>
            <button className="px-3 py-1.5 bg-primary-600 text-white rounded text-sm">
              1
            </button>
            <button className="px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50">
              2
            </button>
            <button className="px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50">
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
