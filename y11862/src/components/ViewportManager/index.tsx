import { useState } from 'react';
import { Camera, Save, Trash2, Play, Home } from 'lucide-react';
import { useViewport } from '../../hooks/useViewport';
import { useSpectrumStore } from '../../store/spectrumStore';

export function ViewportManager() {
  const [newViewportName, setNewViewportName] = useState('');
  const { saveCurrentViewport, applyViewport, resetViewport, viewports } = useViewport();
  const { deleteViewport } = useSpectrumStore();

  const handleSave = () => {
    if (!newViewportName.trim()) return;
    const success = saveCurrentViewport(newViewportName.trim());
    if (success) {
      setNewViewportName('');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Camera className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-white">视角管理</h3>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="输入视角名称..."
          value={newViewportName}
          onChange={(e) => setNewViewportName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <button
          onClick={handleSave}
          disabled={!newViewportName.trim()}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-xs text-white font-medium transition-all"
        >
          <Save className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        onClick={resetViewport}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition-all"
      >
        <Home className="w-3.5 h-3.5" />
        重置到默认视角
      </button>

      {viewports.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-500 font-medium">已保存的视角 ({viewports.length})</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {viewports.map((vp) => (
              <div
                key={vp.id}
                className="group flex items-center gap-2 px-2 py-1.5 bg-gray-800/50 hover:bg-gray-800 rounded transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate">{vp.name}</p>
                  <p className="text-[10px] text-gray-500">{formatDate(vp.createdAt)}</p>
                </div>
                <button
                  onClick={() => applyViewport(vp.id)}
                  className="p-1 text-gray-500 hover:text-emerald-400 transition-all opacity-0 group-hover:opacity-100"
                  title="应用视角"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteViewport(vp.id)}
                  className="p-1 text-gray-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                  title="删除视角"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-3 border-t border-gray-700">
        <p className="text-[10px] text-gray-600 space-y-1">
          <p>💡 鼠标左键拖拽：旋转视角</p>
          <p>💡 鼠标滚轮：缩放</p>
          <p>💡 鼠标右键拖拽：平移</p>
          <p>💡 双击空白：重置视角</p>
        </p>
      </div>
    </div>
  );
}
