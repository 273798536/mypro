import { useState } from 'react';
import { useRebateStore } from '../store/rebateStore';
import { AlertTriangle, RotateCcw, Check, User, Calendar, Scissors, ArrowLeftRight, XCircle } from 'lucide-react';

export default function Disputes() {
  const { rebateResults, contracts, refundRecords, rollbackRefund, recalculateRebate } = useRebateStore();
  const [filterType, setFilterType] = useState<string>('all');

  const disputedResults = rebateResults.filter(
    (r) => r.status === 'warning' || r.status === 'disputed'
  );

  const filteredResults = filterType === 'all'
    ? disputedResults
    : disputedResults.filter((r) => r.warnings.some((w) => w.type === filterType));

  const getWarningIcon = (type: string) => {
    const icons: Record<string, any> = {
      sales_change: User,
      cross_month_refund: Calendar,
      pt_split: Scissors,
      transfer: ArrowLeftRight,
      invalid_data: XCircle,
    };
    return icons[type] || AlertTriangle;
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      high: 'border-rose-300 bg-rose-50',
      medium: 'border-amber-300 bg-amber-50',
      low: 'border-blue-300 bg-blue-50',
    };
    return colors[severity] || 'border-slate-300 bg-slate-50';
  };

  const handleRollbackRefund = (contractId: string) => {
    const refund = refundRecords.find((r) => r.contractId === contractId && !r.isRolledBack);
    if (refund) {
      rollbackRefund(refund.id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">争议清单</h1>
          <p className="text-slate-500 mt-1">处理异常记录、退课回滚和争议确认</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-full text-sm font-medium">
            {disputedResults.length} 条待处理
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        {[
          { key: 'all', label: '全部异常' },
          { key: 'sales_change', label: '销售变更' },
          { key: 'cross_month_refund', label: '跨月退课' },
          { key: 'pt_split', label: '私教拆分' },
          { key: 'transfer', label: '转店记录' },
          { key: 'invalid_data', label: '无效数据' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilterType(item.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === item.key
                ? 'bg-[#1e3a5f] text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filteredResults.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-100">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">暂无待处理异常</h3>
          <p className="text-slate-500 mt-1">所有记录均已确认或无异常</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredResults.map((result) => {
            const contract = contracts.find((c) => c.id === result.contractId);
            const hasCrossMonthRefund = result.warnings.some((w) => w.type === 'cross_month_refund');
            const refund = refundRecords.find((r) => r.contractId === result.contractId && !r.isRolledBack);

            return (
              <div
                key={result.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                  result.status === 'disputed' ? 'border-rose-200' : 'border-amber-200'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        result.status === 'disputed' ? 'bg-rose-100' : 'bg-amber-100'
                      }`}>
                        <AlertTriangle className={`w-6 h-6 ${
                          result.status === 'disputed' ? 'text-rose-600' : 'text-amber-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-slate-800">
                            {contract?.memberName || '未知会员'}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            result.status === 'disputed'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {result.status === 'disputed' ? '争议' : '警告'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {result.contractId} · {result.salesName} · {result.storeName}
                        </p>
                        <div className="flex items-center gap-6 mt-3">
                          <div>
                            <span className="text-xs text-slate-500">合同金额</span>
                            <p className="font-semibold text-slate-800">¥{result.baseAmount.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500">最终返利</span>
                            <p className="font-semibold text-slate-800">¥{result.finalAmount.toFixed(2)}</p>
                          </div>
                          {result.adjustmentAmount !== 0 && (
                            <div>
                              <span className="text-xs text-slate-500">调整</span>
                              <p className={`font-semibold ${result.adjustmentAmount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {result.adjustmentAmount >= 0 ? '+' : ''}¥{result.adjustmentAmount.toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasCrossMonthRefund && refund && (
                        <button
                          onClick={() => handleRollbackRefund(result.contractId)}
                          className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors text-sm font-medium"
                        >
                          <RotateCcw className="w-4 h-4" />
                          回滚退课
                        </button>
                      )}
                      <button
                        onClick={() => recalculateRebate(result.contractId)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                      >
                        <RotateCcw className="w-4 h-4" />
                        重新计算
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">异常详情</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {result.warnings.map((warning, idx) => {
                        const Icon = getWarningIcon(warning.type);
                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-lg border ${getSeverityColor(warning.severity)}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                                <Icon className="w-4 h-4 text-slate-600" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-slate-800">{warning.message}</p>
                                <div className="mt-2 text-xs text-slate-600 space-y-1">
                                  {warning.type === 'sales_change' && (
                                    <>
                                      <p>原销售: {warning.details.previousSales}</p>
                                      <p>现销售: {warning.details.currentSales}</p>
                                    </>
                                  )}
                                  {warning.type === 'cross_month_refund' && (
                                    <>
                                      <p>合同月份: {warning.details.contractMonth}</p>
                                      <p>退款月份: {warning.details.refundMonth}</p>
                                      <p>退款金额: ¥{warning.details.refundAmount}</p>
                                    </>
                                  )}
                                  {warning.type === 'pt_split' && (
                                    <>
                                      <p>私教包: {warning.details.packageName}</p>
                                      <p>涉及销售: {warning.details.assignedSales?.length || 0}人</p>
                                    </>
                                  )}
                                  {warning.type === 'transfer' && (
                                    <>
                                      <p>{warning.details.fromStore} → {warning.details.toStore}</p>
                                      <p>转店日期: {warning.details.transferDate}</p>
                                      <p>转店费: ¥{warning.details.transferFee}</p>
                                    </>
                                  )}
                                  {warning.type === 'invalid_data' && (
                                    <>
                                      <p>问题字段: {warning.details.phone ? '手机号' : '金额'}</p>
                                      <p>问题值: {warning.details.phone || warning.details.amount}</p>
                                    </>
                                  )}
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                warning.severity === 'high'
                                  ? 'bg-rose-200 text-rose-700'
                                  : warning.severity === 'medium'
                                  ? 'bg-amber-200 text-amber-700'
                                  : 'bg-blue-200 text-blue-700'
                              }`}>
                                {warning.severity === 'high' ? '高' : warning.severity === 'medium' ? '中' : '低'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
