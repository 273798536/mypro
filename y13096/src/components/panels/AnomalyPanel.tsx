import React from 'react';
import { AlertOctagon, MapPin, Crosshair, FileWarning, ClockAlert, PenTool, Layers } from 'lucide-react';
import { useReplayStore } from '../../store/replayStore';
import { ProcessStatusBadge, AnomalyBadges } from '../common/Badges';

export const AnomalyPanel: React.FC = () => {
  const all = useReplayStore(s => s.allMaterials);
  const gaps = useReplayStore(s => s.timelineGaps);
  const focusMaterial = useReplayStore(s => s.focusMaterial);
  const setSidebarTab = useReplayStore(s => s.setSidebarTab);

  const abnormalItems = all.filter(m =>
    m.attachmentMeta?.isLate || m.hasModifiedCaliber || m.fillsGapId
      || m.processStatus === 'need_evidence' || m.processStatus === 'rejected'
  ).sort((a, b) => {
    const score = (x: typeof a) =>
      (x.processStatus === 'rejected' ? 100 : 0) +
      (x.processStatus === 'need_evidence' ? 60 : 0) +
      (x.attachmentMeta?.isLate ? 50 : 0) +
      (x.fillsGapId ? 40 : 0) +
      (x.hasModifiedCaliber ? 20 : 0);
    return score(b) - score(a);
  });

  return (
    <div className="aero-panel p-3 aero-corner flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertOctagon size={14} className="text-aero-danger" />
          <span className="text-[12px] font-semibold tracking-wider text-aero-text">异常对象定位</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-aero-danger/15 text-aero-danger border border-aero-danger/35">
            {abnormalItems.length + gaps.length} 项
          </span>
        </div>
        <button onClick={() => setSidebarTab('points')} className="text-[10px] text-aero-muted hover:text-aero-line transition">
          切换至材料列表 →
        </button>
      </div>

      <div className="space-y-2 mb-3">
        {gaps.map(g => (
          <div key={g.id} className="aero-panel-inner p-2.5 border-l-2 border-aero-danger hover:shadow-glow-danger transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <FileWarning size={14} className="text-aero-danger mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-aero-danger truncate">时间轴缺段 · {g.id.toUpperCase()}</div>
                  <div className="font-mono text-[10px] text-aero-muted mt-0.5">
                    {g.start.slice(11, 16)} ~ {g.end.slice(11, 16)} · 共{g.durationMinutes}分钟
                  </div>
                  <div className="text-[10px] text-aero-muted/80 mt-1 leading-relaxed">{g.note}</div>
                </div>
              </div>
              <span className={`aero-tag ${g.severity === 'critical' ? 'bg-aero-danger/18 text-aero-danger border border-aero-danger/50' : 'bg-aero-warn/18 text-aero-warn border border-aero-warn/50'}`}>
                {g.severity.toUpperCase()}
              </span>
            </div>
            {g.relatedMaterialIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-[10px] text-aero-muted">关联材料：</span>
                {g.relatedMaterialIds.map(id => {
                  const m = all.find(x => x.id === id);
                  return (
                    <button key={id} onClick={() => m && focusMaterial(id)}
                      className="text-[10px] font-mono text-aero-line hover:underline">
                      {m?.name?.slice(0, 18) || id}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5">
        {abnormalItems.length === 0 && (
          <div className="text-[11px] text-aero-muted/60 text-center py-6 border border-dashed border-aero-border/40 rounded">
            🎯 当前筛选下无异常 · 尝试重置筛选
          </div>
        )}
        {abnormalItems.map(m => {
          const isGapFiller = !!m.fillsGapId;
          const isLate = !!m.attachmentMeta?.isLate;
          const ring = isGapFiller ? 'border-l-2 border-aero-danger' : isLate ? 'border-l-2 border-aero-warn' : 'border-l-2 border-blue-500/50';
          return (
            <button
              key={m.id}
              onClick={() => focusMaterial(m.id)}
              className={`w-full text-left aero-panel-inner p-2.5 ${ring} hover:shadow-glow-cyan hover:border-l-aero-line transition-all group`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <MapPin size={12} className="text-aero-line mt-0.5 flex-shrink-0 opacity-70 group-hover:opacity-100" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-aero-text truncate group-hover:text-aero-line transition">
                      {m.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="font-mono text-[10px] text-aero-muted">{m.timestamp.slice(11, 16)}</span>
                      {m.position && (
                        <span className="font-mono text-[10px] text-aero-muted/70">
                          ({m.position.lng.toFixed(3)},{m.position.lat.toFixed(3)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Crosshair size={12} className="text-aero-track opacity-0 group-hover:opacity-100 mt-0.5 flex-shrink-0 transition-opacity" />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                <AnomalyBadges item={m} />
                <ProcessStatusBadge status={m.processStatus} />
              </div>
              {isLate && m.attachmentMeta && (
                <div className="mt-1.5 text-[10px] font-mono text-aero-warn bg-aero-warn/10 border border-aero-warn/25 rounded px-2 py-1">
                  ⏰ 应到 {m.attachmentMeta.expectedTime.slice(11, 16)} · 实到 {m.attachmentMeta.uploadTime.slice(11, 16)} · 延迟 {
                    Math.round((new Date(m.attachmentMeta.uploadTime).getTime() - new Date(m.attachmentMeta.expectedTime).getTime()) / 60000)
                  } 分钟
                </div>
              )}
              {m.hasModifiedCaliber && m.caliberHistory.length > 0 && (
                <div className="mt-1.5 text-[10px] font-mono text-blue-300 bg-blue-500/8 border border-blue-500/20 rounded px-2 py-1 flex items-center gap-1">
                  <PenTool size={10} />
                  {m.caliberHistory[0].field}: {m.caliberHistory[0].beforeValue} → {m.caliberHistory[0].afterValue}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
