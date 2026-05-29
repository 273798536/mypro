import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { usePartitionStore } from '../../store/usePartitionStore';
import { ErrorItem } from './ErrorItem';

export function ErrorArea() {
  const errors = usePartitionStore(state => state.errors);

  if (errors.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="card mt-4"
    >
      <div className="card-header bg-gradient-to-r from-red-50 to-white border-b-red-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-semibold text-red-800">错误输入区</h2>
              <p className="text-xs text-red-600">
                以下输入无法解析
              </p>
            </div>
          </div>
          <span className="badge badge-error">
            {errors.length} 项
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
        <AnimatePresence>
          {errors.map((error) => (
            <ErrorItem key={error.id} error={error} />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
