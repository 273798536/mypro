import { useAppStore } from '@/store/useAppStore';
import { Viewpoint } from '@/types';
import { X, Camera, Trash2, MapPin, Clock, Plus } from 'lucide-react';
import { useState } from 'react';

interface ViewpointCardProps {
  viewpoint: Viewpoint;
  onRestore: () => void;
  onDelete: () => void;
}

function ViewpointCard({ viewpoint, onRestore, onDelete }: ViewpointCardProps) {
  return (
    <div className="group p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-cyan-500/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
            <Camera size={20} className="text-cyan-400" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">{viewpoint.name}</h4>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <Clock size={10} />
              {new Date(viewpoint.timestamp).toLocaleString('zh-CN')}
            </div>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="mb-3 p-2 bg-slate-900/50 rounded text-xs font-mono">
        <div className="flex gap-4 text-slate-400">
          <span>
            <MapPin size={10} className="inline mr-1" />
            位置: ({viewpoint.position.map(v => v.toFixed(1)).join(', ')})
          </span>
        </div>
        <div className="text-slate-500 mt-1">
          目标: ({viewpoint.target.map(v => v.toFixed(1)).join(', ')})
        </div>
      </div>

      <button
        onClick={onRestore}
        className="w-full px-3 py-2 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1"
      >
        <Camera size={12} />
        恢复此视角
      </button>
    </div>
  );
}

export default function ViewpointModal() {
  const showModal = useAppStore(state => state.showViewpointModal);
  const viewpoints = useAppStore(state => state.viewpoints);
  const { toggleViewpointModal, saveViewpoint, deleteViewpoint, restoreViewpoint } = useAppStore(state => state.actions);
  const [newViewpointName, setNewViewpointName] = useState('');
  const [currentPosition, setCurrentPosition] = useState<[number, number, number]>([80, 60, 80]);
  const [currentTarget, setCurrentTarget] = useState<[number, number, number]>([0, 0, 0]);

  if (!showModal) return null;

  const handleSave = () => {
    if (!newViewpointName.trim()) return;
    saveViewpoint(newViewpointName.trim(), currentPosition, currentTarget);
    setNewViewpointName('');
  };

  const updateCameraState = (pos: [number, number, number], tgt: [number, number, number]) => {
    setCurrentPosition(pos);
    setCurrentTarget(tgt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            <Camera size={20} className="text-cyan-400" />
            视角管理
          </h2>
          <button
            onClick={() => toggleViewpointModal(false)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-sm font-medium text-white mb-3">保存当前视角</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newViewpointName}
                onChange={(e) => setNewViewpointName(e.target.value)}
                placeholder="输入视角名称..."
                className="flex-1 px-4 py-2 text-sm bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={!newViewpointName.trim()}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus size={16} />
                保存
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              当前相机位置: ({currentPosition.map(v => v.toFixed(1)).join(', ')})
            </p>
          </div>

          <div className="grid gap-4">
            {viewpoints.map(vp => (
              <ViewpointCard
                key={vp.id}
                viewpoint={vp}
                onRestore={() => {
                  restoreViewpoint(vp.id);
                  toggleViewpointModal(false);
                }}
                onDelete={() => deleteViewpoint(vp.id)}
              />
            ))}
          </div>

          {viewpoints.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Camera size={48} className="mb-3 opacity-30" />
              <p className="text-sm">暂无保存的视角</p>
              <p className="text-xs">在上方输入名称保存当前视角</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
