
import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Store,
  User,
  Gift,
  Wallet,
  Eye,
  Play,
} from 'lucide-react';
import { Transaction, Store as StoreType } from '../types';
import {
  formatCurrency,
  formatDate,
  maskCardNumber,
  getStatusLabel,
  getTypeLabel,
  getExceptionLabel,
} from '../utils/formatter';
import { useSettlementStore } from '../store/useSettlementStore';

interface TransactionListProps {
  transactions: Transaction[];
  stores: StoreType[];
  onSettle?: (txId: string) => void;
  onViewDetail?: (tx: Transaction) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  stores,
  onSettle,
  onViewDetail,
}) => {
  const { expandedRows, toggleRowExpand, settleTransaction } = useSettlementStore();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'settled':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'exception':
        return <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'settled':
        return 'bg-green-50 border-green-200';
      case 'exception':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getStoreName = (storeId: string) => {
    return stores.find((s) => s.storeId === storeId)?.storeName || storeId;
  };

  const getStoreStatus = (storeId: string) => {
    const store = stores.find((s) => s.storeId === storeId);
    return store?.status || 'active';
  };

  return (
    <div className="space-y-4">
      {transactions.map((tx) => {
        const isExpanded = expandedRows.has(tx.txId);
        const rechargeStoreStatus = getStoreStatus(tx.rechargeStoreId);

        return (
          <div
            key={tx.txId}
            className={`rounded-lg border transition-all duration-200 ${getStatusBg(
              tx.status
            )}`}
          >
            <div
              className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleRowExpand(tx.txId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button className="text-gray-400 hover:text-gray-600">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    {getStatusIcon(tx.status)}
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                        tx.status === 'settled'
                          ? 'bg-green-100 text-green-700'
                          : tx.status === 'exception'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {getStatusLabel(tx.status)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-mono text-gray-900">{tx.txId}</span>
                    <span className="text-gray-300">|</span>
                    <span>{getTypeLabel(tx.type)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-lg font-bold font-mono text-gray-900">
                      {formatCurrency(tx.totalAmount)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Wallet className="w-3 h-3 text-blue-500" />
                        本金 {formatCurrency(tx.principalUsed)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gift className="w-3 h-3 text-purple-500" />
                        赠金 {formatCurrency(tx.bonusUsed)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {tx.status === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          settleTransaction(tx.txId, '财务-当前用户');
                          onSettle?.(tx.txId);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        执行清算
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetail?.(tx);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      详情
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-6">
                  <span className="flex items-center gap-1 text-gray-600">
                    <User className="w-4 h-4 text-gray-400" />
                    {tx.memberName}
                    <span className="text-gray-400 font-mono ml-1">
                      ({maskCardNumber(tx.cardNumber)})
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-gray-600">
                    <Store className="w-4 h-4 text-gray-400" />
                    充值: {getStoreName(tx.rechargeStoreId)}
                    {rechargeStoreStatus === 'closed' && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded">
                        已撤店
                      </span>
                    )}
                    <span className="text-gray-300 mx-1">→</span>
                    消费: {getStoreName(tx.consumeStoreId)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs">{tx.source}</span>
                  <span className="text-gray-300 mx-2">|</span>
                  <span className="text-xs">{formatDate(tx.createdAt)}</span>
                </div>
              </div>

              {tx.exceptionType && (
                <div className="mt-3 p-3 bg-red-100 rounded border border-red-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        异常类型: {getExceptionLabel(tx.exceptionType)}
                      </p>
                      <p className="text-sm text-red-600 mt-1">
                        {tx.exceptionNote}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {isExpanded && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">交易编号</p>
                    <p className="text-sm font-mono text-gray-900">{tx.txId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">卡号</p>
                    <p className="text-sm font-mono text-gray-900">
                      {tx.cardNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">充值门店</p>
                    <p className="text-sm text-gray-900">
                      {getStoreName(tx.rechargeStoreId)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">消费门店</p>
                    <p className="text-sm text-gray-900">
                      {getStoreName(tx.consumeStoreId)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-white rounded border border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">溯源信息</p>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">数据来源: </span>
                    <span className="font-medium text-gray-900">{tx.source}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TransactionList;
