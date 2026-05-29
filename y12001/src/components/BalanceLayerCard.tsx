
import React from 'react';
import { Wallet, Gift, Lock, Info } from 'lucide-react';
import { BalanceLayer } from '../types';
import { formatCurrency, maskCardNumber, formatShortDate } from '../utils/formatter';

interface BalanceLayerCardProps {
  balance: BalanceLayer;
}

const BalanceLayerCard: React.FC<BalanceLayerCardProps> = ({ balance }) => {
  const totalAvailable = balance.principal + balance.bonus;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{balance.memberName}</h3>
          <p className="text-sm text-gray-500 font-mono">
            {maskCardNumber(balance.cardNumber)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">数据来源</p>
          <p className="text-sm text-gray-600">{balance.lastUpdatedSource}</p>
          <p className="text-xs text-gray-400 mt-1">
            {formatShortDate(balance.updatedAt)}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-1">可用余额</p>
        <p className="text-3xl font-bold text-gray-900 font-mono">
          {formatCurrency(totalAvailable)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">本金</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 font-mono">
            {formatCurrency(balance.principal)}
          </p>
          <p className="text-xs text-blue-600 mt-1">可退款、可跨店</p>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-300">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">赠金</span>
          </div>
          <p className="text-2xl font-bold text-purple-900 font-mono">
            {formatCurrency(balance.bonus)}
          </p>
          <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
            <Info className="w-3 h-3" />
            不可退款
          </p>
        </div>

        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">冻结</span>
          </div>
          <p className="text-2xl font-bold text-amber-900 font-mono">
            {formatCurrency(balance.frozen)}
          </p>
          <p className="text-xs text-amber-600 mt-1">待清算</p>
        </div>
      </div>
    </div>
  );
};

export default BalanceLayerCard;
