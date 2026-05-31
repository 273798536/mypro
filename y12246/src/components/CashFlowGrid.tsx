import React from 'react';
import { Wallet, TrendingUp, ArrowRightLeft, CheckCircle } from 'lucide-react';
import { useGameStore, useCurrentLevel } from '../store/gameStore';
import { getStatusColor, getStatusText } from '../utils/rulesEngine';
import { CashFlowType } from '../types';

const CashFlowGrid: React.FC = () => {
  const level = useCurrentLevel();
  const cashFlows = useGameStore(state => state.cashFlows);
  const selectCashFlow = useGameStore(state => state.selectCashFlow);

  if (!level) return null;

  const getTypeIcon = (type: CashFlowType) => {
    switch (type) {
      case 'coupon':
        return <TrendingUp className="w-4 h-4" />;
      case 'principal':
        return <Wallet className="w-4 h-4" />;
      case 'put':
        return <ArrowRightLeft className="w-4 h-4" />;
      default:
        return <Wallet className="w-4 h-4" />;
    }
  };

  const getTypeName = (type: CashFlowType) => {
    switch (type) {
      case 'coupon':
        return '付息';
      case 'principal':
        return '本金兑付';
      case 'put':
        return '回售';
      default:
        return type;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">现金流格</h3>
        </div>
        <div className="flex gap-2">
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">点击可选中</span>
        </div>
      </div>

      <div className="grid gap-3">
        {cashFlows.map((cf) => (
          <div
            key={cf.id}
            onClick={() => selectCashFlow(cf.id)}
            className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-md ${
              cf.isSelected
                ? 'border-amber-500 bg-amber-50'
                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  cf.type === 'coupon' ? 'bg-blue-100 text-blue-600' :
                  cf.type === 'principal' ? 'bg-green-100 text-green-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {getTypeIcon(cf.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">
                      第{cf.period}期 - {getTypeName(cf.type)}
                    </span>
                    {cf.isSelected && (
                      <CheckCircle className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    原日期：{cf.originalDate}
                    {cf.date !== cf.originalDate && (
                      <span className="text-amber-600 ml-2">→ 现日期：{cf.date}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-gray-800">
                  ¥{cf.expectedAmount.toFixed(2)}
                </div>
                {cf.actualAmount !== undefined && (
                  <div className="text-sm text-green-600">
                    实际：¥{cf.actualAmount.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(cf.status)}`}>
                {getStatusText(cf.status)}
              </span>
              {cf.date !== cf.originalDate && (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  日期已调整
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-100 rounded" />
            <span>付息</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-100 rounded" />
            <span>本金兑付</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-100 rounded" />
            <span>回售</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowGrid;
