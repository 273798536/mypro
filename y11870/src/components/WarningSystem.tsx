import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X, AlertCircle } from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';

export function WarningSystem() {
  const allWarnings = useSimulationStore((state) => state.warnings);
  const dismissWarning = useSimulationStore((state) => state.dismissWarning);
  const clearWarnings = useSimulationStore((state) => state.clearWarnings);

  const activeWarnings = allWarnings.filter((w) => !w.dismissed);

  if (activeWarnings.length === 0) return null;

  const errors = activeWarnings.filter((w) => w.severity === 'error');
  const warningsOnly = activeWarnings.filter((w) => w.severity === 'warning');

  return (
    <div className="fixed top-4 right-4 z-50 w-96 space-y-2">
      <AnimatePresence>
        {errors.map((warning) => (
          <motion.div
            key={warning.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="bg-red-900 border-2 border-red-500 rounded-lg shadow-lg overflow-hidden"
          >
            <div className="flex items-start p-3 gap-3">
              <div className="flex-shrink-0">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                >
                  <AlertCircle className="text-red-400" size={24} />
                </motion.div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-red-100 font-bold text-sm mb-1">错误</p>
                <p className="text-red-200 text-xs break-words">{warning.message}</p>
                {warning.location && (
                  <p className="text-red-300 text-xs mt-1">
                    位置: ({warning.location.x}, {warning.location.y})
                  </p>
                )}
              </div>
              <button
                onClick={() => dismissWarning(warning.id)}
                className="flex-shrink-0 p-1 hover:bg-red-800 rounded transition-colors"
              >
                <X size={16} className="text-red-300" />
              </button>
            </div>
            <motion.div
              className="h-1 bg-red-400"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 10, ease: 'linear' }}
            />
          </motion.div>
        ))}

        {warningsOnly.map((warning) => (
          <motion.div
            key={warning.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="bg-yellow-900 border border-yellow-600 rounded-lg shadow-lg"
          >
            <div className="flex items-start p-3 gap-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="text-yellow-400" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-yellow-100 font-medium text-sm mb-1">警告</p>
                <p className="text-yellow-200 text-xs break-words">{warning.message}</p>
                {warning.location && (
                  <p className="text-yellow-300 text-xs mt-1">
                    位置: ({warning.location.x}, {warning.location.y})
                  </p>
                )}
              </div>
              <button
                onClick={() => dismissWarning(warning.id)}
                className="flex-shrink-0 p-1 hover:bg-yellow-800 rounded transition-colors"
              >
                <X size={14} className="text-yellow-300" />
              </button>
            </div>
          </motion.div>
        ))}

        {activeWarnings.length > 1 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={clearWarnings}
            className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded transition-colors"
          >
            清除所有警告
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export function WarningBanner() {
  const allWarnings = useSimulationStore((state) => state.warnings);
  const activeWarnings = allWarnings.filter((w) => !w.dismissed);

  if (activeWarnings.length === 0) return null;

  const hasErrors = activeWarnings.some((w) => w.severity === 'error');
  const hasWarnings = activeWarnings.some((w) => w.severity === 'warning');
  const count = activeWarnings.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed top-0 left-0 right-0 z-40 py-2 px-4 text-center text-sm font-medium ${
        hasErrors
          ? 'bg-red-600 text-white'
          : hasWarnings
          ? 'bg-yellow-600 text-white'
          : 'bg-orange-600 text-white'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        <AlertTriangle size={16} />
        <span>
          检测到 {count} 个问题
          {hasErrors && '（含严重错误）'} - 请查看右上角警告详情
        </span>
      </div>
    </motion.div>
  );
}
