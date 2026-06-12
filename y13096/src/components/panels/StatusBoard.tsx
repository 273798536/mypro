import React from 'react';
import { ShieldCheck, AlertTriangle, Ban, Clock, TrendingUp } from 'lucide-react';
import { useReplayStore } from '../../store/replayStore';
import type { ProcessStatus } from '../../../shared/types';

export const StatusBoard: React.FC = () => {
  const s = useReplayStore(state => state.anomalySummary);
  const toggleProcessStatus = useReplayStore(state => state.toggleProcessStatus);
  const setSidebarTab = useReplayStore(state => state.setSidebarTab);
  const total = s.byStatus.processed + s.byStatus.need_evidence + s.byStatus.rejected + s.byStatus.untreated;

  const cards: { key: ProcessStatus | 'all'; label: string; sub: string; count: number; color: string; Icon: any }[] = [
    { key: 'processed',     label: '已处理',   sub: 'PROCESSED',     count: s.byStatus.processed,     color: 'emerald', Icon: ShieldCheck },
    { key: 'need_evidence', label: '待补证据', sub: 'NEED EVIDENCE', count: s.byStatus.need_evidence, color: 'orange',  Icon: AlertTriangle },
    { key: 'rejected',      label: '已驳回',   sub: 'REJECTED',      count: s.byStatus.rejected,      color: 'rose',    Icon: Ban },
    { key: 'untreated',     label: '未处理',   sub: 'UNHANDLED',     count: s.byStatus.untreated,     color: 'slate',   Icon: Clock },
  ];

  const colorMap: Record<string, { bar: string; text: string; border: string; bg: string; glow: string }> = {
    emerald: { bar: 'bg-emerald-400', text: 'text-emerald-300', border: 'border-emerald-500/40', bg: 'bg-emerald-500/8', glow: 'shadow-[0_0_18px_rgba(16,185,129,0.15)]' },
    orange:  { bar: 'bg-orange-400',  text: 'text-orange-300',  border: 'border-orange-500/40',  bg: 'bg-orange-500/8',  glow: 'shadow-glow-warn' },
    rose:    { bar: 'bg-rose-400',    text: 'text-rose-300',    border: 'border-rose-500/40',    bg: 'bg-rose-500/8',    glow: 'shadow-glow-danger' },
    slate:   { bar: 'bg-slate-400',   text: 'text-slate-300',   border: 'border-slate-500/40',   bg: 'bg-slate-500/8',   glow: '' }
  };

  const onClickCard = (key: ProcessStatus | 'all') => {
    if (key === 'all') {
      useReplayStore.setState(state => ({
        filter: { ...state.filter, processStatuses: ['processed', 'need_evidence', 'rejected', 'untreated'] }
      }));
    } else {
      useReplayStore.setState({
        filter: { ...useReplayStore.getState().filter, processStatuses: [key] }
      });
      toggleProcessStatus(key);
    }
    setSidebarTab('anomalies');
  };

  return (
    <div className="aero-panel p-3 aero-corner">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-aero-line" />
          <span className="text-[12px] font-semibold tracking-wider text-aero-text">处理状态总览</span>
        </div>
        <span className="font-mono text-[10px] text-aero-muted">合计 {total} 条 · 含 {s.timelineGaps} 缺段 / {s.lateAttachments} 晚到 / {s.modifiedCalibers} 口径修改</span>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {cards.map(c => {
          const col = colorMap[c.color];
          const pct = total ? Math.round(c.count / total * 100) : 0;
          return (
            <button
              key={c.key}
              onClick={() => onClickCard(c.key)}
              className={`text-left aero-panel-inner p-2.5 border ${col.border} ${col.bg} ${col.glow} hover:scale-[1.02] transition-all relative overflow-hidden group`}
            >
              <div className="absolute top-0 right-0 w-12 h-12 opacity-[0.05]">
                <c.Icon size={48} className={col.text} />
              </div>
              <div className="flex items-center gap-1.5">
                <c.Icon size={13} className={col.text} />
                <span className={`text-[10px] font-mono uppercase tracking-wider ${col.text} opacity-70`}>{c.sub}</span>
              </div>
              <div className="flex items-end gap-2 mt-1.5">
                <span className={`font-display font-bold text-[26px] leading-none ${col.text} tabular-nums group-hover:scale-105 transition-transform`}>
                  {c.count}
                </span>
                <span className="text-[11px] pb-0.5 text-aero-muted">{c.label}</span>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1 h-1 bg-aero-dim rounded-full overflow-hidden">
                  <div className={`h-full ${col.bar} rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
                </div>
                <span className={`font-mono text-[10px] ${col.text} tabular-nums`}>{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
