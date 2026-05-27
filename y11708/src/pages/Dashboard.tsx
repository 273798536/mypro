import React, { useState, useEffect } from 'react';
import { Calculator, Play, Database, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { TransitionTable } from '../components/data-input/TransitionTable';
import { MatrixHeatmap } from '../components/matrix/MatrixHeatmap';
import { MatrixTable } from '../components/matrix/MatrixTable';
import { ResultCard, DistributionChart } from '../components/prediction/ResultCard';
import { RiskBanner, RiskAlert } from '../components/risk/RiskAlert';
import { generateSampleTransitions } from '../utils/sampleData';

export const Dashboard: React.FC = () => {
  const {
    states,
    transitions,
    matrix,
    prediction,
    risks,
    filters,
    addTransition,
    removeTransition,
    setTransitions,
    setFilters,
    calculateMatrix,
    runPrediction,
    saveToHistory
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'heatmap' | 'table'>('heatmap');
  const [highlightedCell, setHighlightedCell] = useState<{ from: number; to: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transitions.length === 0) {
      const sampleData = generateSampleTransitions(states);
      setTransitions(sampleData);
    }
  }, []);

  const handleCalculate = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    calculateMatrix();
    runPrediction();
    saveToHistory('计算预测', '手动触发');
    setLoading(false);
  };

  const handleBulkImport = (records: any[]) => {
    setTransitions([...transitions, ...records]);
    saveToHistory('批量导入数据', `导入${records.length}条记录`);
  };

  const handleLoadSample = () => {
    const sampleData = generateSampleTransitions(states);
    setTransitions(sampleData);
    saveToHistory('加载示例数据', '示例数据');
  };

  const handleMatrixCellClick = (from: number, to: number) => {
    setHighlightedCell({ from, to });
    setActiveTab('table');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Markov 留存预测面板</h1>
          <p className="text-gray-500 mt-1">基于马尔可夫链模型的用户状态转移预测分析</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleLoadSample}>
            <Database className="w-4 h-4 mr-2" />
            加载示例
          </Button>
          <Button onClick={handleCalculate} loading={loading}>
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Calculator className="w-4 h-4 mr-2" />
            )}
            计算预测
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">预测月份:</label>
          <input
            type="month"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            value={filters.targetMonth}
            onChange={(e) => setFilters({ targetMonth: e.target.value })}
          />
        </div>
      </div>

      {risks.length > 0 && <RiskBanner risks={risks} />}

      {prediction && matrix && (
        <ResultCard prediction={prediction} states={states} />
      )}

      {prediction && matrix && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <div>
                    <Card.Title>转移矩阵</Card.Title>
                    <Card.Description>各状态间的转移概率热力图</Card.Description>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className={activeTab === 'heatmap' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}
                      onClick={() => setActiveTab('heatmap')}
                    >
                      热力图
                    </button>
                    <button
                      className={activeTab === 'table' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}
                      onClick={() => setActiveTab('table')}
                    >
                      表格
                    </button>
                  </div>
                </div>
              </Card.Header>
              <Card.Content>
                {matrix && activeTab === 'heatmap' && (
                  <MatrixHeatmap matrix={matrix} onCellClick={handleMatrixCellClick} />
                )}
                {matrix && activeTab === 'table' && (
                  <MatrixTable matrix={matrix} highlightCell={highlightedCell || undefined} />
                )}
              </Card.Content>
            </Card>
          </div>
          <div className="space-y-6">
            {prediction && <DistributionChart prediction={prediction} states={states} />}
          </div>
        </div>
      )}

      {risks.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>风险检测详情</Card.Title>
            <Card.Description>数据质量问题和注意事项</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-3">
            {risks.map((risk, i) => (
              <RiskAlert key={i} risk={risk} />
            ))}
          </Card.Content>
        </Card>
      )}

      <TransitionTable
        transitions={transitions}
        states={states}
        onAdd={addTransition}
        onUpdate={() => {}}
        onRemove={removeTransition}
        onBulkImport={handleBulkImport}
      />
    </div>
  );
};
