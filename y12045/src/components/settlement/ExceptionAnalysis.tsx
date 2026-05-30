import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, MapPin, AlertCircle, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { EXCEPTION_TYPE_LABELS } from '../../config/constants';

export function ExceptionAnalysis() {
  const { exceptions, packages, sortingLines } = useGameStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getExceptionIcon = (type: string) => {
    switch (type) {
      case 'urgent_starvation': return <AlertTriangle size={20} className="text-red-400" />;
      case 'line_congestion': return <MapPin size={20} className="text-orange-400" />;
      case 'damaged_failure': return <AlertCircle size={20} className="text-yellow-400" />;
      default: return <AlertTriangle size={20} className="text-red-400" />;
    }
  };

  const getSuggestion = (type: string) => {
    switch (type) {
      case 'urgent_starvation':
        return '建议切换到"优先级排序"策略，让高优先级的急件能够优先处理。也可以尝试手动将急件分配到空闲的分拣线。';
      case 'line_congestion':
        return '建议切换到"最短队列"路径策略，平衡各条分拣线的负载。避免将大量相同目的地的包裹集中分配到同一条线路。';
      case 'damaged_failure':
        return '破损件需要额外处理时间，建议提前规划，为破损件预留充足的处理时隙。可以尝试使用 SJF 策略让短作业优先完成，腾出资源处理破损件。';
      case 'deadline_missed':
        return '包裹等待时间过长导致超时。建议优化分配策略，减少包裹在队列中的等待时间。可以尝试 FIFO 策略确保公平性。';
      default:
        return '分析异常发生的原因，调整分拣策略以避免类似问题。';
    }
  };

  const getPackageInfo = (packageId: string) => {
    return packages.find(p => p.id === packageId);
  };

  const getLineInfo = (lineId: number) => {
    return sortingLines.find(l => l.id === lineId);
  };

  const sortedExceptions = [...exceptions].sort((a, b) => a.timestamp - b.timestamp);

  if (exceptions.length === 0) {
    return (
      <div className="bg-[#252538] rounded-xl p-6 border border-[#3a3a52] text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lightbulb size={32} className="text-green-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">完美表现！</h3>
        <p className="text-gray-400">本局没有发生任何异常，你对分拣策略的掌控非常出色！</p>
      </div>
    );
  }

  return (
    <div className="bg-[#252538] rounded-xl p-6 border border-[#3a3a52]">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <AlertTriangle className="text-orange-400" size={24} />
        异常分析
        <span className="ml-auto text-sm font-normal text-gray-400">
          共 {exceptions.length} 次异常
        </span>
      </h3>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {sortedExceptions.map(ex => {
            const isExpanded = expandedId === ex.id;
            const involvedPackages = ex.involvedPackageIds.map(getPackageInfo).filter(Boolean);
            const involvedLines = ex.involvedLineIds.map(getLineInfo).filter(Boolean);

            return (
              <motion.div
                key={ex.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#1a1a2e] rounded-lg border border-[#3a3a52] overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : ex.id)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-[#252538] transition-colors"
                >
                  {getExceptionIcon(ex.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{EXCEPTION_TYPE_LABELS[ex.type]}</span>
                      <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                        -{ex.penalty}分
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5">{ex.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-mono">
                      <Clock size={12} className="inline mr-1" />
                      {Math.floor(ex.timestamp)}s
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={18} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={18} className="text-gray-400" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 pb-4"
                    >
                      <div className="border-t border-[#3a3a52] pt-4 space-y-4">
                        {involvedPackages.length > 0 && (
                          <div>
                            <h4 className="text-xs text-gray-400 mb-2">涉及包裹</h4>
                            <div className="flex flex-wrap gap-2">
                              {involvedPackages.map(pkg => pkg && (
                                <div
                                  key={pkg.id}
                                  className="px-2 py-1 bg-[#3a3a52] rounded text-xs text-white font-mono"
                                >
                                  {pkg.id.slice(0, 6)} · {pkg.type === 'urgent' ? '急件' : pkg.type === 'damaged' ? '破损件' : '普通件'} · P{pkg.priority}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {involvedLines.length > 0 && (
                          <div>
                            <h4 className="text-xs text-gray-400 mb-2">涉及线路</h4>
                            <div className="flex flex-wrap gap-2">
                              {involvedLines.map(line => line && (
                                <div
                                  key={line.id}
                                  className="px-2 py-1 rounded text-xs font-bold"
                                  style={{ 
                                    backgroundColor: `${line.color}20`,
                                    color: line.color,
                                    border: `1px solid ${line.color}40`
                                  }}
                                >
                                  {line.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                          <h4 className="text-xs text-blue-400 font-bold mb-1 flex items-center gap-1">
                            <Lightbulb size={12} />
                            优化建议
                          </h4>
                          <p className="text-sm text-blue-200">{getSuggestion(ex.type)}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
