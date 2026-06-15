import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, MapPin, X, Eye } from 'lucide-react';
import type { ConflictGroup } from '@/types';
import { useGisStore } from '@/store/useGisStore';

interface ConflictAlertProps {
  isOpen: boolean;
  conflictGroup: ConflictGroup | null;
  onClose: () => void;
}

export default function ConflictAlert({
  isOpen,
  conflictGroup,
  onClose,
}: ConflictAlertProps) {
  const highlightPoint = useGisStore((state) => state.highlightPoint);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleViewGisPoints = () => {
    if (conflictGroup && conflictGroup.points.length > 0) {
      highlightPoint(conflictGroup.points[0].id);
    }
    onClose();
  };

  if (!conflictGroup) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
              duration: 0.3,
              type: 'spring',
              damping: 20,
              stiffness: 300,
            }}
            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="bg-danger-500 bg-striped-danger px-6 py-5 border-b border-danger-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">街口冲突检测</h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 max-h-96 overflow-y-auto">
              <div className="mb-5 p-4 bg-danger-50 dark:bg-danger-900/20 rounded-xl border border-danger-200 dark:border-danger-800">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-danger-600 dark:text-danger-400" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {conflictGroup.street}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  检测到 <span className="font-bold text-danger-600 dark:text-danger-400">{conflictGroup.points.length}</span> 个点位存在冲突
                </p>
              </div>

              <div className="space-y-3">
                {conflictGroup.points.map((point, index) => (
                  <motion.div
                    key={point.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-7 h-7 bg-danger-100 dark:bg-danger-900/50 text-danger-600 dark:text-danger-400 rounded-full text-sm font-bold">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          点位 ID
                        </span>
                      </div>
                      <code className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
                        {point.id}
                      </code>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">来源：</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {point.source}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">状态：</span>
                        <span className="text-danger-600 dark:text-danger-400 font-medium">
                          冲突
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500 dark:text-gray-400">坐标：</span>
                        <code className="ml-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
                          {point.lng.toFixed(6)}, {point.lat.toFixed(6)}
                        </code>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                关闭
              </button>
              <button
                onClick={handleViewGisPoints}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white bg-municipal-600 hover:bg-municipal-700 transition-colors"
              >
                <Eye className="w-4 h-4" />
                查看GIS点位
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
