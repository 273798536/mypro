import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';

export default function FeedbackToast() {
  const feedback = useGameStore(state => state.feedback);
  const clearFeedback = useGameStore(state => state.clearFeedback);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        clearFeedback();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback, clearFeedback]);

  return (
    <AnimatePresence>
      {feedback && (
        <motion.div
          className={`
            fixed top-4 left-1/2 -translate-x-1/2 z-50
            flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg
            ${feedback.type === 'success' ? 'bg-emerald-500' : ''}
            ${feedback.type === 'error' ? 'bg-rose-500' : ''}
            ${feedback.type === 'info' ? 'bg-slate-700' : ''}
          `}
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            x: ['-50%', '-48%', '-52%', '-50%'],
          }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 25,
          }}
        >
          {feedback.type === 'success' && (
            <CheckCircle className="w-5 h-5 text-white" />
          )}
          {feedback.type === 'error' && (
            <XCircle className="w-5 h-5 text-white" />
          )}
          {feedback.type === 'info' && (
            <Info className="w-5 h-5 text-white" />
          )}
          <span className="text-white font-medium text-sm">
            {feedback.message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
