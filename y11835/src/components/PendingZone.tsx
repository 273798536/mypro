import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useState } from 'react';
import type { PendingConfirmation, WarningType } from '@/types/quantum';

const typeConfig: Record<WarningType, { icon: string; color: string }> = {
  PROBABILITY_NOT_NORMALIZED: { icon: '📊', color: 'border-amber-500/50 bg-amber-500/10' },
  BASIS_CONFUSION: { icon: '🔄', color: 'border-orange-500/50 bg-orange-500/10' },
  NO_EXPERIMENT_HISTORY: { icon: '📋', color: 'border-yellow-500/50 bg-yellow-500/10' },
};

export default function PendingZone({
  warnings,
  onConfirm,
}: {
  warnings: PendingConfirmation[];
  onConfirm: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const unconfirmed = warnings.filter((w) => !w.confirmed);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-medium text-amber-300">待确认区</span>
        {unconfirmed.length > 0 && (
          <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-300">
            {unconfirmed.length}
          </span>
        )}
      </div>

      {warnings.length === 0 && (
        <p className="text-xs text-slate-600">暂无警告项</p>
      )}

      <AnimatePresence>
        {warnings.map((w) => {
          const config = typeConfig[w.type];
          const isExpanded = expanded[w.id];
          return (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`rounded-lg border p-3 ${config.color} ${
                w.confirmed ? 'opacity-50' : ''
              }`}
            >
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setExpanded((prev) => ({ ...prev, [w.id]: !prev[w.id] }))}
              >
                <span className="text-sm">{config.icon}</span>
                <span className="text-xs font-medium text-white flex-1">{w.message}</span>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{w.detail}</p>
                    {!w.confirmed && (
                      <button
                        onClick={() => onConfirm(w.id)}
                        className="mt-2 flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium
                          bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        确认
                      </button>
                    )}
                    {w.confirmed && (
                      <span className="mt-2 inline-flex items-center gap-1 text-xs text-green-400">
                        <Check className="w-3 h-3" /> 已确认
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
