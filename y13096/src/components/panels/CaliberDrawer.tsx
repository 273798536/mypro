import React, { useState } from 'react';
import {
  X, PencilRuler, Clock, User, ArrowRightLeft, FileText, MapPin, MessageSquare,
  ShieldAlert, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useReplayStore } from '../../store/replayStore';
import { AnomalyBadges, MaterialTypeBadge, ProcessStatusBadge, SeverityBadge } from '../common/Badges';
import type { ProcessStatus } from '../../../shared/types';

export const CaliberDrawer: React.FC = () => {
  const show = useReplayStore(s => s.showCaliberDrawer);
  const selectedId = useReplayStore(s => s.selectedMaterialId);
  const all = useReplayStore(s => s.allMaterials);
  const gaps = useReplayStore(s => s.timelineGaps);
  const toggle = useReplayStore(s => s.toggleCaliberDrawer);
  const setStatus = useReplayStore(s => s.setProcessStatus);
  const [statusNote, setStatusNote] = useState('');

  const m = all.find(x => x.id === selectedId);
  const gap = m?.fillsGapId ? gaps.find(g => g.id === m.fillsGapId) : null;

  if (!m) return null;

  const statusOptions: { key: ProcessStatus; label: string; cls: string }[] = [
    { key: 'processed',     label: '已处理',   cls: 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15' },
    { key: 'need_evidence', label: '待补证据', cls: 'border-aero-warn/50 text-aero-warn hover:bg-aero-warn/15' },
    { key: 'rejected',      label: '已驳回',   cls: 'border-rose-500/40 text-rose-300 hover:bg-rose-500/15' },
    { key: 'untreated',     label: '未处理',   cls: 'border-slate-500/40 text-slate-300 hover:bg-slate-500/15' },
  ];

  const onSetStatus = (s: ProcessStatus) => {
    if (confirm(`标记「${m.name.slice(0, 22)}」为${statusOptions.find(x => x.key === s)?.label}？`)) {
      setStatus(m.id, s, statusNote.trim() || undefined);
      setStatusNote('');
    }
  };

  return (
    <div className={`fixed inset-0 z-[2000] transition-all pointer-events-none ${show ? 'pointer-events-auto' : ''}`}>
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => toggle(false)}
      />
      <aside
        className={`absolute top-0 right-0 h-full w-[480px] max-w-[95vw] aero-panel aero-corner flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.6)] transition-transform duration-300 ${
          show ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-aero-border bg-gradient-to-r from-aero-line/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-aero-line/15 border border-aero-line/40 flex items-center justify-center">
              <PencilRuler size={18} className="text-aero-line" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-aero-text">材料详情 · 口径追踪</div>
              <div className="text-[10px] font-mono text-aero-muted">ID: {m.id}</div>
            </div>
          </div>
          <button className="aero-btn !py-1 !px-2" onClick={() => toggle(false)}>
            <X size={14} />关闭
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <section className="p-4 border-b border-aero-border/50">
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <MaterialTypeBadge type={m.type} />
                <AnomalyBadges item={m} />
              </div>
              <ProcessStatusBadge status={m.processStatus} />
            </div>
            <h2 className="text-[15px] font-semibold text-aero-text mb-2">{m.name}</h2>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="aero-panel-inner p-2">
                <div className="text-aero-muted/80 mb-0.5">时间戳</div>
                <div className="text-aero-line flex items-center gap-1"><Clock size={11} />{m.timestamp}</div>
              </div>
              {m.position && (
                <div className="aero-panel-inner p-2">
                  <div className="text-aero-muted/80 mb-0.5">坐标 (经,纬,高)</div>
                  <div className="text-aero-line flex items-center gap-1">
                    <MapPin size={11} />{m.position.lng.toFixed(4)},{m.position.lat.toFixed(4)}
                    {m.position.altitude !== undefined && `,${m.position.altitude}m`}
                  </div>
                </div>
              )}
              {m.attachmentMeta && (
                <>
                  <div className="aero-panel-inner p-2 col-span-2">
                    <div className="text-aero-muted/80 mb-0.5">附件信息</div>
                    <div className="text-sky-300 flex items-center gap-1.5">
                      <FileText size={12} />{m.attachmentMeta.fileName}
                      <span className="text-aero-muted">({(m.attachmentMeta.fileSize / 1024).toFixed(1)} KB)</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[10px]">
                      <span className={m.attachmentMeta.isLate ? 'text-aero-warn' : 'text-aero-muted'}>
                        应到 {m.attachmentMeta.expectedTime.slice(11, 16)}
                      </span>
                      <ArrowRightLeft size={10} className="text-aero-muted/50" />
                      <span className="text-aero-muted">
                        实到 {m.attachmentMeta.uploadTime.slice(11, 16)}
                      </span>
                      {m.attachmentMeta.isLate && (
                        <span className="text-aero-danger font-semibold">
                          迟到 {Math.round((new Date(m.attachmentMeta.uploadTime).getTime()
                            - new Date(m.attachmentMeta.expectedTime).getTime()) / 60000)} 分钟
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
              {m.oralMeta && (
                <div className="aero-panel-inner p-2 col-span-2">
                  <div className="text-aero-muted/80 mb-0.5 flex items-center gap-1.5">
                    <MessageSquare size={11} />口述人: <span className="text-violet-300">{m.oralMeta.speaker}</span>
                  </div>
                  <div className="text-violet-200/90 text-[11px] leading-relaxed italic border-l-2 border-violet-500/40 pl-2">
                    "{m.oralMeta.transcript}"
                  </div>
                </div>
              )}
            </div>
            {gap && (
              <div className="mt-3 aero-panel-inner p-2.5 border-l-2 border-aero-danger">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert size={13} className="text-aero-danger" />
                  <span className="text-[11px] font-semibold text-aero-danger">关联时间轴缺段 · {gap.id.toUpperCase()}</span>
                  <SeverityBadge severity={gap.severity} />
                </div>
                <div className="font-mono text-[10px] text-aero-muted mb-1">
                  {gap.start.slice(11, 16)} ~ {gap.end.slice(11, 16)} · 共 {gap.durationMinutes} 分钟
                </div>
                <div className="text-[10px] text-aero-muted/80">{gap.note}</div>
              </div>
            )}
          </section>

          <section className="p-4 border-b border-aero-border/50">
            <h3 className="text-[12px] font-semibold text-aero-text mb-3 flex items-center gap-2">
              <PencilRuler size={13} className="text-blue-400" />
              口径变更历史 <span className="font-mono text-[10px] text-aero-muted">({m.caliberHistory.length} 次修改)</span>
            </h3>
            {m.caliberHistory.length === 0 ? (
              <div className="text-[11px] text-aero-muted/60 py-5 text-center border border-dashed border-aero-border/40 rounded flex items-center justify-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />未修改过口径 · 初版数据
              </div>
            ) : (
              <ol className="relative border-l-2 border-blue-500/25 ml-2 space-y-3">
                {m.caliberHistory.map((c, i) => (
                  <li key={i} className="pl-4 relative">
                    <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-aero-panel shadow-glow-cyan"></span>
                    <div className="aero-panel-inner p-2.5 border border-blue-500/20 hover:border-blue-500/40 transition">
                      <div className="flex items-center justify-between flex-wrap gap-1 mb-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-blue-300">
                          <User size={11} />{c.changedBy}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-aero-muted">
                          <Clock size={11} />{c.changedAt.slice(5, 16)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-aero-muted/10 text-aero-muted font-mono">{c.field}</span>
                        <span className="line-through text-aero-muted/60 bg-aero-danger/10 px-1.5 py-0.5 rounded border border-aero-danger/20">
                          {c.beforeValue}
                        </span>
                        <ArrowRightLeft size={12} className="text-aero-line" />
                        <span className="text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 font-semibold">
                          {c.afterValue}
                        </span>
                      </div>
                      {c.reason && (
                        <div className="mt-1.5 text-[10px] text-aero-muted/80 italic flex items-start gap-1.5">
                          <AlertCircle size={11} className="mt-0.5 flex-shrink-0 text-aero-warn" />
                          {c.reason}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="p-4">
            <h3 className="text-[12px] font-semibold text-aero-text mb-3 flex items-center gap-2">
              <ShieldAlert size={13} className="text-aero-track" />
              标记处理状态 <span className="font-mono text-[10px] text-aero-muted">(当前: {m.processStatus})</span>
            </h3>
            <textarea
              value={statusNote}
              onChange={e => setStatusNote(e.target.value)}
              className="aero-input w-full mb-3 resize-none"
              rows={2}
              placeholder="处理说明 / 补充备注（可留空）"
            />
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map(o => (
                <button
                  key={o.key}
                  onClick={() => onSetStatus(o.key)}
                  className={`aero-btn justify-center !py-2 border ${o.cls} ${
                    m.processStatus === o.key ? 'ring-2 ring-aero-track/60' : ''
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {m.processNote && (
              <div className="mt-3 text-[10px] text-aero-muted/80 bg-aero-dim/60 border border-aero-border/50 p-2 rounded flex items-start gap-1.5">
                <AlertCircle size={11} className="mt-0.5 flex-shrink-0" />
                <span className="italic">现有备注: {m.processNote}</span>
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
};
