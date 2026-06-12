import { useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { Bookmark, Plus, Trash2, Layers, X, ChevronRight } from 'lucide-react';
import { useCalcStore } from '@/store/useCalcStore';
import type { MapViewPreset } from '@/types';

interface Props {
  getCurrentView: () => { center: [number, number]; zoom: number; bounds?: [[number, number], [number, number]] } | null;
  setMapInstance: (m: LeafletMap | null) => void;
}
void (0 as unknown as LeafletMap);

export default function ViewPresetDrawer(props: Props) {
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState('');
  const presets = useCalcStore(s => s.viewPresets);
  const activeId = useCalcStore(s => s.activeViewId);
  const saveView = useCalcStore(s => s.saveViewPreset);
  const applyView = useCalcStore(s => s.applyViewPreset);
  const delView = useCalcStore(s => s.deleteViewPreset);

  function confirmSave() {
    if (!newName.trim()) return;
    const v = props.getCurrentView();
    if (v) saveView(newName.trim(), v.center, v.zoom, v.bounds);
    setNaming(false); setNewName('');
  }

  return (
    <div className={`absolute bottom-3 left-3 z-[400] transition-all ${open ? 'w-[320px]' : 'w-auto'}`}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white shadow-card
                     border border-slate-200 hover:bg-ocean-50 text-sm text-ocean-900"
        >
          <Bookmark className="w-4 h-4 text-ocean-500" />
          <span className="font-medium">视角</span>
          {presets.length > 0 && <span className="text-xs text-ocean-500">{presets.length} 已保存</span>}
          <ChevronRight className="w-3.5 h-3.5 text-ocean-400" />
        </button>
      ) : (
        <div className="bg-white rounded-xl shadow-card-hover border border-slate-200 overflow-hidden animate-fade-in">
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-ocean-50 to-white">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-ocean-500" />
              <span className="font-serif font-semibold text-sm text-ocean-900">地图视角</span>
              <span className="text-[11px] text-ocean-500">评审截图用</span>
            </div>
            <button className="btn-ghost py-1" onClick={() => setOpen(false)}><X className="w-3.5 h-3.5" /></button>
          </div>

          <div className="p-3 space-y-2 max-h-64 overflow-y-auto workbench-scroll">
            {!naming && (
              <button
                onClick={() => setNaming(true)}
                className="w-full py-2 border-2 border-dashed rounded-lg border-ocean-200
                           text-ocean-600 text-xs hover:border-ocean-500 hover:bg-ocean-50
                           inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                保存当前视角
              </button>
            )}
            {naming && (
              <div className="p-2 rounded bg-ocean-50 border border-ocean-200 space-y-2">
                <input
                  className="input-field !py-1.5 text-xs" placeholder="视角名称，如：总体布设图 / 设备A放大"
                  value={newName} onChange={e => setNewName(e.target.value)} autoFocus
                />
                <div className="flex justify-end gap-1.5">
                  <button className="btn-ghost text-xs" onClick={() => { setNaming(false); setNewName(''); }}>取消</button>
                  <button className="btn-primary !py-1 !text-xs" onClick={confirmSave}>保存</button>
                </div>
              </div>
            )}

            {!presets.length && !naming && (
              <div className="text-center text-xs text-ocean-500 py-4">暂无保存视角，可保存若干常用视角供评审截图</div>
            )}

            {presets.map(p => (
              <PresetRow key={p.id} preset={p} active={p.id === activeId}
                         onApply={() => applyView(p.id)} onDelete={() => delView(p.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PresetRow({ preset, active, onApply, onDelete }: {
  preset: MapViewPreset; active: boolean;
  onApply: () => void; onDelete: () => void;
}) {
  return (
    <div
      onClick={onApply}
      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors
                  ${active ? 'bg-ocean-900 text-white' : 'bg-white hover:bg-ocean-50 border border-slate-200'}`}
    >
      <div className={`w-14 h-10 rounded shrink-0 flex items-center justify-center
                       ${active ? 'bg-white/10' : 'bg-ocean-100 border border-ocean-200'}`}>
        <div className={`w-9 h-6 rounded ${active ? 'bg-ocean-700' : 'bg-ocean-200'} relative overflow-hidden`}>
          <div className={`absolute bottom-0.5 left-1 w-2 h-2 rounded-full ${active ? 'bg-status-available' : 'bg-ocean-700'}`} />
          <div className={`absolute bottom-1.5 right-2 w-1.5 h-1.5 rounded-full ${active ? 'bg-status-deferred' : 'bg-ocean-500'}`} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${active ? '' : 'text-ocean-900'}`}>{preset.name}</div>
        <div className={`text-[10px] font-mono tabular-nums ${active ? 'text-ocean-100/80' : 'text-ocean-500'}`}>
          {preset.center[0].toFixed(3)}, {preset.center[1].toFixed(3)} · zoom {preset.zoom}
        </div>
      </div>
      <button
        className={`p-1.5 rounded hover:bg-black/10 ${active ? 'text-ocean-100' : 'text-ocean-500 hover:text-status-recollect'}`}
        onClick={e => { e.stopPropagation(); onDelete(); }}
        title="删除视角"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
