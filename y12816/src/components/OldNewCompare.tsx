import { useState } from 'react';
import { useReportStore } from '@/store/useReportStore';
import { GitCompare, ArrowRight, User, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { formatNumber } from '@/utils/calculator';

export default function OldNewCompare() {
  const { changeLogs } = useReportStore();
  const [expandedId, setExpandedId] = useState<string | null>(changeLogs[0]?.id ?? null);

  return (
    <div className="space-y-3 animate-fade-in-up">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <GitCompare size={20} className="text-teal-900" />
          <h3 className="font-serif text-lg font-semibold text-warm-900">
            新旧结论并排对比
          </h3>
        </div>
        <p className="text-sm text-warm-500">
          样本清单被修改后，别让生物老师猜影响范围
        </p>
      </div>

      <div className="space-y-3">
        {changeLogs.map((log, idx) => {
          const expanded = expandedId === log.id;
          const conclusionChanged = log.oldConclusion !== log.newConclusion;
          const mfChanged =
            Math.abs(log.oldMutationFrequency - log.newMutationFrequency) > 0.01;

          return (
            <div
              key={log.id}
              className={`card overflow-hidden transition-all duration-300 stagger-${
                idx + 1
              } animate-fade-in-up`}
            >
              <button
                onClick={() => setExpandedId(expanded ? null : log.id)}
                className="w-full px-5 py-3 flex items-center justify-between bg-white hover:bg-warm-50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-mono text-sm text-warm-900 font-medium">
                      {log.sampleBarcode}
                    </p>
                    <p className="text-xs text-warm-500 mt-0.5 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <User size={11} />
                        {log.operator}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} />
                        {log.timestamp}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-warm-500">变更字段</span>
                    <span className="badge badge-neutral font-mono">{log.fieldName}</span>
                    {conclusionChanged && (
                      <span className="badge badge-danger">结论变化</span>
                    )}
                  </div>
                </div>
                {expanded ? (
                  <ChevronUp size={18} className="text-warm-400" />
                ) : (
                  <ChevronDown size={18} className="text-warm-400" />
                )}
              </button>

              {expanded && (
                <div className="border-t border-warm-200/60 animate-fade-in-up">
                  <div className="grid grid-cols-2 gap-0 divide-x divide-warm-200/60">
                    <div className="p-5 bg-warm-50/50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-serif font-semibold text-warm-700">
                          旧结论
                        </h4>
                        <span className="text-xs text-warm-400">修改前</span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-warm-500 mb-1">{log.fieldName}</p>
                          <p className="font-mono text-sm text-warm-800 bg-white px-2 py-1 rounded border border-warm-200 inline-block">
                            {log.oldValue}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-warm-500 mb-1">突变频率</p>
                          <p
                            className={`font-mono text-lg font-semibold ${
                              mfChanged ? 'text-warm-900' : 'text-warm-700'
                            }`}
                          >
                            {formatNumber(log.oldMutationFrequency)}%
                          </p>
                        </div>
                        <div className="pt-2">
                          <p className="text-xs text-warm-500 mb-1">最终结论</p>
                          <span
                            className={`badge ${
                              log.oldConclusion === '阳性'
                                ? 'badge-danger'
                                : log.oldConclusion === '阴性'
                                ? 'badge-success'
                                : 'badge-warning'
                            } text-sm px-3 py-1`}
                          >
                            {log.oldConclusion}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-teal-900/[0.03]">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-serif font-semibold text-teal-900">
                          新结论
                        </h4>
                        <span className="text-xs text-teal-700 font-medium">
                          修改后
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-warm-500 mb-1">{log.fieldName}</p>
                          <p
                            className={`font-mono text-sm px-2 py-1 rounded border inline-block ${
                              log.oldValue !== log.newValue
                                ? 'text-amber-700 bg-amber-50 border-amber-200'
                                : 'text-warm-800 bg-white border-warm-200'
                            }`}
                          >
                            {log.newValue}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-warm-500 mb-1 flex items-center gap-1">
                            突变频率
                            {mfChanged && (
                              <ArrowRight size={12} className="text-amber-600" />
                            )}
                          </p>
                          <p
                            className={`font-mono text-lg font-semibold ${
                              mfChanged ? 'text-amber-700' : 'text-warm-700'
                            }`}
                          >
                            {formatNumber(log.newMutationFrequency)}%
                            {mfChanged && (
                              <span className="text-xs ml-2 font-normal">
                                ({log.newMutationFrequency > log.oldMutationFrequency ? '+' : ''}
                                {formatNumber(log.newMutationFrequency - log.oldMutationFrequency)}
                                %)
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="pt-2">
                          <p className="text-xs text-warm-500 mb-1 flex items-center gap-1">
                            最终结论
                            {conclusionChanged && (
                              <ArrowRight size={12} className="text-rose-600" />
                            )}
                          </p>
                          <span
                            className={`badge text-sm px-3 py-1 ${
                              log.newConclusion === '阳性'
                                ? 'badge-danger'
                                : log.newConclusion === '阴性'
                                ? 'badge-success'
                                : 'badge-warning'
                            }`}
                          >
                            {log.newConclusion}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {conclusionChanged && (
                    <div className="px-5 py-3 bg-rose-50 border-t border-rose-100 flex items-center gap-2">
                      <ArrowRight size={16} className="text-rose-600 flex-shrink-0" />
                      <p className="text-sm text-rose-800">
                        注意：该变更使结论从「
                        <span className="font-semibold">{log.oldConclusion}</span>
                        」变为「
                        <span className="font-semibold">{log.newConclusion}</span>
                        」，建议生物老师复核原始数据
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
