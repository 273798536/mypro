import { useState } from 'react';
import { Camera, Save, Trash2, Play } from 'lucide-react';
import { useAppStore } from '../store/appStore';

interface ViewpointControlsProps {
  currentPosition: [number, number, number];
  currentTarget: [number, number, number];
  onLoadViewpoint: (vp: { position: [number, number, number]; target: [number, number, number] }) => void;
}

export default function ViewpointControls({
  currentPosition,
  currentTarget,
  onLoadViewpoint,
}: ViewpointControlsProps) {
  const { viewpoints, saveViewpoint, deleteViewpoint } = useAppStore();
  const [showList, setShowList] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    if (newName.trim()) {
      saveViewpoint(newName.trim(), currentPosition, currentTarget);
      setNewName('');
      setIsSaving(false);
    }
  };

  const handleLoad = (vp: typeof viewpoints[0]) => {
    onLoadViewpoint({
      position: vp.cameraPosition,
      target: vp.cameraTarget,
    });
    setShowList(false);
  };

  return (
    <div className="absolute top-4 right-4 z-10">
      <div className="flex gap-2">
        <button
          onClick={() => setIsSaving(!isSaving)}
          className="flex items-center gap-1 px-3 py-2 bg-[#1a2d4a] border border-[#3A4A5C] rounded hover:border-[#D4A843] text-[#F5F0E8] text-sm transition-colors"
        >
          <Save size={14} />
          保存视角
        </button>
        <button
          onClick={() => setShowList(!showList)}
          className="flex items-center gap-1 px-3 py-2 bg-[#1a2d4a] border border-[#3A4A5C] rounded hover:border-[#D4A843] text-[#F5F0E8] text-sm transition-colors"
        >
          <Camera size={14} />
          已保存 ({viewpoints.length})
        </button>
      </div>

      {isSaving && (
        <div className="absolute top-12 right-0 w-64 p-3 bg-[#1a2d4a] border border-[#D4A843] rounded shadow-lg">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="输入视角名称..."
            className="w-full px-3 py-2 bg-[#0a1628] border border-[#3A4A5C] rounded text-sm text-[#F5F0E8] placeholder-gray-500 focus:border-[#D4A843] focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setIsSaving(false)}
              className="px-3 py-1 text-sm text-gray-400 hover:text-[#F5F0E8]"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!newName.trim()}
              className="px-3 py-1 text-sm bg-[#D4A843] text-[#0a1628] rounded hover:bg-[#e8b85a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              保存
            </button>
          </div>
        </div>
      )}

      {showList && (
        <div className="absolute top-12 right-0 w-72 p-3 bg-[#1a2d4a] border border-[#3A4A5C] rounded shadow-lg max-h-80 overflow-y-auto">
          {viewpoints.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">暂无保存的视角</p>
          ) : (
            <div className="space-y-2">
              {viewpoints.map((vp) => (
                <div
                  key={vp.id}
                  className="flex items-center justify-between p-2 bg-[#0a1628] rounded hover:bg-[#0d1f35]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#F5F0E8] truncate">{vp.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(vp.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleLoad(vp)}
                      className="p-1 text-gray-400 hover:text-[#D4A843]"
                      title="加载视角"
                    >
                      <Play size={14} />
                    </button>
                    <button
                      onClick={() => deleteViewpoint(vp.id)}
                      className="p-1 text-gray-400 hover:text-red-400"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
