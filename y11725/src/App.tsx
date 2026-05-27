import { useEffect, useRef, useState } from 'react';
import { Camera, FileText, Download, Trash2, BookOpen, AlertTriangle } from 'lucide-react';
import PVDiagramCanvas from './components/PVDiagram/PVDiagramCanvas';
import StatePointForm from './components/ControlPanel/StatePointForm';
import ProcessSelector from './components/ControlPanel/ProcessSelector';
import CalculationResult from './components/ResultPanel/CalculationResult';
import AnomalyDisplay from './components/ResultPanel/AnomalyDisplay';
import HistoryTimeline from './components/ResultPanel/HistoryTimeline';
import { useThermoStore, useCycleResult } from './hooks/useThermoStore';
import { generateReport, downloadReport } from './utils/export';
import { PROCESS_COLORS, PROCESS_LABELS } from './types';

export default function App() {
  const { statePoints, processes, anomalies, loadExample, clearAll } = useThermoStore();
  const cycleResult = useCycleResult();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'results' | 'anomalies' | 'history'>('results');
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    if (statePoints.length === 0 && processes.length === 0) {
      setShowWelcome(true);
    }
  }, [statePoints.length, processes.length]);

  const handleExportReport = () => {
    const report = generateReport(statePoints, processes, cycleResult, anomalies);
    downloadReport(report);
  };

  const handleExportScreenshot = () => {
    const canvas = canvasContainerRef.current?.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `pv-diagram-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const handleLoadExample = () => {
    loadExample();
    setShowWelcome(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">PV</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                热力学循环教学器
              </h1>
              <p className="text-xs text-slate-500">交互式热力学过程分析工具</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadExample}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors"
            >
              <BookOpen size={16} />
              加载示例
            </button>
            <button
              onClick={handleExportScreenshot}
              disabled={statePoints.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
            >
              <Camera size={16} />
              截图
            </button>
            <button
              onClick={handleExportReport}
              disabled={statePoints.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              <FileText size={16} />
              导出报告
            </button>
            <button
              onClick={clearAll}
              disabled={statePoints.length === 0 && processes.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 disabled:bg-slate-800 disabled:text-slate-600 text-red-400 text-sm rounded-lg transition-colors"
            >
              <Trash2 size={16} />
              清空
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1920px] mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-4">
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
              <StatePointForm />
              <ProcessSelector />
            </div>

            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-3">过程图例</h3>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(PROCESS_LABELS).map(([type, label]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: PROCESS_COLORS[type as keyof typeof PROCESS_COLORS] }}
                    />
                    <span className="text-xs text-slate-300">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-5">
            <div ref={canvasContainerRef} className="h-full">
              {showWelcome && statePoints.length === 0 ? (
                <div className="h-full min-h-[600px] bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-8">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center mb-6">
                    <span className="text-5xl">🔥</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-200 mb-2">热力学循环教学器</h2>
                  <p className="text-slate-400 text-center max-w-md mb-6">
                    通过交互式PV图直观理解热力学过程，自动计算功、热量和效率，
                    检测常见错误并提供可追溯的异常说明。
                  </p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleLoadExample}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
                    >
                      <BookOpen size={18} />
                      加载卡诺循环示例
                    </button>
                    <button
                      onClick={() => setShowWelcome(false)}
                      className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
                    >
                      从空白开始
                    </button>
                  </div>
                  <div className="mt-8 grid grid-cols-3 gap-6 text-center">
                    <div>
                      <div className="text-3xl font-bold text-blue-400 mb-1">5</div>
                      <div className="text-xs text-slate-500">过程类型</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-emerald-400 mb-1">7</div>
                      <div className="text-xs text-slate-500">异常检测</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-purple-400 mb-1">100%</div>
                      <div className="text-xs text-slate-500">可追溯</div>
                    </div>
                  </div>
                </div>
              ) : (
                <PVDiagramCanvas />
              )}
            </div>
          </div>

          <div className="col-span-4">
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                <button
                  onClick={() => setActiveTab('results')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === 'results'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  计算结果
                </button>
                <button
                  onClick={() => setActiveTab('anomalies')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === 'anomalies'
                      ? 'bg-red-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  异常检测
                  {anomalies.length > 0 && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded-full">
                      {anomalies.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === 'history'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  操作历史
                </button>
              </div>

              <div className="min-h-[500px]">
                {activeTab === 'results' && <CalculationResult />}
                {activeTab === 'anomalies' && <AnomalyDisplay />}
                {activeTab === 'history' && <HistoryTimeline />}
              </div>
            </div>
          </div>
        </div>

        {anomalies.length > 0 && (
          <div className="mt-4 p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl flex items-center gap-3">
            <AlertTriangle className="text-amber-400 flex-shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-sm text-amber-200">
                检测到 <span className="font-bold">{anomalies.length}</span> 个异常。
                请切换到"异常检测"标签查看详细信息和修正建议。
              </p>
            </div>
            <button
              onClick={() => setActiveTab('anomalies')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg transition-colors"
            >
              查看异常
            </button>
          </div>
        )}
      </div>

      <footer className="mt-8 py-6 border-t border-slate-800 text-center text-slate-500 text-xs">
        <p>热力学循环教学器 · 让物理计算清晰可追溯</p>
      </footer>
    </div>
  );
}
