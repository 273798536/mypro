import { useState, useRef } from 'react';
import { Save, FolderOpen, Trash2, Download, Upload, GitCompare, X, Check, FileJson } from 'lucide-react';
import { useSolarStore } from '../store/solarStore';
import { SolarScenario, ImportMode } from '../types';
import { cn } from '../lib/utils';

export function ScenarioManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveSource, setSaveSource] = useState('手动输入');
  const [importMode, setImportMode] = useState<ImportMode>('append');
  const [importResult, setImportResult] = useState<{ ignored: number; added: number; overwritten: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    scenarios,
    selectedScenarioIds,
    saveScenario,
    deleteScenario,
    importScenarios,
    exportScenarios,
    loadScenario,
    toggleScenarioSelection
  } = useSolarStore();

  const handleSave = () => {
    if (saveName.trim()) {
      saveScenario(saveName.trim(), saveSource.trim());
      setSaveName('');
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string) as SolarScenario[];
          const result = importScenarios(data, importMode);
          setImportResult(result);
          setTimeout(() => setImportResult(null), 3000);
        } catch {
          alert('文件格式错误');
        }
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = () => {
    const data = exportScenarios();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solar-scenarios-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg transition-all duration-200 hover:scale-105"
      >
        <FolderOpen className="w-5 h-5" />
        <span>方案管理</span>
        {scenarios.length > 0 && (
          <span className="bg-blue-800 px-2 py-0.5 rounded-full text-xs">
            {scenarios.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <FileJson className="w-5 h-5 text-blue-400" />
                方案管理
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="bg-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">保存当前方案</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="方案名称"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="来源"
                    value={saveSource}
                    onChange={(e) => setSaveSource(e.target.value)}
                    className="w-28 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleSave}
                    disabled={!saveName.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    保存
                  </button>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">导入 / 导出</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>导入模式:</span>
                    <select
                      value={importMode}
                      onChange={(e) => setImportMode(e.target.value as ImportMode)}
                      className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                    >
                      <option value="ignore">忽略重复</option>
                      <option value="overwrite">覆盖同名</option>
                      <option value="append">重命名追加</option>
                    </select>
                  </div>
                  <div className="flex-1" />
                  <label className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer transition-colors flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    导入
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={handleExport}
                    disabled={scenarios.length === 0}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    导出
                  </button>
                </div>
                {importResult && (
                  <div className="mt-3 text-sm text-emerald-400">
                    导入完成: 新增 {importResult.added} | 覆盖 {importResult.overwritten} | 忽略 {importResult.ignored}
                  </div>
                )}
              </div>

              <div className="bg-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <GitCompare className="w-4 h-4" />
                  已保存方案 ({scenarios.length})
                  {selectedScenarioIds.length > 1 && (
                    <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full">
                      已选 {selectedScenarioIds.length} 个对比
                    </span>
                  )}
                </h3>
                {scenarios.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    暂无保存的方案
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {scenarios.map((scenario) => (
                      <div
                        key={scenario.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-all",
                          selectedScenarioIds.includes(scenario.id)
                            ? "bg-blue-900/30 border-blue-500"
                            : "bg-gray-700/50 border-gray-600 hover:border-gray-500"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleScenarioSelection(scenario.id)}
                            className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                              selectedScenarioIds.includes(scenario.id)
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-500 hover:border-gray-400"
                            )}
                          >
                            {selectedScenarioIds.includes(scenario.id) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </button>
                          <div>
                            <div className="text-white font-medium">{scenario.name}</div>
                            <div className="text-xs text-gray-500">
                              来源: {scenario.source} · v{scenario.version} · {formatDate(scenario.updatedAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right text-xs text-gray-400 mr-2">
                            <div>倾角: {scenario.params.tiltAngle}°</div>
                            <div>功率: {scenario.results.powerOutput.toFixed(2)} kW</div>
                          </div>
                          <button
                            onClick={() => loadScenario(scenario.id)}
                            className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                            title="加载方案"
                          >
                            <FolderOpen className="w-4 h-4 text-gray-400" />
                          </button>
                          <button
                            onClick={() => deleteScenario(scenario.id)}
                            className="p-2 hover:bg-red-900/50 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
