import { useState } from 'react';
import {
  GitBranch,
  MessageSquare,
  Plus,
  ChevronDown,
  ChevronUp,
  SearchCode,
  X,
  StickyNote,
} from 'lucide-react';
import type { RigPoint, PointStatus, SourceType } from '../types';
import { useAppStore } from '../store/appStore';
import { cn } from '../lib/utils';
import dayjs from 'dayjs';
import TraceModal from './TraceModal';

const STATUS_META: Record<PointStatus, { label: string; cls: string }> = {
  approved: { label: '已通过', cls: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/50' },
  pending: { label: '待审核', cls: 'bg-amber-600/20 text-amber-300 border-amber-600/50' },
  conflict: { label: '冲突', cls: 'bg-red-700/20 text-red-200 border-red-700/60' },
  withdrawn: { label: '已撤回', cls: 'bg-gray-600/20 text-gray-300 border-gray-500/50 line-through' },
  rejected: { label: '已驳回', cls: 'bg-red-600/20 text-red-300 border-red-600/50' },
};

const SOURCE_META: Record<SourceType, { label: string; cls: string }> = {
  official: { label: '正式数据', cls: 'bg-emerald-600/30 text-emerald-200 border-emerald-600/50' },
  verbal: { label: '口头备注', cls: 'bg-amber-600/30 text-amber-200 border-amber-600/50' },
  old_withdrawn: { label: '旧版/撤回', cls: 'bg-gray-500/30 text-gray-300 border-gray-500/50' },
};

function PointRow({ point, selected }: { point: RigPoint; selected: boolean }) {
  const store = useAppStore();
  const [expanded, setExpanded] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [isVerbal, setIsVerbal] = useState(false);
  const [author, setAuthor] = useState('方案经理-小赵');
  const [showAdd, setShowAdd] = useState(false);

  const toggle = store.togglePointSelect;
  const notes = (store.notesByPointId[point.id] ?? []).concat(point.notes.filter(n => !(store.notesByPointId[point.id] ?? []).some(x => x.id === n.id)));

  const submitNote = () => {
    if (!noteDraft.trim()) return;
    store.addNote(point.id, {
      pointId: point.id,
      content: noteDraft.trim(),
      isVerbal,
      author,
    });
    setNoteDraft('');
    setShowAdd(false);
  };

  const anomaliesForPoint = store.anomalies.filter(
    a => a.pointId === point.id || (a.versionId === point.versionId && !a.pointId),
  );
  const version = store.versions.find(v => v.id === point.versionId);

  return (
    <div
      className={cn(
        'border-b border-slate-800/70 last:border-b-0 transition-colors',
        selected && 'bg-brass-900/20',
        'hover:bg-slate-800/40 cursor-pointer',
      )}
      onClick={() => toggle(point.id)}
    >
      <div className="grid grid-cols-12 gap-2 px-3 py-2.5 text-[12px] items-center">
        <div className="col-span-3 text-slate-100 font-mono font-medium flex items-center gap-1.5">
          <span className={cn(
            'w-1.5 h-1.5 rounded-full',
            point.status === 'approved' && 'bg-emerald-500',
            point.status === 'pending' && 'bg-amber-500',
            point.status === 'conflict' && 'bg-red-600 animate-pulse',
            point.status === 'withdrawn' && 'bg-gray-500',
            point.status === 'rejected' && 'bg-red-500',
          )} />
          {point.rigNo}
        </div>

        <div className="col-span-2 text-slate-400 text-[11px]">{point.zone}</div>

        <div className="col-span-4 text-slate-300 font-mono text-[11px] tabular-nums">
          <span className="text-slate-500 mr-0.5">X</span>{point.x_coord.toFixed(2)}
          <span className="text-slate-500 mx-1">Y</span>{point.y_coord.toFixed(2)}
          <span className="text-slate-500 mx-1">Z</span>{point.z_coord.toFixed(2)}
        </div>

        <div className="col-span-3 flex items-center justify-end gap-1.5">
          {point.isOldVersion && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-500/50 bg-gray-600/20 text-gray-300">
              旧版
            </span>
          )}
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded border',
            STATUS_META[point.status].cls,
          )}>
            {STATUS_META[point.status].label}
          </span>
          {anomaliesForPoint.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center border border-red-400/70">
              {anomaliesForPoint.length}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
            className="w-6 h-6 rounded-md bg-slate-800/60 hover:bg-slate-700/70 border border-slate-700/60 text-slate-400 hover:text-brass-300 flex items-center justify-center transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div
          className="px-3 pb-3 pt-1 border-t border-slate-800/60 bg-slate-900/40"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <GitBranch size={12} className="text-brass-400" />
                版本: {version?.label ?? '—'}
              </span>
              <span>
                来源: {point.dataSources.map((s, i) => (
                  <span
                    key={i}
                    className={cn(
                      'inline-block text-[10px] px-1.5 py-0.5 rounded border ml-1',
                      SOURCE_META[s.sourceType].cls,
                    )}
                  >
                    {SOURCE_META[s.sourceType].label}·{Math.round(s.impactWeight * 100)}%
                  </span>
                ))}
              </span>
            </div>
            <button
              onClick={() => store.showTrace(point.id)}
              className="flex items-center gap-1 text-[11px] text-brass-300 hover:text-brass-200 px-2 h-6 rounded-md bg-brass-900/30 hover:bg-brass-900/50 border border-brass-700/50 transition-colors"
            >
              <SearchCode size={12} />
              数据溯源
            </button>
          </div>

          <div className="border-t border-slate-800/60 pt-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[12px] text-slate-300 flex items-center gap-1.5">
                <StickyNote size={13} className="text-brass-400" />
                人工备注 ({notes.length})
              </h4>
              <button
                onClick={() => setShowAdd(v => !v)}
                className="flex items-center gap-1 text-[11px] px-2 h-6 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 transition-colors"
              >
                <Plus size={12} />
                添加
              </button>
            </div>

            {showAdd && (
              <div className="mb-3 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 space-y-2">
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="输入备注内容..."
                  className="w-full h-16 p-2 rounded-md bg-slate-900/80 border border-slate-700/60 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brass-600/60 resize-none"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="h-6 px-2 rounded-md bg-slate-900/80 border border-slate-700/60 text-[11px] text-slate-200 focus:outline-none focus:border-brass-600/60 w-40"
                    placeholder="记录人"
                  />
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={isVerbal}
                      onChange={(e) => setIsVerbal(e.target.checked)}
                      className="accent-amber-500"
                    />
                    标记为口头备注
                  </label>
                  <div className="flex-1" />
                  <button
                    onClick={() => { setShowAdd(false); setNoteDraft(''); }}
                    className="h-6 px-2 rounded-md text-[11px] text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={submitNote}
                    className="h-6 px-3 rounded-md text-[11px] bg-brass-600/80 hover:bg-brass-500 text-[#0A1628] font-medium transition-colors"
                  >
                    确定
                  </button>
                </div>
              </div>
            )}

            {notes.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic py-2">暂无备注，可点击上方"添加"记录</p>
            ) : (
              <div className="space-y-2">
                {notes.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'rounded-lg p-2.5 border text-[11px]',
                      n.isVerbal
                        ? 'bg-amber-900/15 border-amber-700/40'
                        : 'bg-slate-800/40 border-slate-700/50',
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded border',
                        n.isVerbal
                          ? 'bg-amber-700/30 text-amber-200 border-amber-600/50'
                          : 'bg-slate-700/40 text-slate-300 border-slate-600/50',
                      )}>
                        {n.isVerbal ? '口头备注' : '书面备注'}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        {n.author} · {dayjs(n.createdAt).format('MM-DD HH:mm')}
                      </span>
                    </div>
                    <p className="text-slate-200 leading-relaxed">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DetailPanel() {
  const store = useAppStore();
  const getFilteredPoints = store.getFilteredPoints;
  const getActiveVersion = store.getActiveVersion;
  const getAnomaliesForActiveVersion = store.getAnomaliesForActiveVersion;

  const filters = useAppStore((s) => s.filters);
  const pointsByVersionId = useAppStore((s) => s.pointsByVersionId);
  const anomalies = useAppStore((s) => s.anomalies);
  const versions = useAppStore((s) => s.versions);
  const selectedIds = useAppStore((s) => s.viewState.selectedPointIds);
  const activeVersionId = useAppStore((s) => s.viewState.activeVersionId);
  const traceId = useAppStore((s) => s.viewState.showTraceModalFor);

  const points = getFilteredPoints();
  const activeVersion = getActiveVersion();
  const anomaliesForVersion = getAnomaliesForActiveVersion();

  return (
    <div className="h-full flex flex-col bg-[#0B1A30]/80 backdrop-blur-sm border-l border-slate-800/70">
      <div className="h-11 px-4 border-b border-slate-800/70 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-brass-400" />
          <span className="text-[12.5px] text-slate-200 font-medium">点位明细</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60">
            {points.length} 条
          </span>
          {selectedIds.length > 0 && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-brass-900/50 text-brass-300 border border-brass-700/50">
              已选 {selectedIds.length}
            </span>
          )}
        </div>
        {anomaliesForVersion.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-800/70">
            本版异常 {anomaliesForVersion.length}
          </span>
        )}
      </div>

      <div className="grid grid-cols-12 px-3 py-2 text-[10px] text-slate-500 border-b border-slate-800/70 shrink-0 bg-[#0A1729]">
        <div className="col-span-3">编号</div>
        <div className="col-span-2">区域</div>
        <div className="col-span-4">坐标 (X/Y/Z)</div>
        <div className="col-span-3 text-right">状态</div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {points.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-center mb-3">
              <SearchCode size={24} className="text-slate-600" />
            </div>
            <p className="text-[12px] text-slate-400 mb-1">没有匹配的点位</p>
            <p className="text-[11px] text-slate-600">请调整筛选条件或检查当前版本 {activeVersion?.label}</p>
          </div>
        ) : (
          points.map((p) => (
            <PointRow key={p.id} point={p} selected={selectedIds.includes(p.id)} />
          ))
        )}
      </div>

      <TraceModal />
    </div>
  );
}
