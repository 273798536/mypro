import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ProblemType, Severity, PROBLEM_TYPE_LABELS, SEVERITY_LABELS } from '../../types';
import { AlertTriangle, ChevronDown, ChevronRight, AlertCircle, AlertOctagon, Info, Copy, Check } from 'lucide-react';

export const ProblemPanel: React.FC = () => {
  const { activeBatchId, problems, runProblemDetection, isProcessing } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const currentProblems = activeBatchId ? problems[activeBatchId] || [] : [];

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case 'critical':
        return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
      case 'warning':
        return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'info':
      default:
        return 'text-sky-400 border-sky-500/30 bg-sky-500/10';
    }
  };

  const getSeverityIcon = (severity: Severity) => {
    switch (severity) {
      case 'critical':
        return <AlertOctagon className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'info':
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const copyToClipboard = async (text: string, problemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(problemId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="card-surface spectrum-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-spectrum-pink" />
          <span className="font-display font-semibold text-sm text-slate-200">问题检测</span>
          {currentProblems.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
              currentProblems.some(p => p.severity === 'critical')
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : currentProblems.some(p => p.severity === 'warning')
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
            }`}>
              {currentProblems.length} 项
            </span>
          )}
        </div>
        <button
          onClick={runProblemDetection}
          disabled={isProcessing || !activeBatchId}
          className="px-3 py-1 text-[10px] font-mono border border-slate-600/30 rounded hover:border-slate-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          重新检测
        </button>
      </div>

      {!activeBatchId && (
        <div className="p-4 text-center">
          <Info className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <div className="text-xs text-slate-500">请先选择分析批次</div>
        </div>
      )}

      {activeBatchId && currentProblems.length === 0 && !isProcessing && (
        <div className="p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-xs text-emerald-400">未检测到问题</div>
          <div className="text-[10px] text-slate-500 mt-1">音频质量良好</div>
        </div>
      )}

      {isProcessing && (
        <div className="p-4 text-center">
          <div className="w-8 h-8 border-2 border-spectrum-cyan/30 border-t-spectrum-cyan rounded-full animate-spin mx-auto mb-2" />
          <div className="text-xs text-slate-400">正在检测问题...</div>
        </div>
      )}

      {activeBatchId && currentProblems.length > 0 && (
        <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
          {currentProblems.map((problem) => {
            const isExpanded = expandedId === problem.problemId;
            return (
              <div
                key={problem.problemId}
                className={`rounded-lg border ${getSeverityColor(problem.severity)} transition-all`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : problem.problemId)}
                  className="w-full p-3 flex items-start gap-2 text-left"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getSeverityIcon(problem.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">
                        {PROBLEM_TYPE_LABELS[problem.type as ProblemType] || problem.type}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/20">
                        {SEVERITY_LABELS[problem.severity]}
                      </span>
                    </div>
                    <p className="text-[11px] mt-1 opacity-80 line-clamp-1">
                      {problem.description}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 opacity-60" />
                    ) : (
                      <ChevronRight className="w-4 h-4 opacity-60" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-current/10">
                    <div className="pt-3 space-y-3">
                      {problem.affectedFrequencies && problem.affectedFrequencies.length > 0 && (
                        <div>
                          <div className="text-[10px] font-mono opacity-60 mb-1">受影响频段</div>
                          <div className="flex flex-wrap gap-1">
                            {problem.affectedFrequencies.map((freq, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/20">
                                {freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : freq} Hz
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="text-[10px] font-mono opacity-60 mb-1">复现步骤</div>
                        <div className="relative">
                          <pre className="text-[10px] font-mono p-2 rounded bg-black/20 whitespace-pre-wrap pr-8">
{problem.reproduceMethod}
                          </pre>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(problem.reproduceMethod, problem.problemId);
                            }}
                            className="absolute top-1 right-1 p-1 rounded hover:bg-white/10 transition-colors"
                          >
                            {copiedId === problem.problemId ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-60" />
                            )}
                          </button>
                        </div>
                      </div>

                      {problem.suggestedAction && (
                        <div>
                          <div className="text-[10px] font-mono opacity-60 mb-1">建议操作</div>
                          <p className="text-[11px]">{problem.suggestedAction}</p>
                        </div>
                      )}

                      {problem.evidence && Object.keys(problem.evidence).length > 0 && (
                        <div>
                          <div className="text-[10px] font-mono opacity-60 mb-1">检测数据</div>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(problem.evidence).map(([key, value]) => (
                              <div key={key} className="p-1.5 rounded bg-black/20">
                                <div className="text-[9px] font-mono opacity-60">{key}</div>
                                <div className="text-[10px] font-mono">{value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {currentProblems.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700/30">
          <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            <span>所有问题将自动包含在导出报告中</span>
          </div>
        </div>
      )}
    </div>
  );
};
