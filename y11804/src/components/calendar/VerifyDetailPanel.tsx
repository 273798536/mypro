import { X, FileText, Banknote, Building2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useCouponStore } from '../../store/useCouponStore';
import { formatDateDisplay } from '../../utils/dateUtils';
import { formatAmount } from '../../utils/amountUtils';
import { StatusBadge } from '../common/StatusBadge';
import { useState } from 'react';

interface VerifyDetailPanelProps {
  planId: string;
  onClose: () => void;
}

export const VerifyDetailPanel = ({ planId, onClose }: VerifyDetailPanelProps) => {
  const { getPlanDetail, markAsReviewed } = useCouponStore();
  const [reviewNote, setReviewNote] = useState('');
  const { plan, position, receipt, result } = getPlanDetail(planId);

  if (!plan) return null;

  const handleMarkReviewed = () => {
    markAsReviewed(result?.resultId || '', reviewNote);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">核验详情</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{plan.bondName}</h3>
            <p className="text-sm text-gray-500">{plan.bondCode}</p>
          </div>
          {result && <StatusBadge status={result.status} />}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">计划编号</p>
            <p className="text-sm font-medium text-gray-900">{plan.planId}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">票面利率</p>
            <p className="text-sm font-medium text-gray-900">{plan.couponRate}%</p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            持仓信息
            <span className="text-xs text-gray-400">导入顺序: #{position?.importOrder || '-'}</span>
          </h4>
          {position ? (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">持仓面额:</span>
                  <span className="ml-1 font-medium text-gray-900">
                    ¥{formatAmount(position.positionAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">账户:</span>
                  <span className="ml-1 font-medium text-gray-900">{position.account}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-500">
              暂无持仓数据
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            票息计划
          </h4>
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">付息日:</span>
                <span className="ml-1 font-medium text-gray-900">
                  {formatDateDisplay(plan.paymentDate)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">计息天数:</span>
                <span className="ml-1 font-medium text-gray-900">{plan.daysAccrued}天</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">应付金额:</span>
                <span className="ml-1 font-bold text-emerald-700">
                  ¥{formatAmount(plan.expectedAmount)}
                </span>
              </div>
            </div>
            {plan.isHolidayAdjusted && plan.originalPaymentDate && (
              <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                <Clock className="w-3 h-3" />
                原付息日 {formatDateDisplay(plan.originalPaymentDate)} 遇节假日顺延
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Banknote className="w-4 h-4" />
            托管回单
            <span className="text-xs text-gray-400">
              {receipt ? `导入顺序: #${receipt.importOrder}` : '未导入'}
            </span>
          </h4>
          {receipt ? (
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">到账日期:</span>
                  <span className="ml-1 font-medium text-gray-900">
                    {formatDateDisplay(receipt.actualDate)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">托管行:</span>
                  <span className="ml-1 font-medium text-gray-900">{receipt.bankName}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">到账金额:</span>
                  <span className="ml-1 font-bold text-purple-700">
                    ¥{formatAmount(receipt.actualAmount)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">银行流水号:</span>
                  <span className="ml-1 font-mono text-xs text-gray-600">
                    {receipt.bankReference}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              等待托管回单导入
            </div>
          )}
        </div>

        {result && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              核验结果
            </h4>
            <div
              className={`rounded-lg p-3 border ${
                result.status === 'full'
                  ? 'bg-emerald-50 border-emerald-200'
                  : result.status === 'partial'
                  ? 'bg-amber-50 border-amber-200'
                  : result.status === 'none'
                  ? 'bg-red-50 border-red-200'
                  : result.status === 'adjusted'
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">核验结论:</span>
                <StatusBadge status={result.status} size="sm" />
              </div>
              <p className="text-sm text-gray-600 mb-2">{result.reason}</p>
              <p className="text-xs text-gray-500">{result.reasonDetail}</p>

              {result.status !== 'pending' && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-gray-500">计划金额</p>
                      <p className="font-semibold text-gray-900">
                        ¥{formatAmount(result.expectedAmount)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500">实际金额</p>
                      <p className="font-semibold text-gray-900">
                        ¥{formatAmount(result.actualAmount)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500">差异</p>
                      <p
                        className={`font-semibold ${
                          result.diffAmount < 0 ? 'text-red-600' : 'text-emerald-600'
                        }`}
                      >
                        {result.diffAmount >= 0 ? '+' : ''}
                        {formatAmount(result.diffAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!result.isReviewed && (
              <div className="space-y-2">
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="添加复核备注（可选）..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
                <button
                  onClick={handleMarkReviewed}
                  className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  标记已复核
                </button>
              </div>
            )}

            {result.isReviewed && (
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>已由 {result.reviewer} 于 {result.reviewDate} 复核</span>
                </div>
                {result.reviewNote && (
                  <p className="mt-1 text-xs text-emerald-600">备注: {result.reviewNote}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
