import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, AlertTriangle, FileText } from 'lucide-react';
import { RuleViolation, Conflict } from '@/types';
import { ruleEngine } from '@/engine/ruleEngine';

interface FailureModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: string;
  violations: RuleViolation[];
  conflicts: Conflict[];
  onViewEvidence: () => void;
}

export default function FailureModal({
  isOpen,
  onClose,
  reason,
  violations,
  conflicts,
  onViewEvidence,
}: FailureModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="bg-port-red text-white p-6">
              <div className="flex items-center gap-3">
                <XCircle size={32} />
                <div>
                  <h3 className="text-xl font-bold">判定错误</h3>
                  <p className="text-white/80 text-sm">{reason}</p>
                </div>
              </div>
            </div>

            <div className="p-6 max-h-80 overflow-y-auto">
              {violations.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-port-yellow" />
                    违反规则
                  </h4>
                  <ul className="space-y-2">
                    {violations.map((v, i) => (
                      <li key={i} className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        <span className="font-medium">{v.description}</span>
                        <p className="text-xs text-gray-400 mt-1">证据: {v.evidence}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {conflicts.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-port-red" />
                    冲突记录
                  </h4>
                  <ul className="space-y-2">
                    {conflicts.map((c, i) => (
                      <li key={i} className="text-sm text-gray-600 bg-port-red/5 p-3 rounded border border-port-red/20">
                        <span className="font-medium text-port-red">
                          {ruleEngine.getConflictTypeLabel(c.type)}
                        </span>
                        <p className="mt-1">{c.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t flex gap-3">
              <button
                onClick={onViewEvidence}
                className="flex-1 py-2 px-4 bg-port-blue text-white rounded-lg font-medium hover:bg-port-blue/90 transition-colors flex items-center justify-center gap-2"
              >
                <FileText size={18} />
                查看证据详情
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                继续游戏
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
