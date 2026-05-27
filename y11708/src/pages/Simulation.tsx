import React, { useState } from 'react';
import { Plus, Save, Trash2, Play, Copy } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { SimulationScenario } from '../types';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { MatrixTable } from '../components/matrix/MatrixTable';
import { formatPercent, generateId } from '../utils/cn';
import { generatePrediction } from '../utils/markov';
import { normalizeMatrix } from '../utils/markov';

export const Simulation: React.FC = () => {
  const {
    states,
    matrix,
    prediction,
    scenarios,
    activeScenario,
    addScenario,
    removeScenario,
    setActiveScenario,
    saveToHistory
  } = useAppStore();

  const [scenarioName, setScenarioName] = useState('');
  const [editingMatrix, setEditingMatrix] = useState<number[][] | null>(null);

  const handleStartSimulation = () => {
    if (!matrix) return;
    setEditingMatrix(matrix.matrix.map(row => [...row]));
  };

  const handleCellChange = (from: number, to: number, value: string) => {
    if (!editingMatrix) return;
    const newMatrix = editingMatrix.map(row => [...row]);
    newMatrix[from][to] = parseFloat(value) || 0;
    setEditingMatrix(newMatrix);
  };

  const handleNormalize = () => {
    if (!editingMatrix) return;
    setEditingMatrix(normalizeMatrix(editingMatrix));
  };

  const handleSaveScenario = () => {
    if (!editingMatrix || !matrix || !scenarioName.trim()) return;

    const newMatrix = {
      ...matrix,
      matrix: editingMatrix
    };

    const initialDist = prediction?.initialDistribution || matrix.sampleSizes.map(s => s / matrix.sampleSizes.reduce((a, b) => a + b, 0));
    const scenarioPrediction = generatePrediction(newMatrix, initialDist, '模拟预测');

    const scenario: SimulationScenario = {
      id: generateId(),
      name: scenarioName,
      matrix: newMatrix,
      prediction: scenarioPrediction,
      createdAt: Date.now()
    };

    addScenario(scenario);
    saveToHistory('保存情景', scenarioName);
    setScenarioName('');
    setEditingMatrix(null);
  };

  const handleApplyScenario = (scenario: SimulationScenario) => {
    setActiveScenario(scenario.id);
  };

  const activeScenarioData = scenarios.find(s => s.id === activeScenario);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">情景模拟</h1>
          <p className="text-gray-500 mt-1">调整转移概率，模拟不同运营策略下的预测结果</p>
        </div>
        {!editingMatrix && matrix && (
          <Button onClick={handleStartSimulation}>
            <Play className="w-4 h-4 mr-2" />
            开始模拟
          </Button>
        )}
      </div>

      {editingMatrix && matrix && (
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <div>
                <Card.Title>编辑转移矩阵</Card.Title>
                <Card.Description>调整各状态间的转移概率，然后保存为新情景</Card.Description>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleNormalize}>
                  归一化
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditingMatrix(null)}>
                  取消
                </Button>
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="bg-gray-50 p-3 text-left font-semibold text-gray-700 border border-gray-200 min-w-[120px]">
                      状态
                    </th>
                    {states.map((state, i) => (
                      <th
                        key={i}
                        className="bg-gray-50 p-3 text-center font-semibold border border-gray-200"
                        style={{ color: state.color }}
                      >
                        {state.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {states.map((fromState, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td
                        className="p-3 font-medium border border-gray-200"
                        style={{ color: fromState.color }}
                      >
                        {fromState.name}
                      </td>
                      {states.map((toState, j) => (
                        <td key={j} className="p-2 border border-gray-200">
                          <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            className="w-full text-center border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={editingMatrix[i][j].toFixed(2)}
                            onChange={(e) => handleCellChange(i, j, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="输入情景名称..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
              />
              <Button onClick={handleSaveScenario} disabled={!scenarioName.trim()}>
                <Save className="w-4 h-4 mr-2" />
                保存情景
              </Button>
            </div>
          </Card.Content>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">已保存的情景</h2>
          {scenarios.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              暂无保存的情景，点击"开始模拟"创建第一个情景
            </Card>
          ) : (
            <div className="space-y-3">
              {scenarios.map((scenario) => (
                <Card
                  key={scenario.id}
                  className={activeScenario === scenario.id ? 'ring-2 ring-blue-500' : ''}
                >
                  <Card.Content>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-800">{scenario.name}</h3>
                          {activeScenario === scenario.id && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                              已选中
                            </span>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">预测活跃率:</span>
                            <span className="ml-1 font-medium text-green-600">
                              {formatPercent(scenario.prediction.activeRate)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">预测流失率:</span>
                            <span className="ml-1 font-medium text-red-600">
                              {formatPercent(scenario.prediction.churnRate)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-4">
                        <button
                          onClick={() => handleApplyScenario(scenario)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="应用此情景"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeScenario(scenario.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card.Content>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">对比分析</h2>
          {prediction && matrix ? (
            <div className="space-y-4">
              <Card>
                <Card.Header>
                  <Card.Title>基准 vs 模拟</Card.Title>
                  <Card.Description>原始预测与选中情景的对比</Card.Description>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">基准活跃率</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatPercent(prediction.activeRate)}
                        </p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-500">情景活跃率</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {activeScenarioData
                            ? formatPercent(activeScenarioData.prediction.activeRate)
                            : '-'
                          }
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-500">差异</p>
                        <p className={`text-2xl font-bold ${
                          activeScenarioData &&
                          activeScenarioData.prediction.activeRate >= prediction.activeRate
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {activeScenarioData
                            ? `${activeScenarioData.prediction.activeRate >= prediction.activeRate ? '+' : ''}${formatPercent(
                                activeScenarioData.prediction.activeRate - prediction.activeRate
                              )}`
                            : '-'
                          }
                        </p>
                      </div>
                    </div>

                    {activeScenarioData && (
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-700 mb-2">状态分布对比</h4>
                        <div className="space-y-3">
                          {states.map((state, i) => {
                            const base = prediction.predictedDistribution[i] || 0;
                            const sim = activeScenarioData.prediction.predictedDistribution[i] || 0;
                            const diff = sim - base;
                            
                            return (
                              <div key={state.id} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span style={{ color: state.color }}>{state.name}</span>
                                  <span className={diff >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {diff >= 0 ? '+' : ''}{formatPercent(diff)}
                                  </span>
                                </div>
                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                                  <div
                                    className="h-full bg-gray-300"
                                    style={{ width: `${base * 100}%` }}
                                  />
                                  <div
                                    className="h-full"
                                    style={{
                                      width: `${Math.abs(diff) * 100}%`,
                                      backgroundColor: diff >= 0 ? '#10B981' : '#EF4444',
                                      marginLeft: diff < 0 ? `-${Math.abs(diff) * 100}%` : '0'
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </Card.Content>
              </Card>

              {activeScenarioData && (
                <Card>
                  <Card.Header>
                    <Card.Title>情景矩阵</Card.Title>
                  </Card.Header>
                  <Card.Content className="p-0 overflow-x-auto">
                    <MatrixTable matrix={activeScenarioData.matrix} />
                  </Card.Content>
                </Card>
              )}
            </div>
          ) : (
            <Card className="p-8 text-center text-gray-500">
              请先在主面板计算基准预测
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
