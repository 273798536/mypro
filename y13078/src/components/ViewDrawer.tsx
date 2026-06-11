import { useState } from 'react';
import { X, Image, Trash2, RotateCcw, Plus, Save } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatDate } from '@/utils/helpers';

export default function ViewDrawer() {
  const {
    views, viewDrawerOpen, closeViewDrawer,
    activeViewId, applyViewPreset, deleteViewPreset,
    saveViewPreset,
  } = useAppStore();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');

  const onSave = async () => {
    if (!newName.trim()) return;
    const v = await saveViewPreset(newName.trim());
    if (v) {
      setNewName(''); setShowNew(false);
    }
  };

  if (!viewDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={closeViewDrawer} />
      <div className="relative w-[360px] h-full bg-slate-900/95 border-l border-cold-border backdrop-blur-md flex flex-col animate-[slideIn_.25s_ease-out]">
        <div className="px-4 py-3 border-b border-cold-border flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              <Image className="w-4 h-4 text-cold-accent" />
              视角管理
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">保存当前缩放、平移和筛选条件</div>
          </div>
          <button onClick={closeViewDrawer} className="w-7 h-7 rounded-[2px] bg-slate-800/60 hover:bg-slate-700 flex items-center justify-center text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-cold-border">
          {!showNew ? (
            <button className="btn-industrial-primary w-full" onClick={() => setShowNew(true)}>
              <Plus className="w-3.5 h-3.5" /> 保存当前视角
            </button>
          ) : (
            <div className="space-y-2 p-2.5 bg-slate-800/60 rounded-[2px] border border-cold-border">
              <div className="text-[11px] text-slate-300 font-medium">输入视角名称</div>
              <input
                className="input-industrial text-xs"
                placeholder="例如：A区整体汇报视角"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button className="btn-industrial" onClick={() => { setShowNew(false); setNewName(''); }}>
                  取消
                </button>
                <button className="btn-industrial-primary" disabled={!newName.trim()} onClick={onSave}>
                  <Save className="w-3.5 h-3.5" /> 保存
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2.5">
          {views.length === 0 ? (
            <div className="py-12 text-center">
              <Image className="w-10 h-10 mx-auto text-slate-600 mb-3" />
              <div className="text-xs text-slate-400">尚无保存的视角</div>
              <div className="text-[10px] text-slate-500 mt-1">调度阿宁常用视角建议提前保存</div>
            </div>
          ) : (
            views.map(v => (
              <ViewCard
                key={v.id}
                view={v}
                active={v.id === activeViewId}
                onApply={() => applyViewPreset(v)}
                onDelete={() => deleteViewPreset(v.id)}
              />
            ))
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-cold-border text-[10px] text-slate-500 font-mono-data">
          共 {views.length} 个视角 · 缩放/平移/筛选一键复原
        </div>
      </div>
    </div>
  );
}

function ViewCard({
  view, active, onApply, onDelete,
}: {
  view: { id: string; name: string; createdAt: number; zoom: number; panX: number; panY: number; filters: { regions: string[]; types: string[]; statuses: string[]; showWithdrawn: boolean } };
  active: boolean;
  onApply: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group rounded-[2px] border transition-all ${
        active
          ? 'border-cold-primaryLight bg-cold-primaryLight/10 shadow-[0_0_0_1px_rgba(37,99,235,.25)]'
          : 'border-cold-border bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70'
      }`}
    >
      <div className="flex items-stretch">
        <div className={`w-20 h-14 m-2 rounded-[2px] shrink-0 flex items-center justify-center overflow-hidden ${
          active ? 'bg-cold-primary/40' : 'bg-slate-900/60'
        } border border-cold-border`}>
          <MiniPreview view={view} />
        </div>
        <div className="flex-1 p-2 pl-0 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-slate-100 truncate">
                {view.name}
              </div>
              <div className="text-[10px] font-mono-data text-slate-500 mt-0.5">
                缩放 {Math.round(view.zoom * 100)}%
              </div>
            </div>
            {active && (
              <span className="chip chip-active shrink-0 !py-0">当前</span>
            )}
          </div>
          <div className="mt-auto pt-1.5 flex items-center justify-between">
            <div className="text-[9px] text-slate-500 font-mono-data">
              {formatDate(view.createdAt)}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="w-6 h-6 rounded-[1px] bg-slate-700/60 hover:bg-cold-primaryLight text-slate-300 hover:text-white flex items-center justify-center"
                onClick={onApply}
                title="应用此视角"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                className="w-6 h-6 rounded-[1px] bg-slate-700/60 hover:bg-cold-danger text-slate-300 hover:text-white flex items-center justify-center"
                onClick={onDelete}
                title="删除"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="px-2.5 pb-2 flex flex-wrap gap-1">
        <span className="chip chip-idle !py-0 !text-[9px]">
          区域 {view.filters.regions.join('/') || '全部'}
        </span>
        <span className="chip chip-idle !py-0 !text-[9px]">
          {view.filters.types.length}类设备
        </span>
        <span className="chip chip-idle !py-0 !text-[9px]">
          {view.filters.showWithdrawn ? '含撤回' : '不含撤回'}
        </span>
      </div>
    </div>
  );
}

function MiniPreview({ view }: { view: { filters: { regions: string[] } } }) {
  const hasA = view.filters.regions.includes('A');
  const hasB = view.filters.regions.includes('B');
  return (
    <svg viewBox="0 0 60 40" className="w-full h-full">
      <rect width="60" height="40" fill="#0B1220" />
      <rect x="4" y="6" width="22" height="12" rx="1"
        fill={hasA ? '#1E3A5F' : '#1E293B'}
        stroke={hasA ? '#2563EB' : '#334155'} strokeWidth="0.5" />
      <rect x="34" y="6" width="22" height="12" rx="1"
        fill={hasA ? '#1E3A5F' : '#1E293B'}
        stroke={hasA ? '#2563EB' : '#334155'} strokeWidth="0.5" />
      <rect x="4" y="22" width="22" height="12" rx="1"
        fill={hasB ? '#78350F' : '#1E293B'}
        stroke={hasB ? '#F59E0B' : '#334155'} strokeWidth="0.5" />
      <rect x="34" y="22" width="22" height="12" rx="1"
        fill={hasB ? '#78350F' : '#1E293B'}
        stroke={hasB ? '#F59E0B' : '#334155'} strokeWidth="0.5" />
      <circle cx="15" cy="12" r="1.2" fill="#10B981" />
      <circle cx="45" cy="12" r="1.2" fill="#06B6D4" />
      <circle cx="15" cy="28" r="1.2" fill="#EF4444" />
      <circle cx="45" cy="28" r="1.2" fill="#F59E0B" />
    </svg>
  );
}
