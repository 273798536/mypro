import { useState } from 'react';
import { Save, FolderOpen, Trash2, Plus, X, RotateCcw } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';

export default function PresetPanel() {
  const { presets, params, savePreset, loadPreset, deletePreset, resetToDefault } = useSimulationStore();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');

  const handleSave = () => {
    if (presetName.trim()) {
      savePreset(presetName.trim());
      setPresetName('');
      setShowSaveDialog(false);
    }
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-200">参数预设</h3>
        <button
          onClick={() => setShowSaveDialog(true)}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
        >
          <Plus size={14} />
          保存当前
        </button>
      </div>

      {showSaveDialog && (
        <div className="bg-slate-800 rounded-lg p-3 space-y-2">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="预设名称..."
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
            >
              保存
            </button>
            <button
              onClick={() => setShowSaveDialog(false)}
              className="p-1.5 hover:bg-slate-700 rounded"
            >
              <X size={14} className="text-slate-400" />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={resetToDefault}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
      >
        <RotateCcw size={14} />
        恢复默认参数
      </button>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {presets.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">暂无保存的预设</p>
        ) : (
          presets.map((preset) => (
            <div
              key={preset.id}
              className="bg-slate-800 rounded-lg p-2.5 group hover:bg-slate-750 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{preset.name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(preset.savedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => loadPreset(preset.id)}
                    className="p-1.5 hover:bg-slate-700 rounded"
                    title="加载"
                  >
                    <FolderOpen size={14} className="text-blue-400" />
                  </button>
                  <button
                    onClick={() => deletePreset(preset.id)}
                    className="p-1.5 hover:bg-slate-700 rounded"
                    title="删除"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
