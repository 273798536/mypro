import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { ErrorType } from '@/types/game';
import { errorExplanations } from '@/game/explanations';

interface FeedbackModalProps {
  isVisible: boolean;
  type: 'success' | 'error';
  message: string;
  errorType?: ErrorType;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isVisible,
  type,
  message,
  errorType,
  onClose,
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, errorType === 'missedOriginal' ? 4000 : 2500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, errorType, onClose]);

  const isSevereError = errorType === 'missedOriginal';

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {isSevereError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 pointer-events-none z-40"
              style={{
                boxShadow: 'inset 0 0 100px 50px rgba(220, 38, 38, 0.5)',
                animation: 'pulse-border 0.5s ease-in-out infinite',
              }}
            />
          )}

          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 max-w-md w-full mx-4 p-6 rounded-2xl shadow-2xl border-2 ${
              type === 'success'
                ? 'bg-green-900/95 border-green-500'
                : isSevereError
                ? 'bg-red-950/98 border-red-500'
                : 'bg-red-900/95 border-red-600'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 p-2 rounded-full ${
                type === 'success' ? 'bg-green-800' : 'bg-red-800'
              }`}>
                {type === 'success' ? (
                  <CheckCircle className="w-8 h-8 text-green-400" />
                ) : isSevereError ? (
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-400" />
                )}
              </div>

              <div className="flex-1">
                <h3 className={`text-lg font-bold mb-2 ${
                  type === 'success' ? 'text-green-300' : 'text-red-300'
                }`}>
                  {type === 'success' ? '✓ 操作正确！' : errorType ? errorExplanations[errorType].title : '操作错误'}
                </h3>
                
                <p className="text-gray-300 text-sm leading-relaxed">
                  {message}
                </p>

                {errorType && (
                  <div className="mt-3 pt-3 border-t border-red-800">
                    <p className="text-xs text-red-400 font-semibold">
                      影响：{errorExplanations[errorType].impact}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
