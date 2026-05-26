import { useState, useCallback } from 'react';
import { Save, FolderOpen, Trash2, Download, Upload, Layers } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { SURFACE_PRESETS } from '../../math/presets';
import { ImportStrategy } from '../../types';

export function PresetManager() {
  const presets = useStore((state) => state.presets);
  const savePreset = useStore((state) => state.savePreset);
  const loadPreset = useStore((state) => state.loadPreset);
  const deletePreset = useStore((state) => state.deletePreset);
  const loadSurfacePreset = useStore((state) => state.loadSurfacePreset);
  const importData = useStore((state) => state.importData);
  const exportData = useStore((state) => state.exportData);
  
  const [newPresetName, setNewPresetName] = useState('');
  const [importStrategy, setImportStrategy] = useState<ImportStrategy>('append');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const handleSavePreset = useCallback(() => {
    if (newPresetName.trim()) {
      savePreset(newPresetName.trim());
      setNewPresetName('');
    }
  }, [newPresetName, savePreset]);

  const handleExport = useCallback(() => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quadric-presets-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportData]);

  const handleImport = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const result = importData(content, importStrategy);
          setImportResult(
            `导入完成: 成功${result.imported}, 跳过${result.skipped}, 覆盖${result.overwritten}`
          );
          setTimeout(() => setImportResult(null), 3000);
        };
        reader.readAsText(file);
      }
      event.target.value = '';
    },
    [importData, importStrategy]
  );

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Layers size={18} className="text-primary-500" />
        <h3 className="font-display text-lg font-semibold text-primary-500">
          预设管理
        </h3>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-space-300 font-medium">曲面模板</div>
        <div className="grid grid-cols-2 gap-2">
          {SURFACE_PRESETS.map((preset, index) => (
            <button
              key={index}
              onClick={() => loadSurfacePreset(index)}
              className="btn-secondary text-xs py-2 px-3 text-left truncate"
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-space-600 pt-4">
        <div className="text-sm text-space-300 font-medium mb-2">保存当前配置</div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            placeholder="预设名称..."
            className="flex-1 input-control text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
          />
          <button
            onClick={handleSavePreset}
            className="btn-secondary flex items-center gap-1"
            title="保存预设"
          >
            <Save size={16} />
          </button>
        </div>
      </div>

      {presets.length > 0 && (
        <div className="border-t border-space-600 pt-4">
          <div className="text-sm text-space-300 font-medium mb-2">我的预设</div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between p-2 rounded-lg bg-space-700/50 hover:bg-space-700 transition-colors"
              >
                <button
                  onClick={() => loadPreset(preset.id)}
                  className="flex-1 text-left text-sm text-space-200 hover:text-primary-500 transition-colors"
                >
                  <div className="font-medium truncate">{preset.name}</div>
                  <div className="text-xs text-space-400">
                    来源: {preset.source || '未知'}
                  </div>
                </button>
                <button
                  onClick={() => deletePreset(preset.id)}
                  className="p-1.5 rounded hover:bg-error-500/20 text-space-400 hover:text-error-500 transition-colors"
                  title="删除预设"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-space-600 pt-4 space-y-3">
        <div className="text-sm text-space-300 font-medium">导入导出</div>
        
        <div className="space-y-2">
          <div className="text-xs text-space-400">重复数据处理策略</div>
          <div className="flex gap-2">
            {(['ignore', 'overwrite', 'append'] as ImportStrategy[]).map((strategy) => (
              <button
                key={strategy}
                onClick={() => setImportStrategy(strategy)}
                className={`flex-1 text-xs py-1.5 px-2 rounded-lg transition-colors ${
                  importStrategy === strategy
                    ? 'bg-primary-500/20 text-primary-500 border border-primary-500/50'
                    : 'bg-space-700 text-space-300 border border-space-600 hover:border-space-500'
                }`}
              >
                {strategy === 'ignore' ? '忽略' : strategy === 'overwrite' ? '覆盖' : '追加'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <label className="btn-secondary flex-1 flex items-center justify-center gap-2 cursor-pointer">
            <Upload size={16} />
            <span>导入</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExport}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <Download size={16} />
            <span>导出</span>
          </button>
        </div>

        {importResult && (
          <div className="text-xs text-success-500 text-center">
            {importResult}
          </div>
        )}
      </div>
    </div>
  );
}
