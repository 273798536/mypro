
import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, User, FileText, Clock } from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency, getExceptionLabel, formatDate, maskCardNumber } from '../utils/formatter';
import { useSettlementStore } from '../store/useSettlementStore';

interface ExceptionPanelProps {
  transactions: Transaction[];
}

const ExceptionPanel: React.FC<ExceptionPanelProps> = ({ transactions }) => {
  const { reviewException } = useSettlementStore();
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  const exceptionTransactions = transactions.filter((tx) => tx.status === 'exception');

  const handleReview = (txId: string, resolved: boolean) => {
    const note = reviewNote[txId] || '';
    const finalNote = resolved
      ? `复核通过: ${note || '确认异常处理方案'}`
      : `复核驳回: ${note || '需要进一步核查'}`;
    reviewException(txId, '财务-当前用户', finalNote);
  };

  if (exceptionTransactions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">暂无异常记录</p>
          <p className="text-sm text-gray-500 mt-1">所有交易均正常</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          异常待复核
          <span className="ml-2 px-2 py-0.5 text-sm bg-red-100 text-red-700 rounded-full">
            {exceptionTransactions.length}
          </span>
        </h3>
      </div>

      {exceptionTransactions.map((tx) => (
        <div
          key={tx.txId}
          className="bg-white rounded-lg border-2 border-red-200 shadow-sm overflow-hidden"
        >
          <div className="bg-red-50 px-6 py-3 border-b border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                <div>
                  <span className="text-sm font-semibold text-red-800">
                    {getExceptionLabel(tx.exceptionType || '')}
                  </span>
                  <span className="text-sm text-red-600 ml-3 font-mono">
                    {tx.txId}
                  </span>
                </div>
              </div>
              <div className="text-sm text-red-600 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDate(tx.createdAt)}
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="bg-red-50 rounded-lg p-4 mb-4 border border-red-100">
              <p className="text-sm text-red-800">
                <span className="font-medium">异常描述: </span>
                {tx.exceptionNote}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-6 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">会员信息</p>
                <p className="text-sm font-medium text-gray-900">{tx.memberName}</p>
                <p className="text-xs text-gray-500 font-mono">
                  {maskCardNumber(tx.cardNumber)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">交易金额</p>
                <p className="text-lg font-bold font-mono text-gray-900">
                  {formatCurrency(tx.totalAmount)}
                </p>
                <div className="text-xs text-gray-500">
                  本金 {formatCurrency(tx.principalUsed)} + 赠金{' '}
                  {formatCurrency(tx.bonusUsed)}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">交易类型</p>
                <p className="text-sm font-medium text-gray-900">
                  {tx.type === 'consume' ? '消费' : tx.type === 'recharge' ? '充值' : '退款'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">数据来源</p>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {tx.source}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">复核意见</p>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="请输入复核意见..."
                  value={reviewNote[tx.txId] || ''}
                  onChange={(e) =>
                    setReviewNote({ ...reviewNote, [tx.txId]: e.target.value })
                  }
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => handleReview(tx.txId, true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  确认处理
                </button>
                <button
                  onClick={() => handleReview(tx.txId, false)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  驳回申诉
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExceptionPanel;
