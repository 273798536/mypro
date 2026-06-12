import React, { useMemo } from 'react';
import {
  MapPin, FileText, MessageSquare, AlertTriangle, ChevronRight,
  PencilRuler, User, CalendarClock, Hash
} from 'lucide-react';
import { useReplayStore } from '../../store/replayStore';
import { AnomalyBadges, MaterialTypeBadge, ProcessStatusBadge } from '../common/Badges';

const TABS = [
  { key: 'points' as const,     label: '点位坐标',   Icon: MapPin },
  { key: 'attachments' as const, label: '附件材料',   Icon: FileText },
  { key: 'orals' as const,      label: '口头说明',   Icon: MessageSquare },
  { key: 'anomalies' as const,  label: '异常定位',   Icon: AlertTriangle }
];

const MaterialCard: React.FC<{ m: any }> = ({ m }) => {
  const selectedId = useReplayStore(s => s.selectedMaterialId);
  const selectMaterial = useReplayStore(s => s.selectMaterial);
  const focusMaterial = useReplayStore(s => s.focusMaterial);
  const selected = selectedId === m.id;

  return (
    <button
      onClick={() => selectMaterial(m.id)}
      onDoubleClick={() => focusMaterial(m.id)}
      className={`w-full text-left aero-panel-inner p-2.5 rounded transition-all group ${
        selected
          ? 'border-aero-track shadow-[0_0_0_1px_rgba(255,217,61,0.4),0_0_16px_rgba(255,217,61,0.12)] bg-aero-track/6'
          : 'border-aero-border/50 hover:border-aero-line/60 hover:shadow-glow-cyan'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div className={`mt-0.5 w-7 h-7 rounded flex items-center justify-center border flex-shrink-0 ${
            m.type === 'point' ? 'bg-aero-line/10 border-aero-line/30 text-aero-line'
            : m.type === 'attachment' ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
            : 'bg-violet-500/10 border-violet-500/30 text-violet-300'
          }`}>
            {m.type === 'point' && <MapPin size={14} />}
            {m.type === 'attachment' && <FileText size={14} />}
            {m.type === 'oral' && <MessageSquare size={14} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <MaterialTypeBadge type={m.type} />
              <span className={`text-[12px] font-medium truncate ${selected ? 'text-aero-track' : 'text-aero-text'}`}>
                {m.name}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] font-mono text-aero-muted">
                <CalendarClock size={10} />{m.timestamp.slice(11, 16)}
              </span>
              {m.position && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-aero-muted/80">
                  <Hash size={10} />{m.position.lng.toFixed(3)},{m.position.lat.toFixed(3)}
                </span>
              )}
              {m.attachmentMeta && (
                <span className="text-[10px] font-mono text-aero-muted/80">
                  📄 {m.attachmentMeta.fileName} · {(m.attachmentMeta.fileSize / 1024).toFixed(0)}KB
                </span>
              )}
              {m.oralMeta && (
                <span className="flex items-center gap-1 text-[10px] text-aero-muted/80">
                  <User size={10} />{m.oralMeta.speaker}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronRight size={14} className={`mt-1 flex-shrink-0 transition-all ${
          selected ? 'text-aero-track translate-x-0.5' : 'text-aero-muted/60 group-hover:text-aero-line'
        }`} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
        <AnomalyBadges item={m} />
        <ProcessStatusBadge status={m.processStatus} />
      </div>
      {m.hasModifiedCaliber && m.caliberHistory.length > 0 && (
        <div className="mt-1.5 text-[10px] font-mono text-blue-300/90 bg-blue-500/8 border border-blue-500/20 rounded px-2 py-1 flex items-center gap-1.5">
          <PencilRuler size={10} />
          最近修改 · {m.caliberHistory[0].changedBy} · {m.caliberHistory[0].field}:
          <span className="line-through opacity-70">{m.caliberHistory[0].beforeValue}</span>
          <span>→</span>
          <span className="text-blue-200 font-semibold">{m.caliberHistory[0].afterValue}</span>
        </div>
      )}
    </button>
  );
};

export const MaterialSidebar: React.FC = () => {
  const tab = useReplayStore(s => s.sidebarTab);
  const setTab = useReplayStore(s => s.setSidebarTab);
  const all = useReplayStore(s => s.allMaterials);
  const filter = useReplayStore(s => s.filter);
  const summary = useReplayStore(s => s.anomalySummary);

  const filtered = useMemo(() => {
    return all.filter(m => {
      const t = m.timestamp;
      if (t < filter.dateRange.start || t > filter.dateRange.end) return false;
      if (!filter.materialTypes.includes(m.type)) return false;
      if (filter.hasModifiedCaliber !== null && m.hasModifiedCaliber !== filter.hasModifiedCaliber) return false;
      if (!filter.processStatuses.includes(m.processStatus)) return false;
      const tags: ('normal' | 'gap' | 'late' | 'modified')[] = ['normal'];
      if (m.attachmentMeta?.isLate) tags.push('late');
      if (m.hasModifiedCaliber) tags.push('modified');
      if (m.fillsGapId) tags.push('gap');
      if (!tags.some(tag => filter.anomalyStatus.includes(tag as any))) return false;
      return true;
    });
  }, [all, filter]);

  const list = filtered.filter(m => {
    if (tab === 'points') return m.type === 'point';
    if (tab === 'attachments') return m.type === 'attachment';
    if (tab === 'orals') return m.type === 'oral';
    return m.attachmentMeta?.isLate || m.hasModifiedCaliber || m.fillsGapId
      || m.processStatus === 'need_evidence' || m.processStatus === 'rejected';
  }).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const tabCounts = {
    points: filtered.filter(m => m.type === 'point').length,
    attachments: filtered.filter(m => m.type === 'attachment').length,
    orals: filtered.filter(m => m.type === 'oral').length,
    anomalies: summary.timelineGaps + summary.lateAttachments + summary.modifiedCalibers
  };

  return (
    <div className="aero-panel h-full flex flex-col min-h-0 aero-corner">
      <div className="flex border-b border-aero-border/50">
        {TABS.map(t => {
          const Icon = t.Icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-[11px] font-medium transition-all relative ${
                active
                  ? 'text-aero-line'
                  : 'text-aero-muted/80 hover:text-aero-text/80'
              }`}
            >
              <Icon size={12} />
              <span className="hidden xl:inline">{t.label}</span>
              <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${
                active ? 'bg-aero-line/15 text-aero-line border border-aero-line/35' : 'bg-aero-dim text-aero-muted/70'
              }`}>
                {tabCounts[t.key]}
              </span>
              {active && <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-aero-line to-transparent"></span>}
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
        {list.length === 0 && (
          <div className="text-[11px] text-aero-muted/60 text-center py-10 border border-dashed border-aero-border/40 rounded">
            当前筛选下无匹配材料
          </div>
        )}
        {list.map(m => <MaterialCard key={m.id} m={m} />)}
      </div>
    </div>
  );
};
