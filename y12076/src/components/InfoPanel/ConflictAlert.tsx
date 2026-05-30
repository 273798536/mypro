import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, CheckCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { ConfigConflict } from '../../types';
import { useConfigStore } from '../../store/useConfigStore';
import { getConflictTypeLabel, getConflictSeverity } from '../../utils/conflictDetector';
import { formatValueForDisplay, formatTime } from '../../utils/reportGenerator';

interface ConflictAlertProps {
  conflict: ConfigConflict;
}

export function ConflictAlert({ conflict }: ConflictAlertProps) {
  const [expanded, setExpanded] = useState(false);
  const { resolveConflict } = useConfigStore();
  const severity = getConflictSeverity(conflict.type);

  const severityConfig = {
    error: {
      bg: 'bg-red-900/30',
      border: 'border-red-500/50',
      icon: <AlertCircle className="w-5 h-5 text-red-400" />,
      text: 'text-red-400',
    },
    warning: {
      bg: 'bg-yellow-900/30',
      border: 'border-yellow-500/50',
      icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
      text: 'text-yellow-400',
    },
    info: {
      bg: 'bg-blue-900/30',
      border: 'border-blue-500/50',
      icon: <AlertCircle className="w-5 h-5 text-blue-400" />,
      text: 'text-blue-400',
    },
  };

  const config = severityConfig[severity];

  const handleResolve = (resolution: 'keep-A' | 'keep-B' | 'merge') => {
    resolveConflict(conflict.id, resolution);
  };

  if (conflict.resolved) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-green-900/20 border border-green-500/30 rounded-lg p-3"
      >
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-400">冲突已解决</span>
          <span className="text-xs text-slate-500 ml-auto">
            方案: {conflict.resolution === 'keep-A' ? '保留A方' : 
                   conflict.resolution === 'keep-B' ? '保留B方' : '合并'}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${config.bg} border ${config.border} rounded-lg overflow-hidden`}
    >
      <div
        className="p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {config.icon}
          <span className={`text-sm font-medium ${config.text} flex-1`}>
            {getConflictTypeLabel(conflict.type)}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1">{conflict.description}</p>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/50 rounded p-2">
                  <div className="text-xs font-medium text-slate-300 mb-1">
                    🅰️ {conflict.sideA.source}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {formatValueForDisplay(conflict.sideA.value)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {formatTime(conflict.sideA.timestamp)}
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded p-2">
                  <div className="text-xs font-medium text-slate-300 mb-1">
                    🅱️ {conflict.sideB.source}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {formatValueForDisplay(conflict.sideB.value)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {formatTime(conflict.sideB.timestamp)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleResolve('keep-A'); }}
                  className="flex-1 py-1.5 px-2 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors"
                >
                  保留A方
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleResolve('keep-B'); }}
                  className="flex-1 py-1.5 px-2 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors"
                >
                  保留B方
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleResolve('merge'); }}
                  className="flex-1 py-1.5 px-2 bg-cyan-600 hover:bg-cyan-500 rounded text-xs text-white transition-colors"
                >
                  合并两者
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
