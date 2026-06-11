import { Camera, Save, Trash2, Clock, Undo2 } from 'lucide-react';
import { useReviewStore } from '@/store/reviewStore';
import { useState } from 'react';
import { clsx } from 'clsx';

export function SnapshotBar() {
  const { snapshots, saveSnapshot, restoreSnapshot, isScreenshotMode, toggleScreenshotMode, cameraState, filters } = useReviewStore();
  const [snapName, setSnapName] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleSave = () => {
    const name = snapName.trim() || `快照 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;
    saveSnapshot(name);
    setSnapName('');
    setShowInput(false);
  };

  const activeFiltersCount = [
    filters.area,
    filters.materialType,
    filters.showOnlyAnomaly,
  ].filter(Boolean).length;

  return (
    <div className="bg-steel-800/60 backdrop-blur border border-steel-700 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-steel-700 flex items-center gap-2">
        <Camera className="w-4 h-4 text-industrial-400" />
        <h3 className="text-sm font-semibold text-steel-200 tracking-wide">视图快照</h3>
        <span className="text-[10px] text-steel-500 px-1.5 py-0.5 rounded bg-steel-700/50 font-mono">
          视角 + 筛选条件 一起保存
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleScreenshotMode}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-all',
              isScreenshotMode
                ? 'bg-warning-500 text-steel-900 font-semibold'
                : 'bg-steel-700/60 text-steel-300 hover:bg-steel-700',
            )}
          >
            <Camera className="w-3.5 h-3.5" />
            {isScreenshotMode ? '截图中' : '换视角截图'}
          </button>

          {!showInput ? (
            <button
              onClick={() => setShowInput(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-industrial-600 text-white hover:bg-industrial-500 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              保存快照
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={snapName}
                onChange={(e) => setSnapName(e.target.value)}
                placeholder="快照名称..."
                autoFocus
                className="bg-steel-900 border border-steel-600 rounded px-2 py-1.5 text-xs text-steel-200 placeholder-steel-600 focus:outline-none focus:border-industrial-500 w-40"
              />
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded bg-industrial-600 text-white hover:bg-industrial-500 transition-colors"
              >
                <Save className="w-3 h-3" />
              </button>
              <button
                onClick={() => { setShowInput(false); setSnapName(''); }}
                className="px-2.5 py-1.5 text-xs rounded bg-steel-700 text-steel-400 hover:bg-steel-600 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="text-[10px] text-steel-500 mb-2 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          已保存 {snapshots.length} 个快照 · 点击一键复原当时视角与筛选条件
          {activeFiltersCount > 0 && (
            <span className="ml-auto text-industrial-400">
              当前激活 {activeFiltersCount} 个筛选条件 · pos [{cameraState.position.map(v => v.toFixed(0)).join(',')}]
            </span>
          )}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {snapshots.map((s) => (
            <button
              key={s.id}
              onClick={() => restoreSnapshot(s.id)}
              className="group flex-shrink-0 w-44 text-left rounded-lg border border-steel-700 bg-steel-900/60 hover:border-industrial-500 hover:bg-industrial-600/10 transition-all"
            >
              <div className="h-20 bg-gradient-to-br from-industrial-900/40 via-steel-800 to-steel-900 rounded-t-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern bg-grid-20 opacity-20" />
                <div className="absolute bottom-1.5 right-1.5 text-[9px] font-mono text-steel-500 bg-steel-900/80 px-1.5 py-0.5 rounded">
                  fov {s.cameraState.fov}°
                </div>
                <Undo2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-steel-500 group-hover:text-industrial-400 transition-colors opacity-0 group-hover:opacity-100" />
              </div>
              <div className="p-2">
                <div className="text-xs text-steel-200 font-medium truncate group-hover:text-industrial-300 transition-colors">
                  {s.name}
                </div>
                <div className="text-[10px] text-steel-500 font-mono mt-0.5 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {s.timestamp}
                </div>
                {s.filterConditions.area && (
                  <div className="mt-1 text-[9px] text-industrial-400 bg-industrial-600/10 px-1.5 py-0.5 rounded inline-block">
                    {s.filterConditions.area}
                  </div>
                )}
                {s.filterConditions.showOnlyAnomaly && (
                  <div className="mt-1 ml-1 text-[9px] text-warning-400 bg-warning-500/10 px-1.5 py-0.5 rounded inline-block">
                    仅异常
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
