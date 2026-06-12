import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Camera, Maximize, Plus, X, Trash2 } from 'lucide-react';

export default function ViewSnapshots() {
  const { snapshots, addSnapshot, applySnapshot, layers, viewState } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');

  const handleAdd = () => {
    if (snapshotName.trim()) {
      addSnapshot(snapshotName.trim());
      setSnapshotName('');
      setIsAdding(false);
    }
  };

  const getVisibleLayerColors = (snapshot: typeof snapshots[0]) => {
    return layers
      .filter((l) => snapshot.visibleLayers.includes(l.id))
      .slice(0, 4)
      .map((l) => l.color);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera size={16} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-200">视图快照</span>
          <span className="text-xs text-slate-500">{snapshots.length} 个</span>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded transition-colors"
        >
          <Plus size={12} />
          保存当前
        </button>
      </div>

      {isAdding && (
        <div className="mb-3 p-3 bg-slate-700/50 rounded border border-slate-600">
          <p className="text-xs text-slate-400 mb-2">保存视图条件</p>
          <input
            type="text"
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            placeholder="输入快照名称..."
            className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex items-center gap-2 mt-2">
            <p className="text-xs text-slate-500">
              缩放: {(viewState.scale * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-slate-500">
              图层: {layers.filter((l) => l.visible).length}个可见
            </p>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAdd}
              className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
            >
              保存
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setSnapshotName('');
              }}
              className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-slate-300 text-xs rounded transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {snapshots.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {snapshots.map((snapshot) => {
              const colors = getVisibleLayerColors(snapshot);

              return (
                <div
                  key={snapshot.id}
                  className="group relative bg-slate-800 rounded border border-slate-700 overflow-hidden hover:border-slate-500 transition-colors cursor-pointer"
                  onClick={() => applySnapshot(snapshot.id)}
                >
                  <div className="aspect-video bg-slate-900 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative w-3/4 h-1/2">
                        {colors.map((color, i) => (
                          <div
                            key={i}
                            className="absolute rounded-full opacity-60"
                            style={{
                              backgroundColor: color,
                              width: `${30 + i * 15}%`,
                              height: `${40 + i * 10}%`,
                              left: `${10 + i * 20}%`,
                              top: `${20 + i * 15}%`,
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="w-6 h-6 bg-slate-800/80 hover:bg-red-500/80 rounded flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="p-2">
                    <p className="text-xs text-slate-200 truncate font-medium">
                      {snapshot.name}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-500">
                        {(snapshot.scale * 100).toFixed(0)}%
                      </span>
                      <button
                        className="flex items-center gap-0.5 text-xs text-blue-400 hover:text-blue-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          applySnapshot(snapshot.id);
                        }}
                      >
                        <Maximize size={10} />
                        应用
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-sm">
            <Camera size={24} className="mx-auto mb-2 opacity-50" />
            <p>暂无视图快照</p>
            <p className="text-xs mt-1">点击上方按钮保存当前视图</p>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          保存内容：缩放比例、中心点位置、可见图层
        </p>
      </div>
    </div>
  );
}
