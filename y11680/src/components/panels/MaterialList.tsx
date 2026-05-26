import { useState } from 'react';
import { Plus, Trash2, Download, Upload } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { AcousticMaterial } from '../../types';

export default function MaterialList() {
  const materials = useStore((state) => state.materials);
  const addMaterial = useStore((state) => state.addMaterial);
  const deleteMaterial = useStore((state) => state.deleteMaterial);
  const importMode = useStore((state) => state.importMode);
  const setImportMode = useStore((state) => state.setImportMode);
  const importConfig = useStore((state) => state.importConfig);
  const exportConfig = useStore((state) => state.exportConfig);

  const [showImportModal, setShowImportModal] = useState(false);

  const handleAddMaterial = () => {
    const newMaterial: Omit<AcousticMaterial, 'id' | 'createdAt' | 'modifiedAt' | 'version'> = {
      name: `新材料 ${materials.length + 1}`,
      source: '用户添加',
      absorptionCoefficient: { 125: 0.5, 250: 0.5, 500: 0.5, 1000: 0.5, 2000: 0.5, 4000: 0.5 },
      thickness: 50,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
    };
    addMaterial(newMaterial);
  };

  const handleExport = () => {
    const config = exportConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acoustic-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const config = JSON.parse(event.target?.result as string);
          importConfig(config);
          setShowImportModal(false);
        } catch {
          alert('导入失败：文件格式错误');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={handleAddMaterial}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 
            bg-primary-600 hover:bg-primary-500 rounded text-sm transition-colors"
        >
          <Plus size={14} />
          添加
        </button>
        <button
          onClick={handleExport}
          className="p-2 bg-dark-900 hover:bg-dark-950 rounded transition-colors"
          title="导出配置"
        >
          <Download size={16} />
        </button>
        <button
          onClick={() => setShowImportModal(true)}
          className="p-2 bg-dark-900 hover:bg-dark-950 rounded transition-colors"
          title="导入配置"
        >
          <Upload size={16} />
        </button>
      </div>

      {showImportModal && (
        <div className="p-3 bg-dark-950 rounded border border-primary-600">
          <div className="text-xs text-gray-300 mb-2">导入模式：</div>
          <div className="flex gap-2 mb-3">
            {(['ignore', 'overwrite', 'append'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setImportMode(mode)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  importMode === mode
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-900 text-gray-400 hover:bg-dark-800'
                }`}
              >
                {mode === 'ignore' ? '忽略重复' : mode === 'overwrite' ? '覆盖' : '追加'}
              </button>
            ))}
          </div>
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="text-xs"
          />
          <button
            onClick={() => setShowImportModal(false)}
            className="mt-2 text-xs text-gray-400 hover:text-white"
          >
            取消
          </button>
        </div>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {materials.map((material) => (
          <div
            key={material.id}
            className="flex items-center gap-2 p-2 bg-dark-900 rounded"
          >
            <div
              className="w-4 h-4 rounded flex-shrink-0"
              style={{ backgroundColor: material.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{material.name}</div>
              <div className="text-xs text-gray-500 truncate">{material.source}</div>
            </div>
            <button
              onClick={() => deleteMaterial(material.id)}
              className="p-1 text-gray-500 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
