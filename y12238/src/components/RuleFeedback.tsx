import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { RuleFeedback as RuleFeedbackType } from '@/types';

interface RuleFeedbackProps {
  feedback: RuleFeedbackType | null;
}

export default function RuleFeedback({ feedback }: RuleFeedbackProps) {
  if (!feedback) return null;

  const getIcon = () => {
    switch (feedback.type) {
      case 'success':
        return <CheckCircle size={20} className="text-port-green" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-port-yellow" />;
      case 'error':
        return <XCircle size={20} className="text-port-red" />;
    }
  };

  const getBgColor = () => {
    switch (feedback.type) {
      case 'success':
        return 'bg-port-green/10 border-port-green/30';
      case 'warning':
        return 'bg-port-yellow/10 border-port-yellow/30';
      case 'error':
        return 'bg-port-red/10 border-port-red/30';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className={`
          fixed bottom-4 left-1/2 -translate-x-1/2 z-50
          px-6 py-3 rounded-lg border-2 ${getBgColor()}
          shadow-lg backdrop-blur-sm
        `}
      >
        <div className="flex items-center gap-3">
          {getIcon()}
          <div>
            <p className="font-medium">{feedback.message}</p>
            {feedback.details && (
              <p className="text-sm text-gray-500 mt-1">{feedback.details}</p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
