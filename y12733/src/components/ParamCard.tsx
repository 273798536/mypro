import { useState } from 'react';
import { ChevronDown, ChevronRight, Edit3, History, AlertOctagon, CheckCircle2, XCircle } from 'lucide-react';
import { CondProbParam } from '@/types';
import { DataStatusBadge, ReviewStatusBadge } from './StatusBadge';
import { formatPercent } from '@/utils';
import { useCondProbStore } from '@/store/useCondProbStore';
import ChangeTimeline from './ChangeTimeline';

interface Props {
  param: CondProbParam;
  onEdit?: (p: CondProbParam) => void;
}

export default function ParamCard({ param, onEdit }: Props) {
  const { expandedParamId, setExpandedParamId, approveParam, rejectParam, updateStatus, toggleBoundary } =
    useCondProbStore();
  const expanded = expandedParamId === param.id;
  const [reason, setReason] = useState('');

  const barWidth = Math.max(4, Math.min(100, param.probability * 100));
  const barColor =
    param.status === 'available'
      ? 'bg-emerald-500'
      : param.status === 'pending'
      ? 'bg-amber-500'
      : 'bg-rose-500';

  return (
    <article
      className={`bg-white rounded-xl border transition-all duration-300 shadow-card hover:shadow-cardHover animate-fadeIn ${
        param.isBoundary ? 'border-l-4 border-l-amber-400' : 'border-ink-100'
      }`}
    >
      <button
        onClick={() => setExpandedParamId(expanded ? null : param.id)}
        className="w-full text-left p-5 flex items-start gap-4"
      >
        <div className="mt-0.5 text-ink-400 transition-transform">{expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-serif text-lg font-semibold text-ink-800 leading-snug">
                P(<span className="text-ink-900">{param.outcome}</span>
                <span className="text-ink-400 mx-0.5"> | </span>
                <span className="text-ink-900">{param.condition}</span>)
              </h3>
              <p className="text-xs text-ink-400 mt-1 font-mono">
                样本 {param.conditionCount} · 交集 {param.jointCount}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {param.isBoundary && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  边界样例
                </span>
              )}
              <ReviewStatusBadge status={param.reviewStatus} />
              <DataStatusBadge status={param.status} />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="text-4xl font-serif font-bold text-ink-800 tabular-nums">
              {formatPercent(param.probability)}
            </div>
            <div className="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
              <div className={`h-full ${barColor} transition-all`} style={{ width: `${barWidth}%` }} />
            </div>
          </div>

          <p className="mt-3 text-sm text-ink-600 leading-relaxed border-l-2 border-ink-200 pl-3">
            {param.explanation}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-ink-50 pt-4 animate-fadeIn">
          {param.boundaryNote && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50/60 border border-amber-200/70 text-sm text-amber-900">
              <div className="font-medium mb-1 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4" /> 边界说明
              </div>
              {param.boundaryNote}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-ink-50/50 border border-ink-100">
              <div className="text-xs font-medium text-ink-500 mb-2 uppercase tracking-wider">审核操作</div>
              {param.reviewStatus === 'pending' ? (
                <div className="space-y-2">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="审核说明（必填）…"
                    className="w-full px-3 py-2 text-sm rounded-md border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-ink-400 resize-none"
                    rows={2}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!reason.trim()) return alert('请填写审核说明');
                        approveParam(param.id, reason);
                        setReason('');
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" /> 通过 → 可用
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!reason.trim()) return alert('请填写驳回理由');
                        rejectParam(param.id, reason);
                        setReason('');
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> 驳回 → 重采
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-ink-500 mb-2">数据状态切换</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['available', 'pending', 'recollect'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(param.id, s, '手动调整状态');
                        }}
                        className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                          param.status === s
                            ? s === 'available'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                              : s === 'pending'
                              ? 'bg-amber-50 border-amber-300 text-amber-700'
                              : 'bg-rose-50 border-rose-300 text-rose-700'
                            : 'bg-white border-ink-200 text-ink-600 hover:border-ink-300'
                        }`}
                      >
                        {s === 'available' ? '可用' : s === 'pending' ? '暂缓' : '需重采'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-ink-100/70 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(param);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-ink-700 hover:bg-ink-800 text-white font-medium transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> 编辑参数
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBoundary(param.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border font-medium transition-colors ${
                    param.isBoundary
                      ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                      : 'bg-white border-ink-200 text-ink-600 hover:border-amber-300 hover:text-amber-700'
                  }`}
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  {param.isBoundary ? '取消边界' : '标记边界'}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-ink-50/50 border border-ink-100">
              <div className="text-xs font-medium text-ink-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> 变更留痕
              </div>
              <ChangeTimeline paramId={param.id} />
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
