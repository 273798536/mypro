import { Camera, Save, Trash2, Eye } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { CameraView } from '../types';

interface Props {
  lastCameraPos: [number, number, number];
  lastCameraTarget: [number, number, number];
}

export default function ViewPanel({ lastCameraPos, lastCameraTarget }: Props) {
  const savedViews = useAppStore((s) => s.savedViews);
  const saveView = useAppStore((s) => s.saveView);
  const deleteView = useAppStore((s) => s.deleteView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [viewName, setViewName] = useState('');

  const handleSave = () => {
    if (!viewName.trim()) {
      alert('请输入视角名称');
      return;
    }
    saveView({
      name: viewName.trim(),
      position: lastCameraPos,
      target: lastCameraTarget,
      savedBy: '当前用户',
    });
    setViewName('');
  };

  const handleRestore = (v: CameraView) => {
    setCurrentView(v);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Camera size={16} className="text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">视角管理</h3>
        <span className="text-xs text-slate-400 ml-auto">
          运维老何：保存后次日可还原
        </span>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          value={viewName}
          onChange={(e) => setViewName(e.target.value)}
          placeholder="视角名称，如：客流对比视角"
          className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          onClick={handleSave}
          className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1"
        >
          <Save size={14} />
          保存
        </button>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto">
        {savedViews.length === 0 && (
          <div className="text-sm text-slate-400 py-4 text-center">
            暂无保存的视角
          </div>
        )}
        {savedViews.map((v) => (
          <div
            key={v.id}
            className="group flex items-center gap-2 p-2 rounded border border-slate-100 hover:border-primary-200 hover:bg-primary-50/40 transition-colors"
          >
            <button
              onClick={() => handleRestore(v)}
              className="flex-1 text-left"
              title="点击还原此视角"
            >
              <div className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <Eye size={13} className="text-primary-500" />
                {v.name}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {v.savedBy} · {v.savedAt}
              </div>
            </button>
            <button
              onClick={() => {
                if (confirm(`删除视角「${v.name}」？`)) deleteView(v.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
              title="删除"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
