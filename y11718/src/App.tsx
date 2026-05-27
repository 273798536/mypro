import { useState, useEffect } from 'react';
import { FileText, History, TrendingUp, Download, Box, Thermometer, Waves, AlertTriangle } from 'lucide-react';
import { useExperimentStore } from './store/useExperimentStore';
import { mockExperiments } from './data/mockExperiments';
import ResonanceTube3D from './components/ThreeDView/ResonanceTube';
import DataImportPanel from './components/DataImport/DataImportPanel';
import ErrorAnalysisPanel from './components/ErrorAnalysis/ErrorAnalysisPanel';
import HistoryTimeline from './components/HistoryTimeline/HistoryTimeline';
import ReportExportPanel from './components/ReportExport/ReportExportPanel';

export default function App() {
  const {
    experiments,
    currentExperimentId,
    setCurrentExperiment,
    setExperiments,
    loadFromStorage,
    saveToStorage,
    calculateResult,
  } = useExperimentStore();

  const [leftTab, setLeftTab] = useState<'data' | 'history'>('data');
  const [rightTab, setRightTab] = useState<'analysis' | 'export'>('analysis');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    loadFromStorage();
    setIsInitialized(true);
  }, [loadFromStorage]);

  useEffect(() => {
    if (isInitialized && experiments.length === 0) {
      setExperiments(mockExperiments);
      if (mockExperiments.length > 0) {
        setCurrentExperiment(mockExperiments[0].id);
      }
    }
  }, [isInitialized, experiments.length, setExperiments, setCurrentExperiment]);

  useEffect(() => {
    if (isInitialized && experiments.length > 0) {
      saveToStorage();
    }
  }, [experiments, isInitialized, saveToStorage]);

  const currentExperiment = experiments.find((e) => e.id === currentExperimentId);
  const result = calculateResult();

  const highSeverityWarnings = result?.warnings.filter((w) => w.severity === 'high') || [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
              <Waves className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                声速测量误差分析系统
              </h1>
              <p className="text-xs text-slate-400">共鸣管实验数据智能分析平台</p>
            </div>
          </div>

          {currentExperiment && result && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 rounded-lg">
                <Thermometer className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-slate-300">{currentExperiment.temperature}°C</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 rounded-lg">
                <Box className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-slate-300">{currentExperiment.frequency} Hz</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 rounded-lg">
                <span className="text-xs text-slate-400">声速:</span>
                <span className="text-sm font-mono font-bold text-cyan-400">
                  {result.soundSpeed.toFixed(1)} m/s
                </span>
              </div>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                  result.relativeError < 5
                    ? 'bg-green-500/20 text-green-400'
                    : result.relativeError < 10
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                <span className="text-xs">误差:</span>
                <span className="text-sm font-mono font-bold">{result.relativeError.toFixed(2)}%</span>
              </div>
              {highSeverityWarnings.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-lg animate-pulse">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-medium">{highSeverityWarnings.length} 个高优先级警告</span>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="h-[calc(100vh-64px)] flex">
        <div className="w-80 flex flex-col border-r border-slate-700 bg-slate-800/30">
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setLeftTab('data')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                leftTab === 'data'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              数据管理
            </button>
            <button
              onClick={() => setLeftTab('history')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                leftTab === 'history'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              操作记录
            </button>
          </div>
          <div className="flex-1 p-3 overflow-hidden">
            {leftTab === 'data' ? <DataImportPanel /> : <HistoryTimeline />}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative">
            {currentExperiment ? (
              <ResonanceTube3D
                measurements={currentExperiment.measurements}
                frequency={currentExperiment.frequency}
                temperature={currentExperiment.temperature}
                selectedNodeId={selectedNodeId}
                onNodeSelect={setSelectedNodeId}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-900">
                <div className="text-center">
                  <Box className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">请从左侧选择或创建一个实验</p>
                  <p className="text-slate-500 text-sm mt-2">支持CSV导入或手动输入数据</p>
                </div>
              </div>
            )}

            {selectedNodeId && currentExperiment && (
              <div className="absolute bottom-4 left-4 right-4 bg-slate-800/90 backdrop-blur-sm rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-slate-200">节点详情</h4>
                    {(() => {
                      const node = currentExperiment.measurements.find((m) => m.id === selectedNodeId);
                      if (!node) return null;
                      return (
                        <div className="mt-1 flex items-center gap-4 text-xs text-slate-400">
                          <span>节点号: <span className="text-slate-200">{node.nodeNumber}</span></span>
                          <span>管长: <span className="text-cyan-400">{node.tubeLength} cm</span></span>
                          <span>状态: <span className={node.isOutlier ? 'text-orange-400' : 'text-green-400'}>
                            {node.isOutlier ? '离群值' : '正常'}
                          </span></span>
                          <span>温度修正: <span className={node.isTemperatureCorrected ? 'text-green-400' : 'text-red-400'}>
                            {node.isTemperatureCorrected ? '已修正' : '未修正'}
                          </span></span>
                        </div>
                      );
                    })()}
                  </div>
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    关闭
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-96 flex flex-col border-l border-slate-700 bg-slate-800/30">
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setRightTab('analysis')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                rightTab === 'analysis'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              误差分析
            </button>
            <button
              onClick={() => setRightTab('export')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                rightTab === 'export'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-4 h-4" />
              报告导出
            </button>
          </div>
          <div className="flex-1 p-3 overflow-hidden">
            {rightTab === 'analysis' ? <ErrorAnalysisPanel /> : <ReportExportPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
