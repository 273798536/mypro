import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { ErrorRecord } from '@/types';

interface ErrorListProps {
  errors: ErrorRecord[];
}

const errorTypeLabels: Record<string, { label: string; color: string; icon: string }> = {
  duration_mismatch: { label: '久期不匹配', color: 'text-amber-400', icon: '📋' },
  curve_direction: { label: '曲线方向错误', color: 'text-sky-400', icon: '📈' },
  cashflow_weight: { label: '现金流权重误判', color: 'text-rose-400', icon: '💰' },
};

export default function ErrorList({ errors }: ErrorListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (errors.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="font-bold text-lg text-slate-200 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-emerald-400" />
          操作记录
        </h3>
        <div className="text-center py-8 text-emerald-400">
          <div className="text-4xl mb-2">🎉</div>
          <div className="font-medium">完美通关！没有任何错误</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <h3 className="font-bold text-lg text-slate-200 mb-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-rose-400" />
        错因说明
        <span className="text-sm font-normal text-slate-400 ml-auto">
          {errors.length} 次错误操作
        </span>
      </h3>

      <div className="space-y-3">
        {errors.map((error, index) => {
          const typeInfo = errorTypeLabels[error.type] || {
            label: '操作错误',
            color: 'text-slate-400',
            icon: '⚠️',
          };
          const isExpanded = expandedIndex === index;

          return (
            <motion.div
              key={index}
              className="bg-slate-700/50 rounded-xl overflow-hidden"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-700/70 transition-colors"
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
              >
                <span className="text-xl">{typeInfo.icon}</span>
                <div className="flex-1">
                  <div className={`font-medium ${typeInfo.color}`}>
                    {typeInfo.label}
                  </div>
                  <div className="text-sm text-slate-400 line-clamp-1">
                    {error.description}
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                </motion.div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-0 border-t border-slate-600">
                      <div className="mt-3 text-sm text-slate-300">
                        <div className="text-slate-400 mb-1">错误详情：</div>
                        <p>{error.description}</p>
                      </div>
                      <div className="mt-3 text-sm">
                        <div className="text-emerald-400 mb-1">修正建议：</div>
                        <p className="text-slate-300">{error.suggestion}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
