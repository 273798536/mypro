import React from 'react';
import { AlertOctagon, User, Calendar } from 'lucide-react';
import { useGameEngine } from '../hooks/useGameEngine';
import { motion, AnimatePresence } from 'framer-motion';

export const LiquidationLog: React.FC = () => {
  const { state } = useGameEngine();
  const { liquidationRecords } = state;

  if (liquidationRecords.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertOctagon className="w-5 h-5 text-red-600" />
        <h3 className="text-lg font-bold text-gray-800">爆仓记录</h3>
        <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
          {liquidationRecords.length}次
        </span>
      </div>

      <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-thin pr-2">
        <AnimatePresence>
          {[...liquidationRecords].reverse().map((record, index) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{record.accountName}</div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>第{record.roundNumber}回合</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-600 font-mono font-bold">
                    -¥{record.lossAmount.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">亏损金额</div>
                </div>
              </div>
              <p className="text-sm text-red-700 bg-red-100 px-3 py-2 rounded">
                {record.reason}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
