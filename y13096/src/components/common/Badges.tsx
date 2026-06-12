import React from 'react';
import { AlertTriangle, Clock, ShieldCheck, Ban, PencilRuler, XCircle } from 'lucide-react';
import type { ProcessStatus, MaterialItem } from '../../../shared/types';

export const ProcessStatusBadge: React.FC<{ status: ProcessStatus }> = ({ status }) => {
  const map: Record<ProcessStatus, { label: string; cls: string; Icon?: any }> = {
    processed:     { label: '已处理',     cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/35', Icon: ShieldCheck },
    need_evidence: { label: '待补证据',   cls: 'bg-orange-500/15 text-orange-400 border border-orange-500/35', Icon: AlertTriangle },
    rejected:      { label: '已驳回',     cls: 'bg-rose-500/15 text-rose-400 border border-rose-500/35', Icon: Ban },
    untreated:     { label: '未处理',     cls: 'bg-slate-500/15 text-slate-400 border border-slate-500/35', Icon: Clock }
  };
  const { label, cls, Icon } = map[status];
  return (
    <span className={`aero-tag ${cls}`}>
      {Icon && <Icon size={11} />}
      {label}
    </span>
  );
};

export const MaterialTypeBadge: React.FC<{ type: MaterialItem['type'] }> = ({ type }) => {
  const map = {
    point:      { label: '点位', cls: 'bg-aero-line/10 text-aero-line border border-aero-line/40' },
    attachment: { label: '附件', cls: 'bg-sky-500/10 text-sky-300 border border-sky-500/30' },
    oral:       { label: '口头', cls: 'bg-violet-500/10 text-violet-300 border border-violet-500/30' }
  } as const;
  const { label, cls } = map[type];
  return <span className={`aero-tag ${cls}`}>{label}</span>;
};

export const AnomalyBadges: React.FC<{ item: MaterialItem }> = ({ item }) => {
  const items: { key: string; label: string; cls: string; Icon: any }[] = [];
  if (item.attachmentMeta?.isLate) {
    items.push({ key: 'late', label: '晚到附件', cls: 'bg-aero-warn/18 text-aero-warn border border-aero-warn/50 shadow-glow-warn', Icon: Clock });
  }
  if (item.hasModifiedCaliber) {
    items.push({ key: 'mod', label: '改过口径', cls: 'bg-blue-500/15 text-blue-300 border border-blue-500/40', Icon: PencilRuler });
  }
  if (item.fillsGapId) {
    items.push({ key: 'gap', label: '填补缺段', cls: 'bg-aero-danger/15 text-aero-danger border border-aero-danger/45 shadow-glow-danger', Icon: XCircle });
  }
  if (items.length === 0) {
    return <span className="aero-tag bg-emerald-500/10 text-emerald-400/70 border border-emerald-500/20">正常</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(b => (
        <span key={b.key} className={`aero-tag ${b.cls}`}>
          <b.Icon size={11} />{b.label}
        </span>
      ))}
    </div>
  );
};

export const SeverityBadge: React.FC<{ severity: 'warning' | 'critical' }> = ({ severity }) => {
  return severity === 'critical'
    ? <span className="aero-tag bg-aero-danger/18 text-aero-danger border border-aero-danger/50 shadow-glow-danger">严重缺段 · CRITICAL</span>
    : <span className="aero-tag bg-aero-warn/18 text-aero-warn border border-aero-warn/45 shadow-glow-warn">一般缺段 · WARNING</span>;
};
