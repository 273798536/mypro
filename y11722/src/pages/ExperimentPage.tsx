import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Save, Camera, FileText, Download, RotateCcw } from 'lucide-react';
import { useExperimentStore } from '../store/useExperimentStore';
import { InclineCanvas } from '../components/InclineCanvas/InclineCanvas';
import { ControlPanel } from '../components/ControlPanel/ControlPanel';
import { ForceAnalysisPanel } from '../components/ForceAnalysis/ForceAnalysis';
import { ErrorAlert } from '../components/ErrorAlert/ErrorAlert';
import { DataImport } from '../components/DataImport/DataImport';
import { RecordList } from '../components/RecordList/RecordList';
import { exportToPNG, exportToPDF, exportRecordsToJSON } from '../utils/export';
import { ExperimentRecord } from '../types';

export const ExperimentPage: React.FC = () => {
  const {
    currentParams,
    analysisResult,
    records,
    selectedRecordId,
    importStrategy,
    isAnimating,
    animationSpeed,
    currentAnomalies,
    blockPosition,
    setParams,
    saveRecord,
    selectRecord,
    loadRecord,
    deleteRecord,
    importRecords,
    setImportStrategy,
    toggleAnimation,
    setAnimationSpeed,
    setBlockPosition,
    setStudentJudgment,
    detectAnomalies,
  } = useExperimentStore();

  const [showSourceInput, setShowSourceInput] = useState(false);
  const [source, setSource] = useState('手动输入');
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'simulation' | 'data' | 'import'>('simulation');
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!analysisResult) {
      const initialParams = { ...currentParams };
      setParams(initialParams);
    }
  }, []);

  const handleSave = () => {
    if (showSourceInput) {
      saveRecord(source, notes);
      setShowSourceInput(false);
      setSource('手动输入');
      setNotes('');
    } else {
      setShowSourceInput(true);
    }
  };

  const handleExportPNG = async () => {
    if (canvasRef.current) {
      await exportToPNG('incline-canvas', `experiment-${Date.now()}.png`);
    }
  };

  const handleExportPDF = async (record: ExperimentRecord) => {
    await exportToPDF(record, 'incline-canvas');
  };

  const handleExportAllJSON = () => {
    exportRecordsToJSON(records);
  };

  const handleReset = () => {
    setParams({
      angle: 30,
      angleUnit: 'degree',
      frictionCoefficient: 0.5,
      mass: 1,
      externalForce: 0,
      externalForceAngle: 0,
      externalForceDirection: 'up',
    });
    setBlockPosition(0.3);
  };

  const criticalAngle = analysisResult?.criticalAngle || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                🔬 摩擦斜面实验面板
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                调节参数观察物块滑动状态，进行受力分析
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAnimation}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  isAnimating
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isAnimating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isAnimating ? '暂停动画' : '播放动画'}
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                重置
              </button>
            </div>
          </div>

          <div className="flex gap-1 mt-4">
            {[
              { id: 'simulation', label: '🎮 模拟实验' },
              { id: 'data', label: '📊 数据管理' },
              { id: 'import', label: '📥 导入导出' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2 rounded-t-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-primary-600 border-t border-x border-slate-200 -mb-px'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'simulation' && (
          <>
            {currentAnomalies.length > 0 && (
              <div className="mb-6">
                <ErrorAlert anomalies={currentAnomalies} />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 space-y-6">
                <ControlPanel
                  params={currentParams}
                  onParamsChange={setParams}
                  criticalAngle={criticalAngle}
                />

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">⚡ 动画控制</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm text-slate-600 mb-2">
                        <span>动画速度</span>
                        <span>{animationSpeed.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="3"
                        step="0.1"
                        value={animationSpeed}
                        onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800">🖼️ 斜面模拟</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleExportPNG}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        截图
                      </button>
                      <button
                        onClick={handleSave}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          showSourceInput
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Save className="w-4 h-4" />
                        保存
                      </button>
                    </div>
                  </div>

                  {showSourceInput && (
                    <div className="mb-4 p-4 bg-green-50 rounded-lg space-y-3">
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">
                          数据来源
                        </label>
                        <input
                          type="text"
                          value={source}
                          onChange={(e) => setSource(e.target.value)}
                          placeholder="例如：课堂实验、作业提交"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">
                          备注（可选）
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="记录实验步骤、观察现象等"
                          rows={2}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                        >
                          确认保存
                        </button>
                        <button
                          onClick={() => setShowSourceInput(false)}
                          className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}

                  <div id="incline-canvas" ref={canvasRef}>
                    <InclineCanvas
                      params={currentParams}
                      analysis={analysisResult}
                      blockPosition={blockPosition}
                      isAnimating={isAnimating}
                      animationSpeed={animationSpeed}
                      onPositionChange={setBlockPosition}
                      showForces={true}
                    />
                  </div>
                </div>

                <ForceAnalysisPanel analysis={analysisResult} />
              </div>
            </div>
          </>
        )}

        {activeTab === 'data' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecordList
              records={records}
              selectedId={selectedRecordId}
              onSelect={selectRecord}
              onLoad={loadRecord}
              onDelete={deleteRecord}
              onExport={handleExportPDF}
              onSetJudgment={setStudentJudgment}
            />

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-slate-800 border-b pb-3 mb-4">
                📤 导出选项
              </h2>
              <div className="space-y-4">
                <button
                  onClick={handleExportAllJSON}
                  disabled={records.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  导出所有记录为 JSON
                </button>
                <p className="text-sm text-slate-500 text-center">
                  共 {records.length} 条记录可导出
                </p>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">💡 使用提示</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 点击记录可展开查看详情</li>
                  <li>• 点击"加载"可恢复到该实验参数</li>
                  <li>• 选择学生判断可批改作业并检测错误</li>
                  <li>• 导出PDF时会自动包含当前画布截图</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DataImport
              onImport={importRecords}
              importStrategy={importStrategy}
              onStrategyChange={setImportStrategy}
            />

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-slate-800 border-b pb-3 mb-4">
                📖 使用说明
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h3 className="font-semibold text-slate-800 mb-2">重复数据策略</h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="font-medium text-slate-700">忽略</dt>
                      <dd className="text-slate-500">保留原有数据，跳过重复条目</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-700">覆盖</dt>
                      <dd className="text-slate-500">替换已有数据，版本号+1</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-700">追加</dt>
                      <dd className="text-slate-500">作为新记录添加，保留所有版本</dd>
                    </div>
                  </dl>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg">
                  <h3 className="font-semibold text-amber-800 mb-2">⚠️ 异常检测</h3>
                  <p className="text-sm text-amber-700">
                    导入时会自动检测数据异常，包括：
                  </p>
                  <ul className="text-sm text-amber-600 mt-2 space-y-1">
                    <li>• 临界角误判</li>
                    <li>• 角度单位混淆</li>
                    <li>• 力方向错误</li>
                    <li>• 数据冲突</li>
                  </ul>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">📋 数据格式</h3>
                  <p className="text-sm text-green-700">
                    支持JSON格式，可包含单条或多条记录。每条记录包含实验参数、受力分析结果、异常检测信息等。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-slate-500">
          摩擦斜面实验面板 | 高中物理实验模拟工具
        </div>
      </footer>
    </div>
  );
};
