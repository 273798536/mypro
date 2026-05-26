import { useEffect, useState } from 'react';
import { Link2, Unlink, Search, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { useUIStore } from '../store/useUIStore';
import { MATCH_STATUS_LABELS, MatchingRecord, CustomerOrder, BankStatement } from '../types';
import { runAutoMatching, createManualMatch, removeMatch } from '../services/matchingService';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/date';

export default function Matching() {
  const { loadAllData, isLoaded, orders, statements, matchings, refreshData } = useDataStore();
  const { showToast, setLoading, openDetail } = useUIStore();
  const [filter, setFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isLoaded) {
      loadAllData();
    }
  }, [isLoaded, loadAllData]);

  const handleAutoMatch = async () => {
    setLoading(true, '正在执行自动匹配...');
    try {
      const result = await runAutoMatching();
      await refreshData();
      showToast(
        'success',
        `自动匹配完成：成功 ${result.matched} 笔，失败 ${result.failed} 笔`
      );
    } catch (error) {
      showToast('error', '匹配失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnmatch = async (matchingId: string) => {
    setLoading(true, '正在取消匹配...');
    try {
      await removeMatch(matchingId);
      await refreshData();
      showToast('success', '已取消匹配');
    } catch (error) {
      showToast('error', '取消失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getMatchedOrderIds = () => {
    return new Set(matchings.map((m) => m.orderId));
  };

  const getMatchedStatementIds = () => {
    return new Set(matchings.map((m) => m.statementId));
  };

  const getOrderById = (id: string): CustomerOrder | undefined => {
    return orders.find((o) => o.id === id);
  };

  const getStatementById = (id: string): BankStatement | undefined => {
    return statements.find((s) => s.id === id);
  };

  const filteredMatchings = matchings.filter((m) => {
    if (filter === 'matched') return m.status === 'matched';
    if (filter === 'unmatched') return m.status === 'unmatched';
    return true;
  });

  const searchedMatchings = filteredMatchings.filter((m) => {
    if (!searchTerm) return true;
    const order = getOrderById(m.orderId);
    const statement = getStatementById(m.statementId);
    const term = searchTerm.toLowerCase();
    return (
      order?.orderNo.toLowerCase().includes(term) ||
      statement?.referenceNo.toLowerCase().includes(term) ||
      order?.customerName.toLowerCase().includes(term)
    );
  });

  const unmatchedOrders = orders.filter((o) => !getMatchedOrderIds().has(o.id));
  const unmatchedStatements = statements.filter((s) => !getMatchedStatementIds().has(s.id));

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      matched: 'bg-success-100 text-success-700',
      unmatched: 'bg-warning-100 text-warning-700',
      partial: 'bg-primary-100 text-primary-700',
      pending: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`badge ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
        {MATCH_STATUS_LABELS[status as keyof typeof MATCH_STATUS_LABELS] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">到账匹配</h1>
        <button onClick={handleAutoMatch} className="btn btn-primary">
          <Link2 size={18} />
          自动匹配
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">匹配成功</p>
          <p className="text-2xl font-bold text-success-600">
            {matchings.filter((m) => m.status === 'matched').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">待匹配订单</p>
          <p className="text-2xl font-bold text-warning-600">{unmatchedOrders.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">待匹配水单</p>
          <p className="text-2xl font-bold text-primary-600">{unmatchedStatements.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">匹配率</p>
          <p className="text-2xl font-bold text-gray-800">
            {orders.length > 0
              ? Math.round((matchings.filter((m) => m.status === 'matched').length / orders.length) * 100)
              : 0}
            %
          </p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            {(['all', 'matched', 'unmatched'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? '全部' : f === 'matched' ? '已匹配' : '未匹配'}
              </button>
            ))}
          </div>
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索订单号、水单号、客户名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-600">状态</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">订单信息</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">水单信息</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">订单金额</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">到账金额</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">置信度</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {searchedMatchings.length > 0 ? (
                searchedMatchings.map((matching) => {
                  const order = getOrderById(matching.orderId);
                  const statement = getStatementById(matching.statementId);
                  return (
                    <tr key={matching.id} className="border-b border-gray-100 table-row-hover">
                      <td className="px-4 py-3">
                        <StatusBadge status={matching.status} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{order?.orderNo || '-'}</p>
                        <p className="text-xs text-gray-500">{order?.customerName || '-'}</p>
                        <p className="text-xs text-gray-400">{order ? formatDate(order.orderDate) : '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{statement?.referenceNo || '-'}</p>
                        <p className="text-xs text-gray-500">{statement?.bank || '-'}</p>
                        <p className="text-xs text-gray-400">
                          {statement ? formatDate(statement.transactionDate) : '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-medium text-gray-800">
                          {order ? formatCurrency(order.amount, order.currency) : '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-medium text-gray-800">
                          {statement ? formatCurrency(statement.receivedAmount, statement.currency) : '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-medium ${
                            matching.confidence >= 80
                              ? 'text-success-600'
                              : matching.confidence >= 60
                              ? 'text-warning-600'
                              : 'text-danger-600'
                          }`}
                        >
                          {matching.confidence}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openDetail('matching', matching.id)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                            title="查看详情"
                          >
                            <Eye size={16} />
                          </button>
                          {matching.status === 'matched' && (
                            <button
                              onClick={() => handleUnmatch(matching.id)}
                              className="p-1.5 rounded hover:bg-danger-50 text-gray-500 hover:text-danger-600"
                              title="取消匹配"
                            >
                              <Unlink size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    暂无匹配记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
