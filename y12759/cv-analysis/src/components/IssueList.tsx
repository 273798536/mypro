import React, { useState } from 'react';
import { Issue } from '../types';

interface IssueListProps {
  issues: Issue[];
  onResolve?: (issueId: string, note?: string) => void;
  title?: string;
  maxItems?: number;
}

const severityConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  critical: { label: '严重', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  warning: { label: '警告', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  info: { label: '提示', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
};

export const IssueList: React.FC<IssueListProps> = ({ issues, onResolve, title = '问题明细', maxItems }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'resolved'>('all');
  const [resolveNote, setResolveNote] = useState('');

  const filtered = issues.filter(i => {
    if (filter === 'resolved') return i.resolved;
    if (filter === 'all') return !i.resolved;
    return i.severity === filter && !i.resolved;
  });
  const shown = maxItems ? filtered.slice(0, maxItems) : filtered;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        <div className="flex gap-1 text-xs">
          {(['all', 'critical', 'warning', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-2.5 py-1 transition ${
                filter === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'all' ? '未解决' : f === 'critical' ? '严重' : f === 'warning' ? '警告' : '已解决'}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-100 max-h-[480px] overflow-auto scrollbar-thin">
        {shown.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">没有符合条件的问题记录</div>
        ) : (
          shown.map(issue => {
            const cfg = severityConfig[issue.severity];
            const expanded = expandedId === issue.issueId;
            return (
              <div key={issue.issueId} className={`${issue.resolved ? 'opacity-60' : ''}`}>
                <div
                  className="flex cursor-pointer items-start gap-3 p-4 hover:bg-slate-50 transition"
                  onClick={() => setExpandedId(expanded ? null : issue.issueId)}
                >
                  <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${cfg.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-slate-400">{issue.issueId}</span>
                      <span className="text-xs text-slate-500">批次 {issue.batchId}</span>
                      {issue.resolved && (
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          已处理
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-medium text-slate-800">{issue.title}</div>
                    <div className="mt-0.5 text-sm text-slate-500 line-clamp-1">{issue.description}</div>
                  </div>
                  <span className={`text-slate-400 transition ${expanded ? 'rotate-180' : ''}`}>▾</span>
                </div>
                {expanded && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4 pl-10 space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-500 mb-1">问题描述</div>
                      <div className="text-sm text-slate-700">{issue.description}</div>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <div className="text-xs font-semibold text-blue-700 mb-1">📌 为什么这条记录被拦下（给学生的说明）</div>
                      <div className="text-sm text-blue-900 leading-relaxed">{issue.studentExplanation}</div>
                    </div>
                    {issue.suggestion && (
                      <div>
                        <div className="text-xs font-semibold text-slate-500 mb-1">处理建议</div>
                        <div className="text-sm text-slate-700">{issue.suggestion}</div>
                      </div>
                    )}
                    {issue.affectedRecords.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-slate-500 mb-1">关联记录</div>
                        <div className="flex flex-wrap gap-1.5">
                          {issue.affectedRecords.map(r => (
                            <span key={r} className="rounded bg-white border border-slate-200 px-2 py-0.5 text-xs font-mono text-slate-600">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {!issue.resolved && onResolve && (
                      <div className="flex gap-2 pt-2">
                        <input
                          type="text"
                          placeholder="处理记录（可选）"
                          value={resolveNote}
                          onChange={e => setResolveNote(e.target.value)}
                          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onClick={e => e.stopPropagation()}
                        />
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onResolve(issue.issueId, resolveNote);
                            setResolveNote('');
                            setExpandedId(null);
                          }}
                          className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition"
                        >
                          标记已处理
                        </button>
                      </div>
                    )}
                    {issue.resolved && issue.resolvedNote && (
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                        <div className="text-xs font-semibold text-emerald-700">处理记录</div>
                        <div className="text-sm text-emerald-900">{issue.resolvedNote}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
