import React from 'react';
import { SlidersHorizontal, RotateCcw, Filter, FileWarning, ClockAlert, PenTool, CheckCircle2 } from 'lucide-react';
import { useReplayStore } from '../../store/replayStore';
import dayjs from 'dayjs';
import { DEMO_DATE } from '../../data/demoData';
import type { AnomalyTag, MaterialType, ProcessStatus } from '../../../shared/types';

const timeToInput = (ts: string) => ts.slice(11, 16);
const inputToFull = (hhmm: string) => `${DEMO_DATE} ${hhmm}:00`;

export const FilterToolbar: React.FC = () => {
  const filter = useReplayStore(s => s.filter);
  const setDateRange = useReplayStore(s => s.setDateRange);
  const toggleAnomalyStatus = useReplayStore(s => s.toggleAnomalyStatus);
  const toggleMaterialType = useReplayStore(s => s.toggleMaterialType);
  const setModifiedCaliberOnly = useReplayStore(s => s.setModifiedCaliberOnly);
  const toggleProcessStatus = useReplayStore(s => s.toggleProcessStatus);
  const resetFilter = useReplayStore(s => s.resetFilter);

  const anomalyTags: { key: AnomalyTag; label: string; Icon: any; cls: string }[] = [
    { key: 'normal',   label: '正常',     Icon: CheckCircle2, cls: 'border-emerald-500/35 text-emerald-300 data-[on=1]:bg-emerald-500/15' },
    { key: 'gap',      label: '缺段',     Icon: FileWarning, cls: 'border-aero-danger/50 text-aero-danger data-[on=1]:bg-aero-danger/15' },
    { key: 'late',     label: '晚到附件', Icon: ClockAlert,  cls: 'border-aero-warn/50 text-aero-warn data-[on=1]:bg-aero-warn/15' },
    { key: 'modified', label: '改过口径', Icon: PenTool,     cls: 'border-blue-500/40 text-blue-300 data-[on=1]:bg-blue-500/15' }
  ];

  const materialTags: { key: MaterialType; label: string; color: string }[] = [
    { key: 'point',      label: '点位坐标', color: 'border-aero-line/50 text-aero-line data-[on=1]:bg-aero-line/15' },
    { key: 'attachment', label: '附件材料', color: 'border-sky-500/40 text-sky-300 data-[on=1]:bg-sky-500/15' },
    { key: 'oral',       label: '口头说明', color: 'border-violet-500/40 text-violet-300 data-[on=1]:bg-violet-500/15' }
  ];

  const processTags: { key: ProcessStatus; label: string; color: string }[] = [
    { key: 'processed',     label: '已处理',   color: 'border-emerald-500/35 text-emerald-300 data-[on=1]:bg-emerald-500/15' },
    { key: 'need_evidence', label: '待补证据', color: 'border-aero-warn/50 text-aero-warn data-[on=1]:bg-aero-warn/15' },
    { key: 'rejected',      label: '已驳回',   color: 'border-rose-500/40 text-rose-300 data-[on=1]:bg-rose-500/15' },
    { key: 'untreated',     label: '未处理',   color: 'border-slate-500/40 text-slate-300 data-[on=1]:bg-slate-500/15' }
  ];

  const Chip: React.FC<{ on: boolean; onClick: () => void; cls: string; Icon?: any; label: string }>
    = ({ on, onClick, cls, Icon, label }) => (
    <button
      data-on={on ? 1 : 0}
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border bg-transparent transition-all ${cls} ${on ? '' : 'opacity-60 hover:opacity-90'}`}
    >
      {Icon && <Icon size={11} />}
      {label}
    </button>
  );

  return (
    <div className="aero-panel p-3 aero-corner">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-aero-line" />
          <span className="text-[12px] font-semibold tracking-wider text-aero-text">筛选工具栏</span>
          <span className="font-mono text-[10px] text-aero-muted/80">导出时一并写入接口返回</span>
        </div>
        <button onClick={resetFilter} className="aero-btn !py-1 !px-2 text-[10px]">
          <RotateCcw size={11} />重置
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-aero-muted mb-1.5 flex items-center gap-1">
            <SlidersHorizontal size={10} />时间范围 (点击左右拖动时间轴更直观)
          </div>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={timeToInput(filter.dateRange.start)}
              onChange={e => setDateRange(inputToFull(e.target.value), filter.dateRange.end)}
              className="aero-input font-mono"
            />
            <span className="text-aero-muted text-[11px] font-mono">→</span>
            <input
              type="time"
              value={timeToInput(filter.dateRange.end)}
              onChange={e => setDateRange(filter.dateRange.start, inputToFull(e.target.value))}
              className="aero-input font-mono"
            />
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-aero-muted mb-1.5">异常标记 (多选)</div>
          <div className="flex flex-wrap gap-1.5">
            {anomalyTags.map(a => (
              <Chip key={a.key} on={filter.anomalyStatus.includes(a.key)}
                onClick={() => toggleAnomalyStatus(a.key)} cls={a.cls} Icon={a.Icon} label={a.label} />
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-aero-muted mb-1.5">材料类型 (多选)</div>
          <div className="flex flex-wrap gap-1.5">
            {materialTags.map(a => (
              <Chip key={a.key} on={filter.materialTypes.includes(a.key)}
                onClick={() => toggleMaterialType(a.key)} cls={a.color} label={a.label} />
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-aero-muted mb-1.5">口径修改</div>
          <div className="flex flex-wrap gap-1.5">
            <Chip on={filter.hasModifiedCaliber === null} onClick={() => setModifiedCaliberOnly(null)}
              cls="border-aero-line/40 text-aero-line data-[on=1]:bg-aero-line/15" label="全部" />
            <Chip on={filter.hasModifiedCaliber === true} onClick={() => setModifiedCaliberOnly(true)}
              cls="border-blue-500/40 text-blue-300 data-[on=1]:bg-blue-500/15" Icon={PenTool} label="仅改过口径" />
            <Chip on={filter.hasModifiedCaliber === false} onClick={() => setModifiedCaliberOnly(false)}
              cls="border-emerald-500/35 text-emerald-300 data-[on=1]:bg-emerald-500/15" label="未修改" />
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-aero-muted mb-1.5">处理状态 (多选)</div>
          <div className="flex flex-wrap gap-1.5">
            {processTags.map(a => (
              <Chip key={a.key} on={filter.processStatuses.includes(a.key)}
                onClick={() => toggleProcessStatus(a.key)} cls={a.color} label={a.label} />
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-dashed border-aero-border/50">
          <div className="text-[10px] font-mono uppercase tracking-wider text-aero-muted mb-1">
            🔎 筛选口径 (模拟接口返回 FilterSnapshot)
          </div>
          <pre className="text-[10px] font-mono text-aero-line/90 bg-aero-dim/60 border border-aero-border/50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
{JSON.stringify(filter, null, 1)}
          </pre>
        </div>
      </div>
    </div>
  );
};
