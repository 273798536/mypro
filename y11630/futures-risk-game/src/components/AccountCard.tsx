import React from 'react';
import type { Account } from '../types';
import { MarginBar } from './MarginBar';
import { getStatusLabel, getRiskTextColor } from '../utils/riskAssessor';
import { getContract } from '../utils/marginCalculator';
import { TrendingUp, TrendingDown, User, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGameEngine } from '../hooks/useGameEngine';

interface AccountCardProps {
  account: Account;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  isSelected = false,
  onSelect,
}) => {
  const { state } = useGameEngine();
  const isPlaying = state.status === 'playing';
  const isLiquidated = account.status === 'liquidated';

  const getBorderColor = () => {
    if (isSelected) return 'border-blue-500 ring-2 ring-blue-200';
    if (isLiquidated) return 'border-gray-400 opacity-60';
    if (account.status === 'danger') return 'border-red-500 animate-pulse';
    if (account.status === 'warning') return 'border-yellow-500';
    return 'border-green-500';
  };

  const getStatusIcon = () => {
    if (isLiquidated) return <XCircle className="w-5 h-5 text-gray-500" />;
    if (account.status === 'danger') return <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />;
    if (account.status === 'warning') return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={isPlaying && !isLiquidated ? { scale: 1.02 } : {}}
      onClick={isPlaying && !isLiquidated ? onSelect : undefined}
      className={`bg-white rounded-xl border-2 ${getBorderColor()} p-5 shadow-md transition-all cursor-pointer ${
        isPlaying && !isLiquidated ? 'hover:shadow-lg' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-primary-700" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">{account.name}</h3>
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              <span className={`text-sm font-medium ${getRiskTextColor(account.status)}`}>
                {getStatusLabel(account.status)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">账户权益</span>
          <span className="font-mono font-semibold text-gray-900">
            ¥{account.equity.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">可用资金</span>
          <span className="font-mono font-semibold text-blue-600">
            ¥{account.availableCapital.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">占用保证金</span>
          <span className="font-mono font-semibold text-gray-700">
            ¥{account.marginBalance.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">浮动盈亏</span>
          <span className={`font-mono font-semibold ${
            account.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {account.unrealizedPnL >= 0 ? '+' : ''}¥{account.unrealizedPnL.toLocaleString()}
          </span>
        </div>
      </div>

      <MarginBar riskLevel={account.riskLevel} status={account.status} size="md" />

      {account.positions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">持仓明细</h4>
          <div className="space-y-2">
            {account.positions.map((pos) => {
              const contract = getContract(pos.contractCode);
              const pnlPercent = ((pos.currentPrice - pos.openPrice) / pos.openPrice) * 100 * 
                (pos.direction === 'long' ? 1 : -1);
              
              return (
                <div key={pos.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    {pos.direction === 'long' ? (
                      <TrendingUp className="w-4 h-4 text-red-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-green-500" />
                    )}
                    <span className="text-sm font-medium">
                      {contract?.name || pos.contractCode} {pos.direction === 'long' ? '多' : '空'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">{pos.volume}手</div>
                    <div className={`text-xs font-mono ${
                      pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isSelected && (
        <div className="mt-4 pt-4 border-t border-blue-200 bg-blue-50 -mx-5 -mb-5 px-5 py-4 rounded-b-xl">
          <p className="text-sm text-blue-700 font-medium">
            已选择此账户，请在下方选择操作
          </p>
        </div>
      )}
    </motion.div>
  );
};
