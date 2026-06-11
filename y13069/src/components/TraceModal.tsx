import { X, GitMerge, User, Clock, AlertTriangle, Gauge } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { cn } from '../lib/utils';
import dayjs from 'dayjs';
import type { SourceType } from '../types';

const SOURCE_INFO: Record<SourceType, {
  label: string;
  cls: string;
  bar: string;
  desc: string;
}> = {
  official: {
    label: '正式数据',
    cls: 'bg-emerald-600/20 text-emerald-200 border-emerald-600/50',
    bar: 'from-emerald-500 to-emerald-700',
    desc: '来自设计院CAD图纸、正式签字版文档等可追溯的正式来源',
  },
  verbal: {
    label: '口头备注',
    cls: 'bg-amber-600/20 text-amber-200 border-amber-600/50',
    bar: 'from-amber-500 to-amber-700',
    desc: '会议、现场交底等口头传达的临时调整内容，需重点复核',
  },
  old_withdrawn: {
    label: '旧版/撤回',
    cls: 'bg-gray-500/20 text-gray-300 border-gray-500/50',
    bar: 'from-gray-500 to-gray-600',
    desc: '来自已撤回的旧版本，对当前结论权重降低，建议忽略',
  },
};

export default function TraceModal() {
  const store = useAppStore();
  const traceId = store.viewState.showTraceModalFor;
  const point = traceId ? store.getPointById(traceId) : null;
  const version = point ? store.versions.find(v => v.id === point.versionId) : null;
  const anomaliesForPoint = traceId
    ? store.anomalies.filter(a => a.pointId === traceId)
    : [];

  if (!traceId || !point) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={() => store.showTrace(null)}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#0E1F38] border border-brass-800/40 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-slate-800/70 flex items-center justify-between shrink-0 bg-gradient-to-r from-brass-900/30 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brass-600/30 border border-brass-600/50 flex items-center justify-center">
              <GitMerge size={18} className="text-brass-300" />
            </div>
            <div>
              <h3 className="text-[14px] text-brass-100 font-semibold flex items-center gap-2">
                <span className="font-mono">{point.rigNo}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60">
                  数据溯源分析
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                所属版本：{version?.label ?? '—'} · 结论影响链如下
              </p>
            </div>
          </div>
          <button
            onClick={() => store.showTrace(null)}
            className="w-8 h-8 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="rounded-xl p-4 bg-slate-900/60 border border-slate-800/70">
            <div className="flex items-center gap-2 mb-3">
              <Gauge size={15} className="text-brass-400" />
              <h4 className="text-[12px] text-slate-200 font-medium">结论影响权重分布</h4>
            </div>
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-800/80">
              {point.dataSources.map((s, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-full bg-gradient-to-r transition-all',
                    SOURCE_INFO[s.sourceType].bar,
                  )}
                  style={{ width: `${s.impactWeight * 100}%` }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-2.5">
              {point.dataSources.map((s, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md border',
                    SOURCE_INFO[s.sourceType].cls,
                  )}
                >
                  <div className={cn(
                    'w-2 h-2 rounded-full bg-gradient-to-r',
                    SOURCE_INFO[s.sourceType].bar,
                  )} />
                  {SOURCE_INFO[s.sourceType].label} {Math.round(s.impactWeight * 100)}%
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[12px] text-slate-300 font-medium mb-2.5 flex items-center gap-1.5">
              <GitMerge size={13} className="text-brass-400" />
              数据来源链（按时间倒序）
            </h4>
            <div className="relative pl-5 border-l-2 border-dashed border-slate-700/60 space-y-3">
              {[...point.dataSources].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
              ).map((s, i) => (
                <div key={i} className="relative">
                  <span className={cn(
                    'absolute -left-[26px] top-1.5 w-3 h-3 rounded-full border-2 border-[#0E1F38]',
                    s.sourceType === 'official' && 'bg-emerald-500',
                    s.sourceType === 'verbal' && 'bg-amber-500',
                    s.sourceType === 'old_withdrawn' && 'bg-gray-500',
                  )} />
                  <div className={cn(
                    'rounded-xl p-3.5 border',
                    SOURCE_INFO[s.sourceType].cls,
                  )}>
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-md border shrink-0',
                        SOURCE_INFO[s.sourceType].cls,
                      )}>
                        {SOURCE_INFO[s.sourceType].label}
                      </span>
                      <span className="text-[10px] opacity-80 flex items-center gap-1 shrink-0">
                        <Clock size={11} />
                        {dayjs(s.createdAt).format('YYYY-MM-DD HH:mm')}
                      </span>
                    </div>
                    <p className="text-[12px] leading-relaxed mb-2">{s.content}</p>
                    <p className="text-[10px] opacity-70 mb-2 italic">
                      说明：{SOURCE_INFO[s.sourceType].desc}
                    </p>
                    <div className="flex items-center justify-between text-[10px] opacity-80 pt-2 border-t border-current/20">
                      <span className="flex items-center gap-1">
                        <User size={11} />
                        {s.operator}
                      </span>
                      <span>结论贡献度: {Math.round(s.impactWeight * 100)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {anomaliesForPoint.length > 0 && (
            <div className="rounded-xl p-4 bg-red-950/30 border border-red-900/50">
              <h4 className="text-[12px] text-red-300 font-medium mb-2.5 flex items-center gap-1.5">
                <AlertTriangle size={13} />
                关联异常记录 ({anomaliesForPoint.length})
              </h4>
              <div className="space-y-2">
                {anomaliesForPoint.map(a => (
                  <div key={a.id} className="rounded-lg p-3 bg-red-950/40 border border-red-900/50 text-[11px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] border',
                        a.status === 'open' && 'bg-red-700/40 text-red-200 border-red-600/60',
                        a.status === 'processing' && 'bg-amber-700/40 text-amber-200 border-amber-600/60',
                        a.status === 'closed' && 'bg-gray-700/40 text-gray-300 border-gray-600/60',
                      )}>
                        {a.status === 'open' && '待处理'}
                        {a.status === 'processing' && '处理中'}
                        {a.status === 'closed' && '已关闭'}
                      </span>
                      <span className="text-red-300/70 text-[10px]">
                        markedAsNormal: <span className="font-mono">false（不可标记为正常通过）</span>
                      </span>
                    </div>
                    <p className="text-red-200/90">{a.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {point.notes.length > 0 && (
            <div className="rounded-xl p-4 bg-slate-900/60 border border-slate-800/70">
              <h4 className="text-[12px] text-slate-300 font-medium mb-2.5">
                相关人工备注 ({point.notes.length})
              </h4>
              <div className="space-y-1.5">
                {point.notes.map(n => (
                  <div key={n.id} className="text-[11px] text-slate-300/90 flex gap-2 items-start">
                    <span className={cn(
                      'shrink-0 mt-0.5 px-1 py-0.5 rounded text-[9px] border',
                      n.isVerbal
                        ? 'bg-amber-700/30 text-amber-200 border-amber-700/50'
                        : 'bg-slate-700/40 text-slate-300 border-slate-600/50',
                    )}>
                      {n.isVerbal ? '口头' : '书面'}
                    </span>
                    <span className="flex-1">
                      {n.content}
                      <span className="text-slate-500 ml-2">— {n.author}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-800/70 shrink-0 flex items-center justify-between bg-slate-900/40">
          <p className="text-[10.5px] text-slate-500">
            所有来源贡献度总和 = 100%，建议重点关注占比高的来源
          </p>
          <button
            onClick={() => store.showTrace(null)}
            className="h-8 px-4 rounded-lg bg-brass-600/80 hover:bg-brass-500 text-[#0A1628] text-[11.5px] font-medium transition-colors"
          >
            关闭溯源
          </button>
        </div>
      </div>
    </div>
  );
}
