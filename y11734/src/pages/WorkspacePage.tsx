import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  CheckSquare,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ExceptionAlert from '@/components/ExceptionAlert';
import SplitDetail from '@/components/SplitDetail';
import { useSplitStore } from '@/store/useSplitStore';
import type { SplitResult, PaymentReceipt } from '@/types';

type FilterType = 'all' | 'pending' | 'processing' | 'completed' | 'exception';

const statusConfig: Record<PaymentReceipt['status'], { label: string; color: string; bg: string }> = {
  pending: { label: '待处理', color: 'text-slate-600', bg: 'bg-slate-100' },
  processing: { label: '处理中', color: 'text-blue-600', bg: 'bg-blue-100' },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-100' },
  exception: { label: '异常', color: 'text-red-600', bg: 'bg-red-100' },
};

export default function WorkspacePage() {
  const navigate = useNavigate();
  const {
    payments,
    splits,
    exceptions,
    selectedPaymentId,
    operationLogs,
    setSelectedPaymentId,
    updateSplit,
    updatePaymentStatus,
    markExceptionResolved,
    addOperationLog,
  } = useSplitStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.payer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterType === 'all' || p.status === filterType;
    return matchesSearch && matchesFilter;
  });

  const selectedPayment = payments.find((p) => p.id === selectedPaymentId);
  const selectedSplits = splits.filter((s) => s.paymentId === selectedPaymentId);
  const paymentExceptions = exceptions.filter(
    (e) => e.paymentId === selectedPaymentId
  );

  const stats = {
    total: payments.length,
    pending: payments.filter((p) => p.status === 'pending').length,
    completed: payments.filter((p) => p.status === 'completed').length,
    exception: payments.filter((p) => p.status === 'exception').length,
  };

  const toggleExpand = (id: string) => {
    setExpandedPaymentId(expandedPaymentId === id ? null : id);
  };

  const handleSelectPayment = (id: string) => {
    setSelectedPaymentId(id);
    setExpandedPaymentId(null);
  };

  const handleUpdateSplit = (id: string, updates: Partial<SplitResult>) => {
    const split = splits.find((s) => s.id === id);
    if (split) {
      addOperationLog({
        targetId: id,
        targetType: 'split',
        action: 'adjust',
        beforeValue: `金额: ${split.splitAmount.toLocaleString('zh-CN')}`,
        afterValue: `金额: ${updates.splitAmount?.toLocaleString('zh-CN') || split.splitAmount.toLocaleString('zh-CN')}`,
        operator: '保理专员',
      });
    }
    updateSplit(id, updates);
  };

  const handleMarkDispute = (id: string, reason: string) => {
    const split = splits.find((s) => s.id === id);
    if (split) {
      addOperationLog({
        targetId: id,
        targetType: 'split',
        action: 'dispute',
        beforeValue: split.status,
        afterValue: `disputed - ${reason}`,
        operator: '保理专员',
      });
    }
    updateSplit(id, {
      isDispute: true,
      status: 'disputed',
      disputeReason: reason,
    });
  };

  const handleConfirmSplit = () => {
    if (selectedPaymentId) {
      const hasDispute = selectedSplits.some((s) => s.isDispute);
      const newStatus = hasDispute ? 'exception' : 'completed';

      addOperationLog({
        targetId: selectedPaymentId,
        targetType: 'payment',
        action: 'confirm',
        beforeValue: selectedPayment?.status || 'unknown',
        afterValue: newStatus,
        operator: '保理专员',
      });

      updatePaymentStatus(selectedPaymentId, newStatus);

      selectedSplits.forEach((s) => {
        if (!s.isDispute) {
          updateSplit(s.id, { status: 'normal' });
        }
      });
    }
  };

  const handleRecalculate = () => {
    if (selectedPaymentId) {
      addOperationLog({
        targetId: selectedPaymentId,
        targetType: 'payment',
        action: 'update',
        beforeValue: '余额重算前',
        afterValue: '余额重算后',
        operator: '保理专员',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  保理回款拆分系统
                </h1>
                <p className="text-sm text-slate-500">拆分工作台</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">步骤 2/3</span>
                <div className="flex gap-1">
                  <div className="w-8 h-2 rounded-full bg-slate-700" />
                  <div className="w-8 h-2 rounded-full bg-slate-700" />
                  <div className="w-8 h-2 rounded-full bg-slate-200" />
                </div>
              </div>
              <button
                onClick={() => navigate('/report')}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                查看报告
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                <p className="text-xs text-slate-500">回款总数</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                <p className="text-xs text-slate-500">待处理</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                <p className="text-xs text-slate-500">已完成</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.exception}</p>
                <p className="text-xs text-slate-500">异常</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800">回款列表</h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="搜索流水号/付款方"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 w-56"
                      />
                    </div>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as FilterType)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      <option value="all">全部</option>
                      <option value="pending">待处理</option>
                      <option value="processing">处理中</option>
                      <option value="completed">已完成</option>
                      <option value="exception">异常</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {filteredPayments.map((payment) => {
                  const paymentSplits = splits.filter((s) => s.paymentId === payment.id);
                  const hasException = exceptions.some(
                    (e) => e.paymentId === payment.id && !e.resolved
                  );
                  const isSelected = selectedPaymentId === payment.id;
                  const isExpanded = expandedPaymentId === payment.id;

                  return (
                    <div key={payment.id}>
                      <div
                        className={cn(
                          'p-4 cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-blue-50 border-l-4 border-l-blue-500'
                            : 'hover:bg-slate-50'
                        )}
                        onClick={() => handleSelectPayment(payment.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm font-medium text-slate-800">
                                {payment.receiptNo}
                              </span>
                              {hasException && (
                                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-slate-500 truncate mb-2">
                              {payment.payer}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              <span>{payment.receiptDate}</span>
                              <span>
                                ¥{payment.totalAmount.toLocaleString('zh-CN')}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <span
                              className={cn(
                                'px-2 py-1 text-xs font-medium rounded-full',
                                statusConfig[payment.status].bg,
                                statusConfig[payment.status].color
                              )}
                            >
                              {statusConfig[payment.status].label}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(payment.id);
                              }}
                              className="p-1 hover:bg-slate-100 rounded"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && paymentSplits.length > 0 && (
                        <div className="px-4 pb-4 bg-slate-50">
                          <div className="space-y-2 pt-2">
                            {paymentSplits.map((split) => (
                              <div
                                key={split.id}
                                className="p-3 bg-white rounded-lg border border-slate-100"
                              >
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-600">
                                    {split.invoiceNo}
                                  </span>
                                  <span className="font-medium text-slate-800">
                                    ¥{split.splitAmount.toLocaleString('zh-CN')}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredPayments.length === 0 && (
                  <div className="p-8 text-center text-slate-400">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">暂无回款数据</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-span-7 space-y-6">
            {selectedPayment ? (
              <>
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-lg mb-1">
                        {selectedPayment.receiptNo}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {selectedPayment.payer} · {selectedPayment.receiptDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRecalculate}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="h-4 w-4" />
                        余额重算
                      </button>
                      <button
                        onClick={handleConfirmSplit}
                        className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors flex items-center gap-1"
                      >
                        <CheckSquare className="h-4 w-4" />
                        确认拆分
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">回款金额</p>
                      <p className="text-lg font-semibold text-slate-800">
                        ¥{selectedPayment.totalAmount.toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">匹配发票</p>
                      <p className="text-lg font-semibold text-slate-800">
                        {selectedSplits.length} 张
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">涉及卖方</p>
                      <p className="text-lg font-semibold text-slate-800">
                        {new Set(selectedSplits.map((s) => s.sellerId)).size} 家
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">来源</p>
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {selectedPayment.source}
                      </p>
                    </div>
                  </div>

                  {paymentExceptions.length > 0 && (
                    <div className="mb-6">
                      <ExceptionAlert
                        exceptions={paymentExceptions}
                        onResolve={markExceptionResolved}
                      />
                    </div>
                  )}

                  <SplitDetail
                    splits={selectedSplits}
                    onUpdateSplit={handleUpdateSplit}
                    onMarkDispute={handleMarkDispute}
                  />
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-2">请选择一笔回款查看详情</p>
                <p className="text-sm text-slate-400">
                  从左侧列表中选择回款，查看拆分明细并进行调整
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
