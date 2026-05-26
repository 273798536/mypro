import { AnimatePresence, motion } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export function ToastContainer() {
  const { toasts, removeToast } = useGameStore();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] ${
              toast.type === 'error'
                ? 'bg-status-error text-white'
                : toast.type === 'warning'
                ? 'bg-status-warning text-gray-900'
                : 'bg-status-success text-white'
            }`}
          >
            {toast.type === 'error' && <AlertCircle size={20} />}
            {toast.type === 'warning' && <AlertTriangle size={20} />}
            {toast.type === 'success' && <CheckCircle size={20} />}
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="hover:opacity-80 transition-opacity"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
