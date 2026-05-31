import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

export function FeedbackToast() {
  const latestFeedback = useGameStore((state) => state.latestFeedback);
  const feedbackType = useGameStore((state) => state.feedbackType);
  const clearFeedback = useGameStore((state) => state.clearFeedback);

  useEffect(() => {
    if (latestFeedback) {
      const timer = setTimeout(() => {
        clearFeedback();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [latestFeedback, clearFeedback]);

  const getIcon = () => {
    switch (feedbackType) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  const getColors = () => {
    switch (feedbackType) {
      case 'success':
        return 'bg-emerald-600 border-emerald-500';
      case 'error':
        return 'bg-red-600 border-red-500';
      case 'warning':
        return 'bg-amber-600 border-amber-500';
      default:
        return 'bg-blue-600 border-blue-500';
    }
  };

  return (
    <AnimatePresence>
      {latestFeedback && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-full px-4"
        >
          <div
            className={`${getColors()} border-l-4 rounded-lg p-4 shadow-2xl backdrop-blur-sm`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl text-white shrink-0">{getIcon()}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm leading-relaxed">{latestFeedback}</p>
              </div>
              <button
                onClick={clearFeedback}
                className="text-white/70 hover:text-white transition-colors shrink-0"
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
