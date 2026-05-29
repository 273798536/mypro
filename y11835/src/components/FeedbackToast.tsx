import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import type { FeedbackMessage } from '@/types/quantum';

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const colorMap = {
  success: 'border-green-500/40 bg-green-500/10',
  error: 'border-red-500/40 bg-red-500/10',
  info: 'border-cyan-500/40 bg-cyan-500/10',
};

const iconColorMap = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-cyan-400',
};

export default function FeedbackToast({
  feedbacks,
  onDismiss,
}: {
  feedbacks: FeedbackMessage[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      <AnimatePresence>
        {feedbacks.slice(0, 3).map((fb) => {
          const Icon = iconMap[fb.type];
          return (
            <motion.div
              key={fb.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className={`
                pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border
                backdrop-blur-md max-w-md
                ${colorMap[fb.type]}
              `}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColorMap[fb.type]}`} />
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">{fb.title}</div>
                <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{fb.detail}</div>
              </div>
              <button
                onClick={() => onDismiss(fb.id)}
                className="shrink-0 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
