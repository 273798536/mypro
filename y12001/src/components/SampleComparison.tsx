
import React from 'react';
import { CheckCircle, AlertTriangle, ArrowRight, Wallet, Gift, Store, FileText } from 'lucide-react';
import { Transaction, Store as StoreType, StoreSettlement } from '../types';
import { formatCurrency, getExceptionLabel, maskCardNumber } from '../utils/formatter';
import { calculateSettlement, BONUS_COST_RATE } from '../utils/calculator';

interface SampleComparisonProps {
  normalTransaction: Transaction;
  closedTransaction: Transaction;
  stores: StoreType[];
}

const SampleComparison: React.FC<SampleComparisonProps> = ({
  normalTransaction,
  closedTransaction,
  stores,
}) => {
  const normalSettlement = calculateSettlement(normalTransaction, stores);
  const closedSettlement = calculateSettlement(closedTransaction, stores);

  const SampleCard = ({
    title,
    type,
    transaction,
    settlement,
  }: {
    title: string;
    type: 'normal' | 'closed';
    transaction: Transaction;
    settlement: StoreSettlement | null;
  }) => (
    <div
      className={`rounded-lg border-2 overflow-hidden ${
        type === 'normal'
          ? 'border-green-200 bg-green-50/30'
          : 'border-red-200 bg-red-50/30'
      }`}
    >
      <div
        className={`px-6 py-4 border-b ${
          type === 'normal' ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200'
        }`}
      >
        <div className="flex items-center gap-3">
          {type === 'normal' ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse" />
          )}
          <div>
            <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
            <p className="text-sm text-gray-600">
              {type === 'normal'
                ? '充值门店正常营业，按规则清算'
                : '充值门店已撤店，触发异常处理'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h5 className="text-sm font-medium text-gray-700 mb-3">交易信息</h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">会员</p>
              <p className="font-medium text-gray-900">{transaction.memberName}</p>
              <p className="text-xs text-gray-400 font-mono">
                {maskCardNumber(transaction.cardNumber)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">消费金额</p>
              <p className="font-bold text-lg font-mono text-gray-900">
                {formatCurrency(transaction.totalAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h5 className="text-sm font-medium text-gray-700 mb-3">余额分层使用</h5>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-700">本金</span>
              </div>
              <span className="font-mono text-sm font-medium">
                {formatCurrency(transaction.principalUsed)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-gray-700">赠金</span>
              </div>
              <span className="font-mono text-sm font-medium">
                {formatCurrency(transaction.bonusUsed)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h5 className="text-sm font-medium text-gray-700 mb-3">门店信息</h5>
          <div className="flex items-center gap-3">
            <div className="flex-1 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-1 text-xs text-blue-600 mb-1">
                <Store className="w-3 h-3" />
                充值门店
              </div>
              <p className="text-sm font-medium text-blue-900">
                {stores.find((s) => s.storeId === transaction.rechargeStoreId)?.storeName}
              </p>
              <span
                className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                  stores.find((s) => s.storeId === transaction.rechargeStoreId)?.status ===
                  'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {stores.find((s) => s.storeId === transaction.rechargeStoreId)?.status ===
                'active'
                  ? '营业中'
                  : '已撤店'}
              </span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <div className="flex-1 p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center gap-1 text-xs text-green-600 mb-1">
                <Store className="w-3 h-3" />
                消费门店
              </div>
              <p className="text-sm font-medium text-green-900">
                {stores.find((s) => s.storeId === transaction.consumeStoreId)?.storeName}
              </p>
            </div>
          </div>
        </div>

        {type === 'normal' && settlement && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h5 className="text-sm font-medium text-green-800 mb-3">清算结果 (正常流程)</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">本金划转:</span>
                <span className="font-mono font-medium text-green-900">
                  {formatCurrency(settlement.principalAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">
                  赠金成本 ({(BONUS_COST_RATE * 100).toFixed(0)}%):
                </span>
                <span className="font-mono font-medium text-green-900">
                  {formatCurrency(settlement.bonusAmount * BONUS_COST_RATE)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-green-200">
                <span className="font-medium text-green-800">清算总金额:</span>
                <span className="font-mono font-bold text-green-900">
                  {formatCurrency(settlement.totalSettlement)}
                </span>
              </div>
            </div>
          </div>
        )}

        {type === 'closed' && (
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <h5 className="text-sm font-medium text-red-800 mb-3">
              异常处理 (门店撤店规则)
            </h5>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">
                    {getExceptionLabel(transaction.exceptionType || '')}
                  </p>
                  <p className="text-red-600 mt-1">{transaction.exceptionNote}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-red-200">
                <div className="flex justify-between">
                  <span className="text-red-700">本金原路退回:</span>
                  <span className="font-mono font-medium text-green-700">
                    {formatCurrency(transaction.principalUsed)}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-red-700">赠金清零:</span>
                  <span className="font-mono font-medium text-red-600">
                    -{formatCurrency(transaction.bonusUsed)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-gray-400">
          <FileText className="w-3 h-3" />
          <span>数据来源: {transaction.source}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-6">
      <SampleCard
        title="样例一: 正常跨店消费"
        type="normal"
        transaction={normalTransaction}
        settlement={normalSettlement}
      />
      <SampleCard
        title="样例二: 门店撤店场景"
        type="closed"
        transaction={closedTransaction}
        settlement={closedSettlement}
      />
    </div>
  );
};

export default SampleComparison;
