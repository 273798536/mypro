import React, { useState } from 'react';
import { Plus, Minus, X, SkipForward, AlertCircle } from 'lucide-react';
import { useGameEngine } from '../hooks/useGameEngine';
import { motion, AnimatePresence } from 'framer-motion';

export const TradingCards: React.FC = () => {
  const { state, addMarginToSafe, partialCloseHalf, fullClose, skipOperation, getSelectedAccount } = useGameEngine();
  const [showConfirm, setShowConfirm] = useState(false);
  const selectedAccount = getSelectedAccount();
  const isPlaying = state.status === 'playing';
  const hasSelection = selectedAccount !== null;

  const handleAddMargin = () => {
    if (!selectedAccount) return;
    setShowConfirm(true);
  };

  const confirmAddMargin = () => {
    if (!selectedAccount) return;
    addMarginToSafe(selectedAccount.id);
    setShowConfirm(false);
  };

  const handlePartialClose = () => {
    if (!selectedAccount) return;
    partialCloseHalf(selectedAccount.id);
  };

  const handleFullClose = () => {
    if (!selectedAccount) return;
    fullClose(selectedAccount.id);
  };

  const cards = [
    {
      id: 'add_margin',
      icon: Plus,
      label: '追加保证金',
      description: '向账户注入资金，降低风险度',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      action: handleAddMargin,
      disabled: !hasSelection || selectedAccount?.availableCapital === 0,
    },
    {
      id: 'partial_close',
      icon: Minus,
      label: '部分平仓',
      description: '平掉一半持仓，释放保证金',
      color: 'bg-yellow-500',
      hoverColor: 'hover:bg-yellow-600',
      action: handlePartialClose,
      disabled: !hasSelection || selectedAccount?.positions.length === 0,
    },
    {
      id: 'full_close',
      icon: X,
      label: '全部平仓',
      description: '平掉所有持仓，立即止损',
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      action: handleFullClose,
      disabled: !hasSelection || selectedAccount?.positions.length === 0,
    },
    {
      id: 'skip',
      icon: SkipForward,
      label: '跳过本回合',
      description: '不进行操作，进入下一回合',
      color: 'bg-gray-500',
      hoverColor: 'hover:bg-gray-600',
      action: skipOperation,
      disabled: false,
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">交易操作</h3>
      
      {!hasSelection && isPlaying && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm text-blue-700">
          <AlertCircle className="w-4 h-4" />
          <span>请先选择一个客户账户进行操作</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <motion.button
            key={card.id}
            whileHover={!card.disabled ? {} : { scale: 1.02 }}
            whileTap={!card.disabled ? {} : { scale: 0.98 }}
            onClick={card.action}
            disabled={card.disabled || !isPlaying}
            className={`${card.color} ${card.hoverColor} text-white p-4 rounded-xl transition-all ${
              card.disabled || !isPlaying
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer shadow-md hover:shadow-lg'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <card.icon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold">{card.label}</div>
                <div className="text-xs opacity-90">{card.description}</div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {showConfirm && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl"
        >
          <p className="text-sm text-blue-800 mb-3">
            确定要为 <strong>{selectedAccount?.name}</strong> 追加保证金至安全线？
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmAddMargin}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              确认
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
            >
              取消
            </button>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
