import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react';
import type { BoundaryIssue, BoundaryIssueType } from '@/types';

interface Props {
  issues: BoundaryIssue[];
}

const typeLabels: Record<BoundaryIssueType, { label: string; color: string }> = {
  'salinity-unit-mix': { label: '盐度单位混用', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  'timezone-error': { label: '潮位时区错误', color: 'bg-red-100 text-red-700 border-red-200' },
  'other': { label: '其他异常', color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export default function BoundaryIssueCards({ issues }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (issues.length === 0) {
    return (
      <div className="card-ocean p-4">
        <h3 className="text-sm font-semibold text-ocean-800 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-orange-400 rounded-full" />
          边界案例校验
        </h3>
        <div className="text-center py-6 text-slate-400 text-sm">
          ✅ 未发现边界异常
        </div>
      </div>
    );
  }

  return (
    <div className="card-ocean p-4">
      <h3 className="text-sm font-semibold text-ocean-800 mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-orange-400 rounded-full" />
        边界案例校验
        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] rounded-full font-mono">
          {issues.length} 项异常
        </span>
      </h3>

      <div className="space-y-3">
        {issues.map((issue) => {
          const isExpanded = expandedIds.has(issue.id);
          const typeInfo = typeLabels[issue.type];
          return (
            <div
              key={issue.id}
              className={`card-risk ${issue.severity === 'critical' ? 'card-risk-high' : 'card-risk-medium'} rounded-lg overflow-hidden ${issue.impactsResult ? 'corner-fold' : ''}`}
            >
              <div
                className="px-4 py-3 cursor-pointer hover:bg-slate-50/50 transition-colors flex items-start justify-between gap-2"
                onClick={() => toggle(issue.id)}
              >
                <div className="pl-3 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${issue.severity === 'critical' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                      {issue.severity === 'critical' ? '严重' : '警告'}
                    </span>
                    {issue.impactsResult && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 flex items-center gap-0.5">
                        <XCircle className="w-3 h-3" />
                        影响结果
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{issue.description}</p>
                </div>
                <div className="flex-shrink-0 mt-1">
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-3 pl-7">
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs border border-slate-100">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="text-[10px] text-slate-400 mb-0.5">原始数据</div>
                        <div className="font-mono text-red-600 bg-red-50 px-2 py-1 rounded inline-block">
                          {issue.originalValue}
                        </div>
                      </div>
                      <div className="flex items-center pt-3">
                        <ArrowIcon />
                      </div>
                      <div className="flex-1">
                        <div className="text-[10px] text-slate-400 mb-0.5">修正后</div>
                        <div className="font-mono text-green-700 bg-green-50 px-2 py-1 rounded inline-block">
                          {issue.correctedValue}
                        </div>
                      </div>
                    </div>
                    {issue.impactsResult && (
                      <div className="flex items-center gap-1 text-rose-600 text-[11px] font-medium pt-1 border-t border-slate-200">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        此异常直接影响最终判定结果
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="24" height="16" viewBox="0 0 24 16" className="text-slate-300">
      <path d="M0 8h18m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
