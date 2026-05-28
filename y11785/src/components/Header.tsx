import { useState } from 'react';
import { Network, Upload, Download, Save, History, Copy, Trash2, ChevronDown, Plus } from 'lucide-react';
import { useNetworkStore } from '../store/networkStore';

export function Header() {
  const {
    currentScenario,
    scenarios,
    saveScenario,
    loadScenario,
    deleteScenario,
    duplicateScenario,
    exportData,
    setShowImportModal,
    setShowHistoryPanel,
    updateScenarioInfo
  } = useNetworkStore();

  const [showScenarioMenu, setShowScenarioMenu] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [scenarioName, setScenarioName] = useState(currentScenario.name);
  const [scenarioDesc, setScenarioDesc] = useState(currentScenario.description);

  const handleExportData = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `物流网络_${currentScenario.name}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveScenario = () => {
    saveScenario(scenarioName, scenarioDesc);
    setShowSaveDialog(false);
  };

  const handleQuickSave = () => {
    if (scenarios.find(s => s.id === currentScenario.id)) {
      updateScenarioInfo(scenarioName, scenarioDesc);
    } else {
      setShowSaveDialog(true);
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Network className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-800">仓网瓶颈分析</h1>
        </div>

        {/* 情景选择器 */}
        <div className="relative">
          <button
            onClick={() => setShowScenarioMenu(!showScenarioMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <span className="text-sm font-medium text-slate-700">{currentScenario.name}</span>
            <span className="text-xs text-slate-500">v{currentScenario.version}</span>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </button>

          {showScenarioMenu && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="p-2 border-b border-slate-100">
                <div className="text-xs font-medium text-slate-500 uppercase mb-1">已保存情景</div>
                {scenarios.length === 0 ? (
                  <div className="text-sm text-slate-400 py-2 text-center">暂无保存的情景</div>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {scenarios.map((scenario) => (
                      <div
                        key={scenario.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${
                          scenario.id === currentScenario.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className="flex-1 min-w-0"
                          onClick={() => { loadScenario(scenario.id); setShowScenarioMenu(false); }}
                        >
                          <div className="text-sm font-medium text-slate-700 truncate">{scenario.name}</div>
                          <div className="text-xs text-slate-400">
                            v{scenario.version} · {new Date(scenario.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => duplicateScenario(scenario.id, `${scenario.name} (副本)`)}
                            className="p-1 hover:bg-slate-200 rounded"
                            title="复制"
                          >
                            <Copy className="w-3 h-3 text-slate-500" />
                          </button>
                          <button
                            onClick={() => deleteScenario(scenario.id)}
                            className="p-1 hover:bg-red-100 rounded"
                            title="删除"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-2">
                <button
                  onClick={() => { setShowSaveDialog(true); setShowScenarioMenu(false); }}
                  className="w-full flex items-center justify-center gap-2 p-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  保存为新情景
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 数据来源标签 */}
        {currentScenario.source !== 'manual' && (
          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
            来源: {currentScenario.source}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleQuickSave}
          className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          <span className="text-sm">保存</span>
        </button>

        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span className="text-sm">导入</span>
        </button>

        <button
          onClick={handleExportData}
          className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm">导出</span>
        </button>

        <div className="w-px h-6 bg-slate-200 mx-2" />

        <button
          onClick={() => setShowHistoryPanel(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <History className="w-4 h-4" />
          <span className="text-sm">历史</span>
        </button>
      </div>

      {/* 保存对话框 */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">保存情景</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  情景名称
                </label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入情景名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  描述（可选）
                </label>
                <textarea
                  value={scenarioDesc}
                  onChange={(e) => setScenarioDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="描述此情景的用途或特点"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSaveScenario}
                disabled={!scenarioName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
