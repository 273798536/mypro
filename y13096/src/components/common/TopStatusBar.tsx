import React, { useEffect, useRef } from 'react';
import { Radar, Radio, Wifi, Clock, Camera, FileDown, Share2 } from 'lucide-react';
import dayjs from 'dayjs';
import { useReplayStore } from '../../store/replayStore';

export const TopStatusBar: React.FC = () => {
  const currentTime = useReplayStore(s => s.currentTime);
  const anomalySummary = useReplayStore(s => s.anomalySummary);
  const filter = useReplayStore(s => s.filter);
  const toggleExport = useReplayStore(s => s.toggleExportDialog);
  const saveViewQuick = useReplayStore(s => s.saveView);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    const t = document.getElementById('replay-root');
    if (!t) return;
    const tick = () => tickRef.current = requestAnimationFrame(() => {
      t.setAttribute('data-time', currentTime);
      tickRef.current && cancelAnimationFrame(tickRef.current);
    });
    tick();
    return () => { tickRef.current && cancelAnimationFrame(tickRef.current); };
  }, [currentTime]);

  const total = anomalySummary.byStatus.processed + anomalySummary.byStatus.need_evidence
    + anomalySummary.byStatus.rejected + anomalySummary.byStatus.untreated;
  const processedPct = total ? Math.round(anomalySummary.byStatus.processed / total * 100) : 0;

  const onSaveSnapshot = () => {
    const name = prompt('保存当前视角为：', `彩排快照 · ${dayjs().format('MM-DD HH:mm')}`);
    if (name !== null) {
      const id = saveViewQuick(name);
      if (id) alert(`视图已保存，下次可从左侧「已保存视图」一键还原 ✅`);
    }
  };

  return (
    <div className="h-14 flex items-center justify-between px-5 aero-panel-inner border-b border-aero-border bg-grid-scan relative overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-aero-line/70 to-transparent opacity-70"></div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-gradient-to-br from-aero-line/30 to-aero-line/10 border border-aero-line/40 flex items-center justify-center shadow-glow-cyan">
            <Radar size={20} className="text-aero-line" />
          </div>
          <div>
            <div className="font-display font-bold text-[15px] tracking-wider text-aero-text">
              AIR CORRIDOR · 低空航线时序回放
            </div>
            <div className="text-[10px] text-aero-muted font-mono tracking-wide">
              REQ · {filter.rawSqlLike.slice(0, 60)}{filter.rawSqlLike.length > 60 ? '…' : ''}
            </div>
          </div>
        </div>

        <div className="h-7 w-px bg-aero-border mx-1"></div>

        <div className="flex items-center gap-1.5 text-[11px] text-aero-muted font-mono">
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-aero-dim/60 border border-aero-border/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <Wifi size={12} className="text-aero-line" />
            <span className="text-aero-line">链路正常</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-aero-dim/60 border border-aero-border/60">
            <Radio size={12} className="text-aero-track" />
            <span className="text-aero-track">时基同步</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-aero-dim/60 border border-aero-border/60">
            <span className="w-1.5 h-1.5 rounded-full bg-aero-danger animate-pulse"></span>
            <span className="text-aero-danger">异常 {anomalySummary.timelineGaps + anomalySummary.lateAttachments + anomalySummary.modifiedCalibers}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-aero-muted font-mono uppercase tracking-widest">处理进度</div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-40 h-1.5 rounded-full bg-aero-dim overflow-hidden border border-aero-border/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-aero-line to-aero-track transition-all"
                  style={{ width: `${processedPct}%` }}
                />
              </div>
              <span className="font-display text-[12px] text-aero-line">{processedPct}%</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-3 py-1.5 rounded aero-panel-inner border border-aero-line/30 shadow-glow-cyan">
          <Clock size={14} className="text-aero-track" />
          <div className="font-display font-bold text-[18px] tracking-widest text-aero-track tabular-nums">
            {currentTime.slice(11)}
          </div>
          <div className="text-[10px] text-aero-muted font-mono">{currentTime.slice(0, 10)}</div>
        </div>

        <div className="h-7 w-px bg-aero-border"></div>

        <div className="flex items-center gap-2">
          <button className="aero-btn" onClick={onSaveSnapshot}>
            <Camera size={13} />保存视角
          </button>
          <button className="aero-btn" onClick={() => {
            navigator.clipboard?.writeText(JSON.stringify(filter, null, 2));
            alert('筛选口径JSON已复制到剪贴板');
          }}>
            <Share2 size={13} />分享口径
          </button>
          <button className="aero-btn aero-btn-primary" onClick={() => toggleExport(true)}>
            <FileDown size={13} />导出材料
          </button>
        </div>
      </div>
    </div>
  );
};
