import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { useGameEngine } from '../hooks/useGameEngine';
import { motion } from 'framer-motion';
import { MarginBar } from './MarginBar';
import { GAME_CONFIG } from '../constants/gameConfig';

export const ForceCloseQueue: React.FC = () => {
  const { state, selectAccount } = useGameEngine();
  const { forceCloseQueue } = state;

  if (forceCloseQueue.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-4 overflow-hidden"
    >
      <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="font-bold text-red-800">强平队列</h3>
        <p className="text-sm text-red-600">
          以下账户风险度超过 {GAME_CONFIG.DANGER_THRESHOLD}%，必须立即处理！
        </p>
      </div>
      </div>

      <div className="space-y-2">
        {forceCloseQueue.map((account, index) => (
          <motion.div
            key={account.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => selectAccount(account.id)}
            className="bg-white border border-red-200 rounded-lg p-3 cursor-pointer hover:bg-red-50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                {index + 1}
              </span>
              <span className="font-semibold text-gray-800">{account.name}</span>
            </div>
            <div className="text-sm text-gray-600">优先级：风险度 {account.riskLevel.toFixed(1)}%</div>
          </div>
          <MarginBar riskLevel={account.riskLevel} status={account.status} size="sm" showLabel={false} />
        </motion.div>
      ))}
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-red-600 bg-red-100 p-2 rounded">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          强平规则：按风险度从高到低排序，优先处理风险最高的账户。如未及时处理，系统将自动强平。
        </span>
      </div>
    </motion.div>
  );
};
