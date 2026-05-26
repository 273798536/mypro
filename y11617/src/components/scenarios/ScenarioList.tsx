import { useState } from 'react';
import { Save, FolderOpen, Trash2, Copy, Check, Plus, FileJson, FileSpreadsheet, Download } from 'lucide-react';
import { useCashflowStore } from '../../store/useCashflowStore';
import { exportDataAsCSV, exportScenarioAsJSON } from '../../utils/exporter';
import type { Scenario } from '../../types';
import { format, parseISO } from 'date-fns';

interface ScenarioListProps {
  onCompare?: (scenarios: Scenario[]) => void;
}

export default function ScenarioList({ onCompare }: ScenarioListProps) {
  const scenarios = useCashflowStore(state => state.scenarios);
  const currentScenario = useCashflowStore(state => state.currentScenario);
  const loadScenario = useCashflowStore(state => state.loadScenario);
  const deleteScenario = useCashflowStore(state => state.deleteScenario);
  const saveScenario = useCashflowStore(state => state.saveScenario);
  const updateCurrentScenarioName = useCashflowStore(state => state.updateCurrentScenarioName);

  const [newScenarioName, setNewScenarioName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);

  const handleSaveNew = () => {
    if (!newScenarioName.trim()) return;
    saveScenario(newScenarioName.trim());
    setNewScenarioName('');
  };

  const handleCompareToggle = (id: string) => {
    setSelectedCompareIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const handleExportCSV = (scenario: Scenario) => {
    exportDataAsCSV(scenario.entries, `${scenario.name}_现金流数据`);
  };

  const handleExportJSON = (scenario: Scenario) => {
    exportScenarioAsJSON(scenario, `${scenario.name}_方案`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FolderOpen size={20} className="text-brand-primary" />
          <h3 className="font-semibold text-gray-800">方案管理</h3>
        </div>
        <button
          onClick={() => {
            setCompareMode(!compareMode);
            setSelectedCompareIds([]);
          }}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            compareMode
              ? 'bg-brand-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {compareMode ? '退出对比' : '对比模式'}
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newScenarioName}
          onChange={e => setNewScenarioName(e.target.value)}
          placeholder="输入新方案名称..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
          onKeyDown={e => e.key === 'Enter' && handleSaveNew()}
        />
        <button
          onClick={handleSaveNew}
          className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors text-sm font-medium flex items-center gap-1"
        >
          <Save size={16} />
          保存当前
        </button>
      </div>

      {compareMode && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          选择最多 3 个方案进行对比 (已选 {selectedCompareIds.length}/3)
          {selectedCompareIds.length >= 2 && (
            <button
              onClick={() => {
                const selected = scenarios.filter(s => selectedCompareIds.includes(s.id));
                onCompare?.(selected);
              }}
              className="ml-4 px-3 py-1 bg-blue-600 text-white rounded text-xs"
            >
              对比分析
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map(scenario => (
          <div
            key={scenario.id}
            className={`border rounded-lg p-4 transition-all ${
              currentScenario?.id === scenario.id
                ? 'border-brand-primary bg-brand-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              {editingId === scenario.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={() => {
                    if (editName.trim()) {
                      updateCurrentScenarioName(editName.trim());
                    }
                    setEditingId(null);
                  }}
                  onKeyDown={e => e.key === 'Enter' && (
                    editName.trim() && updateCurrentScenarioName(editName.trim()),
                    setEditingId(null)
                  )}
                  className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  autoFocus
                />
              ) : (
                <div
                  className="font-medium text-gray-800 cursor-pointer hover:text-brand-primary"
                  onClick={() => {
                    setEditingId(scenario.id);
                    setEditName(scenario.name);
                  }}
                >
                  {scenario.name}
                </div>
              )}
              {currentScenario?.id === scenario.id && (
                <span className="px-2 py-0.5 bg-brand-primary text-white text-xs rounded">
                  当前
                </span>
              )}
            </div>

            {compareMode && (
              <div className="mb-3">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCompareIds.includes(scenario.id)}
                    onChange={() => handleCompareToggle(scenario.id)}
                    className="rounded border-gray-300"
                  />
                  加入对比
                </label>
              </div>
            )}

            <div className="space-y-1 text-xs text-gray-500 mb-4">
              <div>数据条目: {scenario.entries.length} 条</div>
              <div>初始余额: ¥{scenario.settings.initialBalance.toLocaleString()}</div>
              <div>安全线: ¥{scenario.settings.safetyLine.toLocaleString()}</div>
              <div>更新: {format(parseISO(scenario.updatedAt), 'yyyy-MM-dd HH:mm')}</div>
            </div>

            <div className="flex flex-wrap gap-1">
              {currentScenario?.id !== scenario.id && (
                <button
                  onClick={() => loadScenario(scenario.id)}
                  className="flex-1 px-2 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                >
                  <Check size={12} />
                  切换
                </button>
              )}
              <button
                onClick={() => handleExportCSV(scenario)}
                className="px-2 py-1.5 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                title="导出CSV"
              >
                <FileSpreadsheet size={14} />
              </button>
              <button
                onClick={() => handleExportJSON(scenario)}
                className="px-2 py-1.5 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                title="导出JSON"
              >
                <FileJson size={14} />
              </button>
              {scenarios.length > 1 && (
                <button
                  onClick={() => {
                    if (confirm(`确定删除方案"${scenario.name}"？`)) {
                      deleteScenario(scenario.id);
                    }
                  }}
                  className="px-2 py-1.5 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}