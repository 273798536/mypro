import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActionRecord, ERROR_MESSAGES, EXIT_LABELS } from '../types';
import { AlertTriangle, X } from 'lucide-react';

interface ErrorToastProps {
  error: ActionRecord | null;
  onDismiss: () => void;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({ error, onDismiss }) => {
  if (!error || error.errorType === 'none') return null;

  const errorInfo = ERROR_MESSAGES[error.errorType as keyof typeof ERROR_MESSAGES];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
      >
        <div className="bg-white rounded-xl shadow-2xl border-2 border-warning-400 overflow-hidden animate-shake">
          <div className="bg-warning-500 text-white px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} />
              <span className="font-bold">{errorInfo.title}</span>
            </div>
            <button
              onClick={onDismiss}
              className="hover:bg-warning-600 rounded p-1 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-4">
            <p className="text-gray-700 text-sm mb-3">{errorInfo.description}</p>
            <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">航班号:</span>
                <span className="font-mono font-medium">{error.flightNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">你的选择:</span>
                <span className="text-red-600 font-medium">{EXIT_LABELS[error.selectedExit]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">正确路径:</span>
                <span className="text-success-600 font-medium">{EXIT_LABELS[error.correctExit]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">本次扣分:</span>
                <span className="text-red-600 font-bold">{error.scoreChange}分</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
