import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { getConflictTypeLabel, getConflictIcon } from '../../utils/conflictDetector';
import { X } from 'lucide-react';

const AlertToast = () => {
  const { activeConflicts, resolveConflict } = useGameStore();
  const unresolvedConflicts = activeConflicts.filter((c) => !c.resolved);

  if (unresolvedConflicts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {unresolvedConflicts.slice(0, 5).map((conflict) => (
          <motion.div
            key={conflict.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`relative p-4 rounded-lg shadow-lg border ${
              conflict.severity === 'critical'
                ? 'bg-red-900/90 border-red-500 text-red-100'
                : 'bg-amber-900/90 border-amber-500 text-amber-100'
            }`}
          >
            <button
              onClick={() => resolveConflict(conflict.id)}
              className="absolute top-2 right-2 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-3">
              <span className="text-2xl">{getConflictIcon(conflict.type)}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">
                    {getConflictTypeLabel(conflict.type)}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      conflict.severity === 'critical'
                        ? 'bg-red-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {conflict.severity === 'critical' ? '严重' : '警告'}
                  </span>
                </div>
                <p className="text-xs opacity-90">{conflict.description}</p>
              </div>
            </div>

            {conflict.severity === 'critical' && (
              <motion.div
                className="absolute inset-0 rounded-lg border-2 border-red-400 pointer-events-none"
                animate={{
                  opacity: [0, 0.5, 0],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {unresolvedConflicts.length > 5 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-slate-400 text-center"
        >
          还有 {unresolvedConflicts.length - 5} 个冲突...
        </motion.div>
      )}
    </div>
  );
};

export default AlertToast;
