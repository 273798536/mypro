import React from 'react';
import type { CompareDiffItem } from '@/types';
import { DiffBadge } from './DiffBadge';

interface Props {
  title: string;
  subtitle?: string;
  accent: 'info' | 'pink' | 'amber' | 'emerald';
  previousLabel: string;
  currentLabel: string;
  items: CompareDiffItem[];
  numeric?: boolean;
}

const accentMap = {
  info: 'from-info/30 to-info/5',
  pink: 'from-[#ec4899]/30 to-[#ec4899]/5',
  amber: 'from-amber/30 to-amber/5',
  emerald: 'from-emerald/30 to-emerald/5'
};

const formatVal = (v: unknown, numeric?: boolean): string => {
  if (v === null || v === undefined) return '—';
  if (numeric && typeof v === 'number') return Number.isInteger(v) ? v.toString() : v.toFixed(3);
  return String(v);
};

export const DiffBlock: React.FC<Props> = ({ title, subtitle, accent, previousLabel, currentLabel, items, numeric }) => {
  const changes = items.filter(i => i.changeType !== 'unchanged');
  const added = items.filter(i => i.changeType === 'added').length;
  const removed = items.filter(i => i.changeType === 'removed').length;
  const modified = items.filter(i => i.changeType === 'modified').length;

  return (
    <div className={`card-surface relative overflow-hidden`}>
      <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${accentMap[accent]} pointer-events-none`} />
      <div className="relative px-5 py-4 border-b border-border-default flex items-center justify-between">
        <div>
          <h4 className="text-[13px] font-bold text-primary">{title}</h4>
          {subtitle && <p className="text-[10px] text-muted mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          {added > 0 && <span className="chip text-emerald" style={{ borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.1)' }}>+{added}</span>}
          {removed > 0 && <span className="chip text-danger" style={{ borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)' }}>-{removed}</span>}
          {modified > 0 && <span className="chip text-amber" style={{ borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)' }}>~{modified}</span>}
        </div>
      </div>

      <div className="relative">
        <div className="grid grid-cols-[1fr_auto_1fr] text-[10px] font-mono uppercase tracking-wider text-muted px-4 py-2 border-b border-border-default bg-root/30">
          <div className="pr-3">{previousLabel}</div>
          <div className="px-2 text-center w-14"></div>
          <div className="pl-3">{currentLabel}</div>
        </div>
        <div className="max-h-64 overflow-y-auto divide-y divide-border-default">
          {items.length === 0 ? (
            <div className="px-5 py-10 text-center text-[12px] text-muted">无可对比项</div>
          ) : (
            items.map((it, idx) => (
              <div
                key={it.key}
                className={`grid grid-cols-[1fr_auto_1fr] items-stretch text-[12px] hover:bg-hover/40 transition-colors ${
                  it.changeType !== 'unchanged' ? 'animate-stagger-in' : ''
                }`}
                style={{ animationDelay: `${Math.min(idx * 20, 300)}ms` }}
              >
                <div className={`px-4 py-3 ${
                  it.changeType === 'removed' ? 'bg-danger/10' : it.changeType === 'modified' ? 'bg-amber/5' : ''
                }`}>
                  <div className="font-mono text-[10px] text-muted mb-0.5">{it.key}</div>
                  <div className={`font-semibold ${
                    it.changeType === 'removed' ? 'text-danger line-through' : 'text-secondary'
                  }`}>
                    {formatVal(it.previous, numeric)}
                  </div>
                </div>
                <div className="flex items-center justify-center px-2 border-x border-border-default w-14">
                  <DiffBadge changeType={it.changeType} />
                </div>
                <div className={`px-4 py-3 ${
                  it.changeType === 'added' ? 'bg-emerald/10' : it.changeType === 'modified' ? 'bg-amber/5' : ''
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className={`font-semibold ${
                      it.changeType === 'added' ? 'text-emerald' : it.changeType === 'modified' ? 'text-amber' : 'text-secondary'
                    }`}>
                      {formatVal(it.current, numeric)}
                    </div>
                    {numeric && it.deltaPercent !== undefined && it.changeType === 'modified' && (
                      <span className={`text-[10px] font-mono font-bold shrink-0 ${
                        it.deltaPercent > 0 ? 'text-emerald' : 'text-danger'
                      }`}>
                        {it.deltaPercent > 0 ? '↑' : '↓'} {Math.abs(it.deltaPercent)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="px-5 py-3 border-t border-border-default bg-root/20 text-[10px] text-muted font-mono">
        共 {items.length} 项 · 变更 {changes.length} 项
      </div>
    </div>
  );
};
