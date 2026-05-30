import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { IndustryGate, GameState } from '@/types';
import { ConfigComparison } from '@/components/config/ConfigComparison';
import { ArrowLeft, Plus, Trash2, Save, Play, AlertTriangle } from 'lucide-react';

export default function ConfigPage() {
  const navigate = useNavigate();
  const { 
    configs, 
    activeConfigId, 
    setActiveConfig,
    updateConfig,
    addConfig,
    games,
    simulateGameWithConfig,
    getActiveConfig,
  } = useGameStore();

  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<{
    oldResult: GameState;
    newResult: GameState;
  } | null>(null);
  const [editingGates, setEditingGates] = useState<IndustryGate[] | null>(null);

  const activeConfig = getActiveConfig();
  const workingGates = editingGates || activeConfig.industryGates;

  const handleGateChange = (index: number, field: keyof IndustryGate, value: any) => {
    if (!editingGates) {
      setEditingGates([...activeConfig.industryGates]);
    }
    const newGates = [...(editingGates || activeConfig.industryGates)];
    newGates[index] = { ...newGates[index], [field]: value };
    setEditingGates(newGates);
  };

  const handleAddGate = () => {
    const newGate: IndustryGate = {
      id: `gate-${Date.now()}`,
      industryId: null,
      industryName: '新行业',
      maxConcentration: 0.4,
      condition: 'exceed',
      penaltyType: 'drawdown',
      penaltyValue: 0.1,
      missingFieldHandling: 'warn',
    };
    setEditingGates([...(editingGates || activeConfig.industryGates), newGate]);
  };

  const handleDeleteGate = (index: number) => {
    const newGates = [...(editingGates || activeConfig.industryGates)];
    newGates.splice(index, 1);
    setEditingGates(newGates);
  };

  const handleSave = () => {
    if (!editingGates) return;
    
    const newVersion = `${parseFloat(activeConfig.version) + 0.1}`.slice(0, 3);
    addConfig({
      name: `${activeConfig.name.split(' ')[0]} v${newVersion}`,
      version: newVersion,
      isActive: true,
      industryGates: editingGates,
      funds: activeConfig.funds,
      mazeId: activeConfig.mazeId,
    });
    setEditingGates(null);
  };

  const handleRunComparison = () => {
    if (!selectedGameId || !editingGates) return;
    
    const tempConfigId = `temp-${Date.now()}`;
    const tempConfig = {
      ...activeConfig,
      id: tempConfigId,
      version: 'temp',
      industryGates: editingGates,
    };
    
    addConfig({
      name: '临时配置',
      version: 'temp',
      isActive: false,
      industryGates: editingGates,
      funds: activeConfig.funds,
      mazeId: activeConfig.mazeId,
    });
    
    const originalGame = games.find(g => g.id === selectedGameId);
    if (originalGame) {
      const newResult = simulateGameWithConfig(selectedGameId, tempConfigId);
      setComparisonResult({
        oldResult: originalGame,
        newResult: newResult,
      });
    }
  };

  const hasChanges = editingGates !== null && JSON.stringify(editingGates) !== JSON.stringify(activeConfig.industryGates);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回首页
          </button>
          <h1 className="text-2xl font-bold text-gray-800">配置管理</h1>
          <div className="w-20"></div>
        </div>

        <div className="mb-6 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">配置版本</h2>
            <select
              value={activeConfigId}
              onChange={(e) => {
                setActiveConfig(e.target.value);
                setEditingGates(null);
                setComparisonResult(null);
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {configs.filter(c => c.version !== 'temp').map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-500">
            当前版本: {activeConfig.name} ({activeConfig.version})
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-7">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-800">行业门配置</h2>
                <div className="flex gap-3">
                  <button
                    onClick={handleAddGate}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    添加
                  </button>
                  {hasChanges && (
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      保存新版本
                    </button>
                  )}
                </div>
              </div>

              {hasChanges && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-amber-700">有未保存的修改</span>
                </div>
              )}

              <div className="space-y-4">
                {workingGates.map((gate, index) => (
                  <div key={gate.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={gate.industryName || ''}
                          onChange={(e) => handleGateChange(index, 'industryName', e.target.value)}
                          className="font-semibold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-amber-400 focus:outline-none"
                          placeholder="行业名称"
                        />
                      </div>
                      <button
                        onClick={() => handleDeleteGate(index)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">集中度阈值</label>
                        <input
                          type="number"
                          value={(gate.maxConcentration * 100).toFixed(0)}
                          onChange={(e) => handleGateChange(index, 'maxConcentration', parseInt(e.target.value) / 100)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                          min={0}
                          max={100}
                        />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">触发条件</label>
                        <select
                          value={gate.condition}
                          onChange={(e) => handleGateChange(index, 'condition', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                        >
                          <option value="exceed">超过</option>
                          <option value="reach">达到</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">惩罚类型</label>
                        <select
                          value={gate.penaltyType}
                          onChange={(e) => handleGateChange(index, 'penaltyType', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                        >
                          <option value="drawdown">回撤</option>
                          <option value="fee">手续费增加</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">惩罚值</label>
                        <input
                          type="number"
                          value={(gate.penaltyValue * 100).toFixed(0)}
                          onChange={(e) => handleGateChange(index, 'penaltyValue', parseInt(e.target.value) / 100)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                          min={0}
                          max={100}
                        />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-5">
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">配置对比测试</h2>
              
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-2">选择游戏记录</label>
                <select
                  value={selectedGameId || ''}
                  onChange={(e) => setSelectedGameId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">请选择...</option>
                  {games.slice(-10).reverse().map((game, i) => (
                    <option key={game.id} value={game.id}>
                      游戏 #{games.length - i} - {new Date(game.startTime).toLocaleString('zh-CN')}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleRunComparison}
                disabled={!selectedGameId || !hasChanges}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                运行对比模拟
              </button>

              {games.length === 0 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  暂无游戏记录，请先进行游戏
                </p>
              )}
            </div>

            {comparisonResult && (
              <ConfigComparison
                oldResult={comparisonResult.oldResult}
                newResult={comparisonResult.newResult}
                oldConfig={activeConfig}
                newConfig={{
                  ...activeConfig,
                  industryGates: editingGates || activeConfig.industryGates,
                }}
                onSaveNewConfig={handleSave}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
