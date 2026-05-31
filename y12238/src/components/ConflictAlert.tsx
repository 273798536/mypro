import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Conflict } from '@/types';
import { ruleEngine } from '@/engine/ruleEngine';

interface ConflictAlertProps {
  conflict: Conflict;
  onClose: () => void;
  onViewEvidence: () => void;
}

export default function ConflictAlert({ conflict, onClose, onViewEvidence }: ConflictAlertProps) {
  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="fixed right-4 top-4 z-50 w-80 bg-port-red/95 text-white rounded-lg shadow-xl p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} />
          <span className="font-bold">{ruleEngine.getConflictTypeLabel(conflict.type)}</span>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 rounded p-1">
          <X size={16} />
        </button>
      </div>
      <p className="text-sm mb-3">{conflict.description}</p>
      <button
        onClick={onViewEvidence}
        className="w-full py-2 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
      >
        查看详细证据
      </button>
    </motion.div>
  );
}
