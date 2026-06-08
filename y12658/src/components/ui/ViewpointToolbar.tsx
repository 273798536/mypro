import { useState } from 'react';
import { Camera, Save, Trash2, ChevronDown, RotateCw } from 'lucide-react';
import { useViewStore } from '@/store/useViewStore';

export default function ViewpointToolbar() {
  const viewpoints = useViewStore((s) => s.viewpoints);
  const activeId = useViewStore((s) => s.activeViewpointId);
  const saveViewpoint = useViewStore((s) => s.saveViewpoint);
  const restoreViewpoint = useViewStore((s) => s.restoreViewpoint);
  const deleteViewpoint = useViewStore((s) => s.deleteViewpoint);
  const autoRotate = useViewStore((s) => s.autoRotate);
  const setAutoRotate = useViewStore((s) => s.setAutoRotate);
  const [open, setOpen] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState('');
  const [remark, setRemark] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;
    saveViewpoint(name.trim(), remark.trim() || undefined);
    setName('');
    setRemark('');
    setShowSave(false);
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 panel-ocean px-2 py-1.5">
      <div className="flex items-center gap-1 pr-2 border-r border-ocean-700">
        <Camera className="w-4 h-4 text-data-cyan" />
        <span className="text-xs font-mono text-slate-200">视角</span>
        <span className="chip-ocean ml-1">
          {viewpoints.find((v) => v.id === activeId)?.name ?? '自由视角'}
        </span>
      </div>

      <button
        className={`btn-ocean flex items-center gap-1 ${autoRotate ? 'text-data-cyan border-data-cyan/50' : ''}`}
        onClick={() => setAutoRotate(!autoRotate)}
        title="自动旋转"
      >
        <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
      </button>

      <div className="relative">
        <button className="btn-ocean flex items-center gap-1" onClick={() => setOpen(!open)}>
          <span>切换</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 panel-ocean p-1 min-w-[220px] max-h-64 overflow-y-auto z-20">
            {viewpoints.length === 0 && (
              <div className="text-xs text-slate-500 p-2">暂无已保存视角</div>
            )}
            {viewpoints.map((v) => (
              <div
                key={v.id}
                className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-ocean-700/60 ${
                  v.id === activeId ? 'bg-data-cyan/10 text-data-cyan' : 'text-slate-300'
                }`}
              >
                <div className="flex-1 min-w-0" onClick={() => { restoreViewpoint(v.id); setOpen(false); }}>
                  <div className="font-mono truncate">{v.name}</div>
                  {v.remark && <div className="text-[10px] text-slate-500 truncate">{v.remark}</div>}
                </div>
                <button
                  className="text-slate-500 hover:text-data-red p-0.5"
                  onClick={(e) => { e.stopPropagation(); deleteViewpoint(v.id); }}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {!showSave ? (
        <button className="btn-ocean-primary flex items-center gap-1" onClick={() => setShowSave(true)}>
          <Save className="w-3.5 h-3.5" />
          <span>保存</span>
        </button>
      ) : (
        <div className="flex items-center gap-1 pl-2 border-l border-ocean-700">
          <input
            className="bg-ocean-800 border border-ocean-600 rounded px-2 py-1 text-xs w-28 text-slate-200 outline-none focus:border-data-cyan"
            placeholder="视角名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <input
            className="bg-ocean-800 border border-ocean-600 rounded px-2 py-1 text-xs w-28 text-slate-200 outline-none focus:border-data-cyan"
            placeholder="备注（可选）"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
          <button className="btn-ocean-primary text-xs" onClick={handleSave}>确认</button>
          <button className="btn-ocean text-xs" onClick={() => { setShowSave(false); setName(''); setRemark(''); }}>取消</button>
        </div>
      )}
    </div>
  );
}
