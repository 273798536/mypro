import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, XCircle, ChevronDown, ChevronUp, Target, Lightbulb, GitCompare } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { ValidationError, ValidationErrorType } from '@/types';
import { cn } from '@/utils/helpers';

const errorTypeConfig: Record<ValidationErrorType, { label: string; color: string; icon: any }> = {
  VERSION_MISMATCH: {
    label: '时长版本错',
    color: 'text-amber-400',
    icon: AlertTriangle
  },
  ENCORE_OVERLIMIT: {
    label: '返场超限',
    color: 'text-rose-400',
    icon: XCircle
  },
  TRANSITION_MISSING: {
    label: '换场遗漏',
    color: 'text-amber-400',
    icon: AlertTriangle
  }
};

interface ErrorItemProps {
  error: ValidationError;
  index: number;
}

function ErrorItem({ error, index }: ErrorItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { highlightTrack } = useStore();
  const config = errorTypeConfig[error.type];
  const Icon = config.icon;

  const handleLocate = () => {
    if (error.trackId) {
      highlightTrack(error.trackId);
      const element = document.querySelector(`[data-track-id="${error.trackId}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'rounded-lg border overflow-hidden',
        error.severity === 'error'
          ? 'bg-rose-500/10 border-rose-500/30'
          : 'bg-amber-500/10 border-amber-500/30'
      )}
    >
      <div
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={cn(
          'p-1.5 rounded-lg mt-0.5',
          error.severity === 'error' ? 'bg-rose-500/20' : 'bg-amber-500/20'
        )}>
          <Icon className={cn('w-4 h-4', config.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
              error.severity === 'error' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
            )}>
              {error.severity === 'error' ? '错误' : '警告'}
            </span>
            <span className="text-xs text-gray-400">{config.label}</span>
          </div>
          <p className="text-sm mt-1">{error.message}</p>
        </div>

        <button className="p-1 hover:bg-white/10 rounded transition-colors">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-2 border-t border-white/10">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">建议方案</p>
                    <p className="text-sm text-gray-300">{error.suggestion}</p>
                  </div>
                </div>

                {error.trackId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLocate();
                    }}
                    className="flex items-center gap-2 w-full mt-2 px-3 py-2 bg-indigo-800 hover:bg-indigo-700 rounded-lg text-sm transition-colors"
                  >
                    <Target className="w-4 h-4 text-amber-450" />
                    <span>定位到具体曲目</span>
                  </button>
                )}

                <div className="mt-2 p-2 bg-black/20 rounded font-mono text-xs text-gray-400">
                  <p>详细信息:</p>
                  <pre className="mt-1 whitespace-pre-wrap">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ValidationPanel() {
  const { currentValidation, previousValidation, compareMode, compareVersionId, history, toggleCompare } = useStore();
  const [activeTab, setActiveTab] = useState<'all' | 'error' | 'warning'>('all');

  if (!currentValidation) {
    return (
      <div className="bg-indigo-900/30 rounded-xl p-6 border border-indigo-800 text-center text-gray-400">
        <p>请先导入曲目数据</p>
      </div>
    );
  }

  const errors = currentValidation.errors;
  const filteredErrors = errors.filter(e => {
    if (activeTab === 'all') return true;
    return e.severity === activeTab;
  });

  const compareVersion = compareMode && compareVersionId
    ? history.find(h => h.id === compareVersionId)
    : null;

  return (
    <div className="space-y-4">
      {previousValidation && (
        <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <GitCompare className="w-5 h-5 text-sky-400" />
            <span className="font-medium text-sky-400">规则变化对比</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400">之前总时长</p>
              <p className="font-mono text-lg">
                {Math.floor(previousValidation.totalDuration / 60)}:{(previousValidation.totalDuration % 60).toString().padStart(2, '0')}
              </p>
            </div>
            <div>
              <p className="text-gray-400">当前总时长</p>
              <p className="font-mono text-lg text-amber-450">
                {Math.floor(currentValidation.totalDuration / 60)}:{(currentValidation.totalDuration % 60).toString().padStart(2, '0')}
              </p>
            </div>
            <div>
              <p className="text-gray-400">变化</p>
              <p className={cn(
                'font-mono text-lg',
                currentValidation.totalDuration > previousValidation.totalDuration ? 'text-rose-400' : 'text-emerald-400'
              )}>
                {currentValidation.totalDuration > previousValidation.totalDuration ? '+' : ''}
                {Math.floor((currentValidation.totalDuration - previousValidation.totalDuration) / 60)}:
                {Math.abs((currentValidation.totalDuration - previousValidation.totalDuration) % 60).toString().padStart(2, '0')}
              </p>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            错误数量变化: {previousValidation.errors.length} → {currentValidation.errors.length}
            {currentValidation.errors.length < previousValidation.errors.length && (
              <span className="text-emerald-400 ml-2">✓ 已修复 {previousValidation.errors.length - currentValidation.errors.length} 个问题</span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">校验结果 ({errors.length})</h3>
        <div className="flex gap-1 bg-indigo-900/50 p-1 rounded-lg">
          {(['all', 'error', 'warning'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm transition-all',
                activeTab === tab
                  ? 'bg-amber-450 text-indigo-950 font-medium'
                  : 'hover:bg-indigo-800 text-gray-400'
              )}
            >
              {tab === 'all' ? '全部' : tab === 'error' ? '错误' : '警告'}
              <span className="ml-1 text-xs opacity-75">
                ({tab === 'all' ? errors.length : errors.filter(e => e.severity === tab).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {filteredErrors.length === 0 ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-emerald-400 font-medium">所有校验通过！</p>
          <p className="text-sm text-gray-400 mt-1">时长版本、返场规则、换场时间均符合要求</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
          {filteredErrors.map((error, idx) => (
            <ErrorItem key={error.id} error={error} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
