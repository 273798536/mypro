import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { usePartitionStore } from '../../store/usePartitionStore';
import { WarningItem } from './WarningItem';

export function PendingArea() {
  const problems = usePartitionStore(state => state.problems);

  const allWarnings = problems.flatMap(p =>
    p.warnings
      .filter(w => !w.confirmed)
      .map(w => ({ ...w, problemLineNumber: p.input.lineNumber }))
  );

  if (allWarnings.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="card mt-4 border-amber-200"
    >
      <div className="card-header bg-gradient-to-r from-amber-50 to-white border-b-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-amber-800">待确认区</h2>
              <p className="text-xs text-amber-600">
                请检查以下异常情况
              </p>
            </div>
          </div>
          <span className="badge badge-warning">
            {allWarnings.length} 项
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
        <AnimatePresence>
          {allWarnings.map((warning) => (
            <WarningItem
              key={warning.id}
              warning={warning}
              problemLineNumber={warning.problemLineNumber}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
