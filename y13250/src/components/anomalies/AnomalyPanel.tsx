import { useState } from 'react';
import { useStore } from '@/store';
import { AlertTriangle, Clock, CheckCircle, ExternalLink, ArrowRightLeft } from 'lucide-react';
import { anomalyTypeMeta, severityMeta, mergeStatusMeta } from '../common/StatusBadge';
import { cn } from '@/lib/utils';

type Tab = 'anomaly' | 'pending';

export function AnomalyPanel() {
  const anomalies = useStore(s => s.anomalies);
  const merges = useStore(s => s.merges);
  const points = useStore(s => s.points);
  const highlight = useStore(s => s.highlight);
  const setHighlight = useStore(s => s.setHighlight);
  const setSelectedMerge = useStore(s => s.setSelectedMerge);
  const confirmPendingMerge = useStore(s => s.confirmPendingMerge);
  const resolveAnomaly = useStore(s => s.resolveAnomaly);

  const [tab, setTab] = useState<Tab>('anomaly');

  const unresolved = anomalies.filter(a => !a.resolved);
  const pendingMerges = merges.filter(m => m.status === 'pending_review');
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col bg-bg-card/70 rounded-xl border border-border overflow-hidden animate-fade-in" style={{ animationDelay: '440ms' }}>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-accent-abnormal" />
          <h2 className="text-base font-bold tracking-wide">异常 & 挂起区</h2>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] px-2 py-0.5 rounded bg-accent-abnormal/15 text-accent-abnormal border border-accent-abnormal/30 font-mono">
            {unresolved.length} 异常
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-accent-pending/15 text-accent-pending border border-accent-pending/30 font-mono">
            {pendingMerges.length} 挂起
          </span>
        </div>
      </div>

      <div className="flex border-b border-border">
        <button
          onClick={() => setTab('anomaly')}
          className={cn(
            'flex-1 px-3 py-2 text-sm transition-colors relative',
            tab === 'anomaly' ? 'text-accent-abnormal' : 'text-text-muted hover:text-text',
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            异常清单
          </span>
          {tab === 'anomaly' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-abnormal" />}
        </button>
        <button
          onClick={() => setTab('pending')}
          className={cn(
            'flex-1 px-3 py-2 text-sm transition-colors relative',
            tab === 'pending' ? 'text-accent-pending' : 'text-text-muted hover:text-text',
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            挂起待确认
          </span>
          {tab === 'pending' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-pending" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tab === 'anomaly' && (
          <>
            {unresolved.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-text-dim gap-2">
                <CheckCircle className="w-8 h-8 opacity-40" />
                <div className="text-sm">暂无未解决异常</div>
              </div>
            )}
            {unresolved.map(a => {
              const meta = anomalyTypeMeta[a.type];
              const point = points.find(p => p.id === a.pointId);
              const isHl = highlight.type === 'anomaly' && highlight.id === a.id;
              return (
                <div
                  key={a.id}
                  className={cn(
                    'rounded-lg border border-accent-abnormal/40 bg-accent-abnormal/5 p-3 animate-pulse-red',
                    isHl && 'ring-2 ring-accent-abnormal',
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{meta.icon}</span>
                      <span className="text-xs font-medium text-text">{meta.label}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', severityMeta[a.severity].cls)}>
                        {severityMeta[a.severity].label}危
                      </span>
                    </div>
                    {a.relatedMergeId && (
                      <button
                        className="text-[10px] px-1.5 py-1 rounded bg-bg-hover text-text-muted hover:text-accent-merged flex items-center gap-1"
                        onClick={() => {
                          setSelectedMerge(a.relatedMergeId!);
                          setHighlight({ type: 'anomaly', id: a.id, triggeredAt: Date.now() });
                        }}
                      >
                        <ExternalLink className="w-3 h-3" />
                        跳归并
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-text-muted leading-relaxed mb-2">{a.description}</div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                    <div className="text-[10px] text-text-dim">
                      关联点位：<span className="text-text">{point?.name || '-'}</span>
                      {a.relatedMaterialId && (
                        <>
                          <span className="mx-1.5 text-border">·</span>
                          材料：
                          <button
                            className="text-accent-caliber hover:underline"
                            onClick={() => {
                              setHighlight({ type: 'material', id: a.relatedMaterialId!, triggeredAt: Date.now() });
                            }}
                          >
                            追溯材料
                          </button>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => resolveAnomaly(a.id)}
                      className="text-[11px] px-2 py-1 rounded-md bg-accent-normal/15 text-accent-normal border border-accent-normal/30 hover:bg-accent-normal/25 transition-colors"
                    >
                      ✓ 核查完毕
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {tab === 'pending' && (
          <>
            {pendingMerges.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-text-dim gap-2">
                <CheckCircle className="w-8 h-8 opacity-40" />
                <div className="text-sm">所有挂起均已确认</div>
              </div>
            )}
            {pendingMerges.map(m => {
              const memberPoints = m.pointIds.map(pid => points.find(p => p.id === pid)!).filter(Boolean);
              const willConfirm = confirming === m.id + '_merge';
              const willSplit = confirming === m.id + '_split';
              return (
                <div
                  key={m.id}
                  className="rounded-lg border border-accent-pending/40 bg-accent-pending/5 p-3 animate-breath-yellow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Clock className="w-4 h-4 text-accent-pending" />
                      <span className="text-sm font-bold text-text">{m.canonicalName}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', mergeStatusMeta[m.status].cls)}>
                        {mergeStatusMeta[m.status].label}
                      </span>
                    </div>
                    <span className="text-[10px] text-text-dim font-mono">置信度 {(m.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-1 mb-2 flex-wrap">
                    {memberPoints.map((p, i) => (
                      <span key={p.id} className="inline-flex items-center gap-1 text-[11px]">
                        {i > 0 && <ArrowRightLeft className="w-3 h-3 text-accent-pending" />}
                        <span className="px-1.5 py-0.5 rounded bg-bg text-text-muted">{p.name}</span>
                      </span>
                    ))}
                  </div>
                  <div className="text-[11px] text-text-dim leading-relaxed mb-2.5">
                    ⚠️ {m.evidenceNote}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (willConfirm) {
                          confirmPendingMerge(m.id, 'merge');
                          setConfirming(null);
                        } else {
                          setConfirming(m.id + '_merge');
                          setTimeout(() => setConfirming(c => (c === m.id + '_merge' ? null : c)), 3500);
                        }
                      }}
                      className={cn(
                        'flex-1 text-xs px-2 py-1.5 rounded-md transition-colors',
                        willConfirm
                          ? 'bg-accent-normal text-white font-bold'
                          : 'bg-accent-normal/15 text-accent-normal border border-accent-normal/30 hover:bg-accent-normal/25',
                      )}
                    >
                      {willConfirm ? '再点一次：确认归并' : '确认归并为一组'}
                    </button>
                    <button
                      onClick={() => {
                        if (willSplit) {
                          confirmPendingMerge(m.id, 'split');
                          setConfirming(null);
                        } else {
                          setConfirming(m.id + '_split');
                          setTimeout(() => setConfirming(c => (c === m.id + '_split' ? null : c)), 3500);
                        }
                      }}
                      className={cn(
                        'flex-1 text-xs px-2 py-1.5 rounded-md transition-colors',
                        willSplit
                          ? 'bg-accent-abnormal text-white font-bold'
                          : 'bg-accent-abnormal/15 text-accent-abnormal border border-accent-abnormal/30 hover:bg-accent-abnormal/25',
                      )}
                    >
                      {willSplit ? '再点一次：拆成两处' : '拆分为两处独立点位'}
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
      <div className="px-3 py-2 border-t border-border text-[10px] text-text-dim leading-relaxed">
        💡 相邻路口宁可挂起也不自动归并；点击「追溯材料」定位左侧材料卡片闪烁。
      </div>
    </div>
  );
}
