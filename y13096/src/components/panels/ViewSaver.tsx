import React, { useState } from 'react';
import { BookmarkPlus, Trash2, RotateCcw, Eye, Clock } from 'lucide-react';
import dayjs from 'dayjs';
import { useReplayStore } from '../../store/replayStore';

export const ViewSaver: React.FC = () => {
  const savedViews = useReplayStore(s => s.savedViews);
  const saveView = useReplayStore(s => s.saveView);
  const restoreView = useReplayStore(s => s.restoreView);
  const deleteView = useReplayStore(s => s.deleteView);
  const [name, setName] = useState('');
  const [hoverId, setHoverId] = useState<string | null>(null);

  const onSave = () => {
    const finalName = name.trim() || `彩排视图 · ${dayjs().format('MM-DD HH:mm')}`;
    saveView(finalName);
    setName('');
  };

  const onRestore = (id: string) => {
    const ok = restoreView(id);
    if (ok) {
      // small visual feedback
      const el = document.querySelector(`[data-view-id="${id}"]`);
      if (el) { el.classList.add('ring-2', 'ring-aero-track'); setTimeout(() => el.classList.remove('ring-2', 'ring-aero-track'), 900); }
    }
  };

  return (
    <div className="aero-panel p-3 aero-corner">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-aero-line" />
          <span className="text-[12px] font-semibold tracking-wider text-aero-text">已保存视图</span>
          <span className="font-mono text-[10px] text-aero-muted">({savedViews.length})</span>
        </div>
      </div>
      <div className="flex gap-2 mb-3">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSave()}
          className="aero-input flex-1"
          placeholder="输入视图名称，如：彩排V3视角"
        />
        <button className="aero-btn aero-btn-primary whitespace-nowrap" onClick={onSave}>
          <BookmarkPlus size={13} />保存当前
        </button>
      </div>
      <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1">
        {savedViews.length === 0 && (
          <div className="text-[11px] text-aero-muted/70 text-center py-5 border border-dashed border-aero-border/50 rounded">
            暂无保存视图 · 点击「保存当前」记住地图视角 + 筛选条件 + 时间位置
          </div>
        )}
        {savedViews.map(v => {
          const vs = v.viewState;
          const timeShort = vs.currentTime.slice(11, 16);
          const modifieds = vs.filter.hasModifiedCaliber === true ? '口径修改' : '全部口径';
          const anomaliesShort = vs.filter.anomalyStatus.length === 4 ? '全部异常' : vs.filter.anomalyStatus.map(a => ({
            normal: '正常', gap: '缺段', late: '晚到', modified: '改口径'
          } as Record<string,string>)[a]).join('/');
          return (
            <div
              key={v.id}
              data-view-id={v.id}
              onMouseEnter={() => setHoverId(v.id)}
              onMouseLeave={() => setHoverId(null)}
              onDoubleClick={() => onRestore(v.id)}
              className="group flex items-center justify-between gap-2 px-2.5 py-2 rounded aero-panel-inner border border-aero-border/40 hover:border-aero-line/50 hover:shadow-glow-cyan cursor-pointer transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-aero-text truncate">{v.name}</span>
                  <span className="font-mono text-[9px] text-aero-muted/80 px-1.5 py-0.5 rounded bg-aero-dim border border-aero-border/40">
                    {v.id}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-[10px] font-mono text-aero-muted">
                    <Clock size={10} className="text-aero-track" />{timeShort}
                  </span>
                  <span className="text-[10px] font-mono text-aero-muted/80">
                    {vs.camera.mode.toUpperCase()} · 中心({vs.camera.center.lng.toFixed(3)},{vs.camera.center.lat.toFixed(3)})·Z{vs.camera.zoom}
                  </span>
                  <span className="text-[10px] font-mono text-aero-line/80">[{anomaliesShort}]</span>
                  <span className="text-[10px] font-mono text-blue-400/80">[{modifieds}]</span>
                </div>
              </div>
              <div className={`flex items-center gap-1 transition-opacity ${hoverId === v.id ? 'opacity-100' : 'opacity-50'}`}>
                <button
                  className="p-1.5 rounded hover:bg-aero-line/15 text-aero-line border border-transparent hover:border-aero-line/40"
                  title="一键还原视角"
                  onClick={(e) => { e.stopPropagation(); onRestore(v.id); }}
                >
                  <RotateCcw size={12} />
                </button>
                <button
                  className="p-1.5 rounded hover:bg-aero-danger/15 text-aero-danger border border-transparent hover:border-aero-danger/40"
                  title="删除"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`删除视图「${v.name}」?`)) deleteView(v.id);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
