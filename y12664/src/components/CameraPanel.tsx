import { useState } from 'react';
import type { CameraRigApi } from './CameraRig';
import { useLayoutStore } from '@/hooks/useLayoutStore';
import { Camera, Plus, Trash2, RotateCcw } from 'lucide-react';

interface Props {
  rigApi: CameraRigApi | null;
}

export default function CameraPanel({ rigApi }: Props) {
  const cameraViews = useLayoutStore((s) => s.cameraViews);
  const removeCameraView = useLayoutStore((s) => s.removeCameraView);
  const [viewName, setViewName] = useState('');

  const handleSave = () => {
    if (!rigApi) return;
    const name = viewName.trim() || `视角 ${cameraViews.length + 1}`;
    rigApi.saveView(name);
    setViewName('');
  };

  const handleLoad = (view: { position: any; target: any }) => {
    if (!rigApi) return;
    rigApi.loadView(view);
  };

  const handleReset = () => {
    if (!rigApi) return;
    rigApi.resetView();
  };

  return (
    <div className="absolute left-4 bottom-4 z-10 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-lg p-3 text-slate-100 shadow-xl w-64">
      <div className="flex items-center gap-2 mb-2">
        <Camera className="w-4 h-4 text-sky-400" />
        <span className="text-xs uppercase tracking-widest text-slate-400">视角管理</span>
      </div>
      <div className="flex gap-1.5 mb-2">
        <input
          type="text"
          placeholder="视角名称..."
          value={viewName}
          onChange={(e) => setViewName(e.target.value)}
          className="flex-1 bg-slate-800/80 border border-slate-700/80 rounded px-2 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
        />
        <button
          type="button"
          onClick={handleSave}
          title="保存当前视角"
          className="flex items-center justify-center w-8 h-8 rounded bg-sky-600 hover:bg-sky-500 transition disabled:opacity-50"
          disabled={!rigApi}
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleReset}
          title="重置为默认视角"
          className="flex items-center justify-center w-8 h-8 rounded bg-slate-700/80 hover:bg-slate-600/80 transition disabled:opacity-50"
          disabled={!rigApi}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
      <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
        {cameraViews.length === 0 && (
          <div className="text-[11px] text-slate-500 italic">暂无已保存视角</div>
        )}
        {cameraViews.map((v) => (
          <div key={v.id} className="flex items-center gap-2 group">
            <button
              type="button"
              onClick={() => handleLoad(v)}
              className="flex-1 text-left text-xs px-2 py-1 rounded bg-slate-800/60 hover:bg-slate-700/80 truncate transition disabled:opacity-50"
              disabled={!rigApi}
            >
              {v.name}
            </button>
            <button
              type="button"
              onClick={() => removeCameraView(v.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/30 text-red-400 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
