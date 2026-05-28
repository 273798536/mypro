import { useState, useMemo } from 'react';
import { Search, Filter, CheckSquare, Square, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useCouponStore } from '../store/useCouponStore';
import { VerificationStatus, STATUS_LABELS, STATUS_COLORS } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDateDisplay } from '../utils/dateUtils';
import { formatAmount } from '../utils/amountUtils';

const FILTER_OPTIONS: (VerificationStatus | 'all')[] = [
  'all',
  'full',
  'adjusted',
  'partial',
  'none',
  'pending',
];

export const VerifyPage = () => {
  const { verificationResults, couponPlans, batchMarkAsReviewed } = useCouponStore();
  const [filterStatus, setFilterStatus] = useState<VerificationStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [batchNote, setBatchNote] = useState('');

  const filteredResults = useMemo(() => {
    return verificationResults.filter((result) => {
      const plan = couponPlans.find((p) => p.planId === result.planId);
      const matchesStatus = filterStatus === 'all' || result.status === filterStatus;
      const matchesSearch =
        !searchTerm ||
        plan?.bondName.includes(searchTerm) ||
        plan?.bondCode.includes(searchTerm) ||
        result.planId.includes(searchTerm);
      return matchesStatus && matchesSearch;
    });
  }, [verificationResults, couponPlans, filterStatus, searchTerm]);

  const handleSelectAll = () => {
    if (selectedIds.length === filteredResults.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredResults.map((r) => r.resultId));
    }
  };

  const handleSelectOne = (resultId: string) => {
    if (selectedIds.includes(resultId)) {
      setSelectedIds(selectedIds.filter((id) => id !== resultId));
    } else {
      setSelectedIds([...selectedIds, resultId]);
    }
  };

  const handleBatchReview = () => {
    if (selectedIds.length > 0) {
      batchMarkAsReviewed(selectedIds, batchNote);
      setSelectedIds([]);
      setBatchNote('');
    }
  };

  const stats = useMemo(() => {
    const result: Record<string, number> = {};
    verificationResults.forEach((r) => {
      result[r.status] = (result[r.status] || 0) + 1;
    });
    return result;
  }, [verificationResults]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">复核面板</h1>
          <p className="text-gray-500">
            按状态筛选核验结果，批量标记已复核项。支持单独展开查看详细差异归因。
          </p>
        </div>

        <div className="grid grid-cols-6 gap-3 mb-6">
          {FILTER_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                filterStatus === status
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {status !== 'all' && (
                  <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {status === 'all' ? '全部' : STATUS_LABELS[status]}
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {status === 'all' ? verificationResults.length : stats[status] || 0}
              </p>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索债券名称、代码或计划编号..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Filter className="w-4 h-4" />
                <span>共 {filteredResults.length} 条记录</span>
              </div>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="批量备注（可选）"
                  value={batchNote}
                  onChange={(e) => setBatchNote(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleBatchReview}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  批量标记已复核 ({selectedIds.length})
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={handleSelectAll}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {selectedIds.length === filteredResults.length && filteredResults.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    计划编号
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    债券信息
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    付息日
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    计划金额
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    实际金额
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                    差异
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                    状态
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                    复核
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                    展开
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredResults.map((result) => {
                  const plan = couponPlans.find((p) => p.planId === result.planId);
                  const isExpanded = expandedId === result.resultId;

                  return (
                    <>
                      <tr
                        key={result.resultId}
                        className={`hover:bg-gray-50 transition-colors ${
                          result.isReviewed ? 'bg-emerald-50/50' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleSelectOne(result.resultId)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {selectedIds.includes(result.resultId) ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">
                          {result.planId}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{plan?.bondName}</p>
                          <p className="text-xs text-gray-500">{plan?.bondCode}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {plan ? formatDateDisplay(plan.paymentDate) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                          ¥{formatAmount(result.expectedAmount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                          ¥{formatAmount(result.actualAmount)}
                        </td>
                        <td
                          className={`px-4 py-3 text-sm text-right font-semibold ${
                            result.diffAmount < 0
                              ? 'text-red-600'
                              : result.diffAmount > 0
                              ? 'text-emerald-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {result.diffAmount !== 0 && (
                            <>{result.diffAmount > 0 ? '+' : ''}{formatAmount(result.diffAmount)}</>
                          )}
                          {result.diffAmount === 0 && result.status !== 'pending' && (
                            <span className="text-emerald-600">-</span>
                          )}
                          {result.status === 'pending' && <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={result.status} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {result.isReviewed ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                              <CheckSquare className="w-3 h-3" />
                              已复核
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">待复核</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : result.resultId)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={10} className="px-8 py-4">
                            <div className="flex items-start gap-6">
                              <div className="flex items-start gap-2">
                                <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-gray-700">差异归因</p>
                                  <p className="text-sm text-gray-600">{result.reason}</p>
                                  <p className="text-xs text-gray-500 mt-1">{result.reasonDetail}</p>
                                </div>
                              </div>
                              {result.isReviewed && result.reviewNote && (
                                <div className="flex items-start gap-2">
                                  <CheckSquare className="w-4 h-4 text-emerald-500 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">复核备注</p>
                                    <p className="text-sm text-gray-600">{result.reviewNote}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {result.reviewer} · {result.reviewDate}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredResults.length === 0 && (
            <div className="p-12 text-center">
              <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">没有找到匹配的核验结果</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
