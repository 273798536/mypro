import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GitCompare, ArrowUp, ArrowDown, Minus, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatDuration } from '@/types';
import { cn } from '@/utils/helpers';

export function VersionCompare() {
  const { currentValidation, compareVersionId, history, toggleCompare } = useStore();

  const compareVersion = useMemo(() => {
    if (!compareVersionId) return null;
    return history.find(h => h.id === compareVersionId);
  }, [compareVersionId, history]);

  if (!compareVersion || !currentValidation) {
    return null;
  }

  const compareResult = useMemo(() => {
    const oldVal = compareVersion.validationResult;
    const newVal = currentValidation;

    return {
      totalDuration: {
        old: oldVal.totalDuration,
        new: newVal.totalDuration,
        diff: newVal.totalDuration - oldVal.totalDuration
      },
      mainDuration: {
        old: oldVal.mainDuration,
        new: newVal.mainDuration,
        diff: newVal.mainDuration - oldVal.mainDuration
      },
      encoreDuration: {
        old: oldVal.encoreDuration,
        new: newVal.encoreDuration,
        diff: newVal.encoreDuration - oldVal.encoreDuration
      },
      errors: {
        old: oldVal.errors.length,
        new: newVal.errors.length,
        diff: newVal.errors.length - oldVal.errors.length
      }
    };
  }, [compareVersion, currentValidation]);

  const DiffIcon = ({ diff }: { diff: number }) => {
    if (diff > 0) return <ArrowUp className="w-4 h-4 text-rose-400" />;
    if (diff < 0) return <ArrowDown className="w-4 h-4 text-emerald-400" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const items = [
    { label: '总时长', key: 'totalDuration', color: 'text-amber-450' },
    { label: '正场曲目', key: 'mainDuration', color: 'text-emerald-400' },
    { label: '返场曲目', key: 'encoreDuration', color: 'text-rose-400' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-indigo-900/50 rounded-xl border border-amber-450/30 overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 bg-amber-450/10 border-b border-amber-450/30">
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-amber-450" />
          <h3 className="font-semibold">版本对比</h3>
        </div>
        <button
          onClick={() => toggleCompare(null)}
          className="p-1.5 hover:bg-amber-450/20 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 divide-x divide-amber-450/20">
        <div className="p-4">
          <p className="text-xs text-gray-400 mb-3 text-center">旧版本</p>
          <p className="text-sm font-medium text-center mb-4">{compareVersion.name}</p>
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.key} className="text-center">
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className={cn('font-mono text-lg', item.color)}>
                  {formatDuration(compareResult[item.key as keyof typeof compareResult].old)}
                </p>
              </div>
            ))}
            <div className="text-center pt-2 border-t border-indigo-700">
              <p className="text-xs text-gray-400">错误数量</p>
              <p className="font-mono text-lg text-rose-400">
                {compareResult.errors.old}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <p className="text-xs text-gray-400 mb-3 text-center">当前版本</p>
          <p className="text-sm font-medium text-center mb-4">当前状态</p>
          <div className="space-y-3">
            {items.map(item => {
              const result = compareResult[item.key as keyof typeof compareResult];
              return (
                <div key={item.key} className="text-center">
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <div className="flex items-center justify-center gap-1">
                    <p className={cn('font-mono text-lg', item.color)}>
                      {formatDuration(result.new)}
                    </p>
                    {result.diff !== 0 && (
                      <span className={cn(
                        'text-xs font-mono',
                        result.diff > 0 ? 'text-rose-400' : 'text-emerald-400'
                      )}>
                        ({result.diff > 0 ? '+' : ''}{formatDuration(result.diff)})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="text-center pt-2 border-t border-indigo-700">
              <p className="text-xs text-gray-400">错误数量</p>
              <div className="flex items-center justify-center gap-1">
                <p className="font-mono text-lg text-rose-400">
                  {compareResult.errors.new}
                </p>
                {compareResult.errors.diff !== 0 && (
                  <span className={cn(
                    'text-xs font-mono',
                    compareResult.errors.diff > 0 ? 'text-rose-400' : 'text-emerald-400'
                  )}>
                    ({compareResult.errors.diff > 0 ? '+' : ''}{compareResult.errors.diff})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-black/20 border-t border-amber-450/20">
        <p className="text-xs text-gray-400 mb-2">变化总结:</p>
        <div className="flex flex-wrap gap-2">
          {compareResult.totalDuration.diff !== 0 && (
            <span className={cn(
              'text-xs px-2 py-1 rounded-full',
              compareResult.totalDuration.diff > 0
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-emerald-500/20 text-emerald-400'
            )}>
              总时长 {compareResult.totalDuration.diff > 0 ? '增加' : '减少'} {formatDuration(Math.abs(compareResult.totalDuration.diff))}
            </span>
          )}
          {compareResult.errors.diff !== 0 && (
            <span className={cn(
              'text-xs px-2 py-1 rounded-full',
              compareResult.errors.diff > 0
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-emerald-500/20 text-emerald-400'
            )}>
              错误 {compareResult.errors.diff > 0 ? '增加' : '减少'} {Math.abs(compareResult.errors.diff)} 个
            </span>
          )}
          {compareResult.totalDuration.diff === 0 && compareResult.errors.diff === 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-500/20 text-gray-400">
              无变化
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
