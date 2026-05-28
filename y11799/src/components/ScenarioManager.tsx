import { useState } from 'react';
import { Layers, Save, Trash2, Upload, Check, X, FileText, Clock } from 'lucide-react';
import { useAppStore } from '@/store';
import { hasErrors } from '@/utils/validator';

const ScenarioManager = () => {
  const { scenarios, selectedScenarioIds, result, alerts, saveScenario, deleteScenario, toggleScenarioSelection, loadScenario } = useAppStore();
  const [newScenarioName, setNewScenarioName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const canSave = result && !hasErrors(alerts);

  const handleSave = () => {
    if (newScenarioName.trim()) {
      saveScenario(newScenarioName.trim());
      setNewScenarioName('');
      setShowSaveDialog(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-bold text-white">情景管理</h2>
          <span className="text-xs text-slate-500">({scenarios.length})</span>
        </div>
        <button
          onClick={() => setShowSaveDialog(true)}
          disabled={!canSave}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            canSave
              ? 'bg-purple-600 hover:bg-purple-500 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          保存
        </button>
      </div>

      {showSaveDialog && (
        <div className="mb-4 p-3 bg-slate-700/50 rounded-lg border border-purple-500/30">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-white">保存当前情景</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="输入情景名称..."
              value={newScenarioName}
              onChange={(e) => setNewScenarioName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="flex-1 bg-slate-800 text-white rounded px-3 py-2 text-sm border border-slate-600 focus:border-purple-500 focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleSave}
              className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSaveDialog(false)}
              className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm font-medium"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {scenarios.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <Layers className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-slate-400 text-sm">暂无保存的情景</p>
          <p className="text-slate-500 text-xs mt-1">调整参数后点击"保存"按钮</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                selectedScenarioIds.includes(scenario.id)
                  ? 'bg-purple-900/30 border-purple-500/50'
                  : 'bg-slate-700/30 border-slate-600/50 hover:border-slate-500'
              }`}
              onClick={() => toggleScenarioSelection(scenario.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      selectedScenarioIds.includes(scenario.id)
                        ? 'bg-purple-500 border-purple-500'
                        : 'border-slate-500'
                    }`}>
                      {selectedScenarioIds.includes(scenario.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-white font-medium text-sm truncate">{scenario.name}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-6 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(scenario.timestamp)}
                    </span>
                    <span>COP: {scenario.result?.cop}</span>
                    <span>¥{scenario.result?.annualCost}/年</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      loadScenario(scenario.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-600 rounded transition-colors"
                    title="加载此情景"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteScenario(scenario.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-600 rounded transition-colors"
                    title="删除此情景"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedScenarioIds.length > 1 && (
        <div className="mt-3 p-2 bg-purple-900/30 rounded-lg border border-purple-500/30 text-center">
          <span className="text-purple-300 text-sm">
            已选择 {selectedScenarioIds.length} 个情景进行对比
          </span>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default ScenarioManager;
