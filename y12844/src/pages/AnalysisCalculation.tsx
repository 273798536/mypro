import React, { useState } from 'react';
import {
  ArrowLeft,
  Calculator,
  FileText,
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Clock,
  RefreshCw,
  Plus
} from 'lucide-react';
import { useSampleStore } from '@/store/useSampleStore';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import { MOCK_SAMPLES } from '@/data/mockSamples';
import { MOCK_REAGENT_LOTS, getReagentById } from '@/data/mockReagents';
import FormulaPanel from '@/components/FormulaPanel';
import StatusBadge from '@/components/StatusBadge';
import { calculateMigrationRate, determineQCStatus, calculateCV } from '@/utils/calculationEngine';
import type { Sample, MigrationDataPoint, FailureCategory } from '@/types';
import { FAILURE_CATEGORY_LABELS, AREA_QUALITY_LABELS } from '@/types';

interface AnalysisCalculationProps {
  sample?: Sample;
  onBack?: () => void;
  onNavigate?: (page: string) => void;
}

const AnalysisCalculation: React.FC<AnalysisCalculationProps> = ({ sample, onBack, onNavigate }) => {
  const { getSelectedSample, currentOperator } = useSampleStore();
  const { getRunsBySample, addAnalysisRun, updateReagentLot, recalculateQC } = useAnalysisStore();

  const sampleFromStore = useSampleStore(state => {
    const selected = state.getSelectedSample();
    return selected ?? MOCK_SAMPLES[0];
  });
  const effectiveSample = sample ?? sampleFromStore;
  const analysisRuns = getRunsBySample(effectiveSample.barcode);
  const latestRun = analysisRuns[0];

  const [activeTab, setActiveTab] = useState<'input' | 'formula' | 'history'>('input');
  const [selectedReagentLot, setSelectedReagentLot] = useState<string>(latestRun?.reagentLotId || '');
  const [showReagentUpdate, setShowReagentUpdate] = useState(false);
  const [reagentUpdateResult, setReagentUpdateResult] = useState<{
    success: boolean;
    affectedSamples: string[];
  } | null>(null);

  const [inputData, setInputData] = useState<Array<{
    timePoint: string;
    pixelArea: string;
    calibrationFactor: string;
    areaQuality: 'good' | 'fair' | 'poor';
  }>>([
    { timePoint: '0', pixelArea: '234000', calibrationFactor: '0.00001', areaQuality: 'good' },
    { timePoint: '6', pixelArea: '186000', calibrationFactor: '0.00001', areaQuality: 'good' },
    { timePoint: '12', pixelArea: '145000', calibrationFactor: '0.00001', areaQuality: 'good' },
    { timePoint: '24', pixelArea: '89000', calibrationFactor: '0.00001', areaQuality: 'good' }
  ]);

  const [failureData, setFailureData] = useState({
    category: 'contamination' as FailureCategory,
    description: '',
    severity: 'moderate' as 'mild' | 'moderate' | 'severe'
  });

  const handleReagentLotUpdate = () => {
    if (!latestRun || !selectedReagentLot) return;

    const result = updateReagentLot(latestRun.runId, selectedReagentLot);
    setReagentUpdateResult(result);
    setShowReagentUpdate(true);

    setTimeout(() => {
      setShowReagentUpdate(false);
    }, 5000);
  };

  const handleRecalculateQC = () => {
    if (latestRun) {
      const newQC = recalculateQC(latestRun.runId);
    }
  };

  const computeMigrationResults = () => {
    const sortedInputs = [...inputData]
      .filter(d => d.timePoint && d.pixelArea)
      .sort((a, b) => Number(a.timePoint) - Number(b.timePoint));

    const initialPoint = sortedInputs.find(d => Number(d.timePoint) === 0);
    if (!initialPoint) return [];

    const initialArea = Number(initialPoint.pixelArea) * Number(initialPoint.calibrationFactor);

    return sortedInputs.map(input => {
      const timePoint = Number(input.timePoint);
      const pixelArea = Number(input.pixelArea);
      const calFactor = Number(input.calibrationFactor);
      const areaMm2 = pixelArea * calFactor;
      const migrationResult = calculateMigrationRate(initialArea, areaMm2, timePoint);

      return {
        timePoint,
        pixelArea,
        calibrationFactor: calFactor,
        areaMm2: parseFloat(areaMm2.toFixed(4)),
        migrationRate: migrationResult.isValid ? migrationResult.rate : 0,
        areaQuality: input.areaQuality,
        isValid: migrationResult.isValid,
        error: migrationResult.reason
      };
    });
  };

  const results = computeMigrationResults();
  const validAreas = results.filter(r => r.isValid).map(r => r.areaMm2);
  const cvResult = calculateCV(validAreas);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => onBack?.()}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100"
              >
                <ArrowLeft size={20} />
                返回样本列表
              </button>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Calculator size={22} className="text-blue-600" />
                  分析计算中心
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-slate-500 font-mono">{effectiveSample.barcode}</span>
                  <span className="text-sm text-slate-500">•</span>
                  <span className="text-sm text-slate-500">{effectiveSample.cellType}</span>
                  <StatusBadge status={effectiveSample.status} size="sm" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate?.('chart')}
                className="px-4 py-2 rounded-lg border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm flex items-center gap-1.5"
              >
                <FileText size={14} />
                查看图表
              </button>
              <button
                onClick={() => onNavigate?.('review')}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 size={14} />
                进入复核
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {effectiveSample.isBarcodeDuplicate && (
          <div className="mb-6 bg-rose-50 border-2 border-rose-300 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={24} className="text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-rose-800 text-lg mb-2">
                  ⚠️ 条码重复警告 - 此样本已被系统拦截
                </h3>
                <p className="text-sm text-rose-700 mb-3">
                  条码 <code className="bg-rose-100 px-2 py-0.5 rounded font-mono">{effectiveSample.barcode}</code>
                  已存在于数据库中。继续分析可能导致数据混淆，请先确认并修正条码问题。
                </p>
                <div className="bg-white rounded-lg p-4 border border-rose-200">
                  <h4 className="text-xs font-semibold text-rose-600 uppercase mb-2">📚 学生学习提示</h4>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    <strong>为什么必须拦截？</strong>想象一下医院里有两个病人用了同一个病历号，
                    医生就无法区分谁的检查报告是谁的。同样的道理，如果两个样本用了同一个条码，
                    系统就无法区分哪个分析结果属于哪个样本。这会导致<strong>报告错误</strong>，
                    甚至可能<strong>影响病人诊断</strong>！所以必须先解决条码问题，才能继续分析。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {latestRun && latestRun.status === 'failed' && latestRun.failureReason && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-800 mb-2">上次分析失败</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="bg-white rounded-lg p-3 border border-red-100">
                        <p className="text-xs text-red-500 mb-1">失败类型</p>
                        <p className="font-medium text-red-700">{FAILURE_CATEGORY_LABELS[latestRun.failureReason.category]}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-red-100">
                        <p className="text-xs text-red-500 mb-1">严重程度</p>
                        <p className={`font-medium ${
                          latestRun.failureReason.severity === 'severe' ? 'text-red-700' :
                            latestRun.failureReason.severity === 'moderate' ? 'text-orange-600' : 'text-amber-600'
                        }`}>
                          {latestRun.failureReason.severity === 'severe' ? '🔴 严重' :
                            latestRun.failureReason.severity === 'moderate' ? '🟡 中等' : '🟢 轻微'}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-red-100 md:col-span-1">
                        <p className="text-xs text-red-500 mb-1">操作人</p>
                        <p className="font-medium text-red-700">{latestRun.analyzedBy}</p>
                      </div>
                    </div>
                    <p className="text-sm text-red-600 mt-3 p-3 bg-red-100/50 rounded-lg">
                      {latestRun.failureReason.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                    <FlaskConical size={18} className="text-blue-600" />
                    数据录入与计算
                  </h2>
                  <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-1">
                    {[
                      { value: 'input', label: '数据计算', icon: Calculator },
                      { value: 'formula', label: '公式说明', icon: FileText },
                      { value: 'history', label: '历史记录', icon: Clock }
                    ].map((tab) => (
                      <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value as any)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === tab.value
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-100'
                          }`}
                      >
                        <tab.icon size={13} />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5">
                {activeTab === 'input' && (
                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-700">划痕测量数据</h3>
                        <button
                          onClick={() => setInputData([...inputData, {
                            timePoint: '', pixelArea: '', calibrationFactor: '0.00001', areaQuality: 'good'
                          }])}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                        >
                          <Plus size={12} />
                          添加时间点
                        </button>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">时间点 (h)</th>
                              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">像素面积</th>
                              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">校准系数</th>
                              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">图像质量</th>
                              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">计算面积 (mm²)</th>
                              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">迁移率 (%)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {inputData.map((row, idx) => {
                              const result = results[idx];
                              return (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="px-4 py-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={row.timePoint}
                                      onChange={(e) => {
                                        const newData = [...inputData];
                                        newData[idx].timePoint = e.target.value;
                                        setInputData(newData);
                                      }}
                                      className="w-20 px-2 py-1 border border-slate-300 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="0"
                                    />
                                  </td>
                                  <td className="px-4 py-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={row.pixelArea}
                                      onChange={(e) => {
                                        const newData = [...inputData];
                                        newData[idx].pixelArea = e.target.value;
                                        setInputData(newData);
                                      }}
                                      className="w-28 px-2 py-1 border border-slate-300 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="像素数"
                                    />
                                  </td>
                                  <td className="px-4 py-2">
                                    <input
                                      type="text"
                                      value={row.calibrationFactor}
                                      onChange={(e) => {
                                        const newData = [...inputData];
                                        newData[idx].calibrationFactor = e.target.value;
                                        setInputData(newData);
                                      }}
                                      className="w-24 px-2 py-1 border border-slate-300 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </td>
                                  <td className="px-4 py-2">
                                    <select
                                      value={row.areaQuality}
                                      onChange={(e) => {
                                        const newData = [...inputData];
                                        newData[idx].areaQuality = e.target.value as any;
                                        setInputData(newData);
                                      }}
                                      className="w-24 px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="good">良好</option>
                                      <option value="fair">一般</option>
                                      <option value="poor">较差</option>
                                    </select>
                                  </td>
                                  <td className="px-4 py-2">
                                    {result ? (
                                      <span className={`font-mono font-semibold text-sm ${result.isValid ? 'text-slate-800' : 'text-red-500'
                                        }`}>
                                        {result.areaMm2.toFixed(4)}
                                      </span>
                                    ) : <span className="text-slate-400 text-sm">-</span>}
                                  </td>
                                  <td className="px-4 py-2">
                                    {result ? (
                                      <div>
                                        <span className={`font-mono font-bold text-sm ${!result.isValid ? 'text-red-500' :
                                            result.migrationRate >= 40 ? 'text-emerald-600' : 'text-amber-600'
                                          }`}>
                                          {result.isValid ? `${result.migrationRate.toFixed(2)}%` : '计算错误'}
                                        </span>
                                        {!result.isValid && result.error && (
                                          <p className="text-xs text-red-500 mt-0.5">{result.error}</p>
                                        )}
                                      </div>
                                    ) : <span className="text-slate-400 text-sm">-</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        💡 提示：填写像素面积和校准系数后，系统将自动计算实际面积和迁移率
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <p className="text-xs text-blue-600 mb-1">24h迁移率</p>
                        {results.length > 0 && results.find(r => r.timePoint === 24) ? (
                          <p className={`text-2xl font-bold ${results.find(r => r.timePoint === 24)!.migrationRate >= 40
                              ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                            {results.find(r => r.timePoint === 24)!.migrationRate.toFixed(1)}%
                          </p>
                        ) : <p className="text-2xl font-bold text-slate-300">-</p>}
                        <p className="text-xs text-blue-500 mt-1">临界值: ≥40% 为迁移正常</p>
                      </div>
                      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                        <p className="text-xs text-indigo-600 mb-1">变异系数 CV</p>
                        <p className={`text-2xl font-bold ${cvResult.isValid
                            ? cvResult.cv > 10 ? 'text-red-600' : 'text-emerald-600'
                            : 'text-slate-400'
                          }`}>
                          {cvResult.isValid ? `${cvResult.cv.toFixed(2)}%` : 'N/A'}
                        </p>
                        <p className="text-xs text-indigo-500 mt-1">
                          {cvResult.isValid
                            ? cvResult.cv > 10 ? '⚠️ 超过阈值10%' : '✅ 重复性良好'
                            : cvResult.reason}
                        </p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                        <p className="text-xs text-emerald-600 mb-1">数据完整性</p>
                        <p className="text-2xl font-bold text-emerald-600">
                          {results.filter(r => r.isValid).length}/{results.length}
                        </p>
                        <p className="text-xs text-emerald-500 mt-1">有效数据点占比</p>
                      </div>
                    </div>

                    <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <FlaskConical size={16} className="text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-amber-800 text-sm mb-3">试剂批号关联（质控联动）</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-amber-700 mb-1.5 block font-medium">当前试剂批号</label>
                              <select
                                value={selectedReagentLot}
                                onChange={(e) => setSelectedReagentLot(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-amber-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                              >
                                <option value="">-- 请选择或补录试剂批号 --</option>
                                {MOCK_REAGENT_LOTS.map(reagent => (
                                  <option key={reagent.lotId} value={reagent.lotId}>
                                    {reagent.lotId} - {reagent.reagentName} ({reagent.manufacturer})
                                  </option>
                                ))}
                              </select>
                              {selectedReagentLot && getReagentById(selectedReagentLot) && (
                                <p className="text-xs text-amber-600 mt-1.5">
                                  📋 {getReagentById(selectedReagentLot)?.reagentName} |
                                  有效期至: {getReagentById(selectedReagentLot)?.expiryDate.toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <div className="flex items-end">
                              <button
                                onClick={handleReagentLotUpdate}
                                disabled={!selectedReagentLot || !latestRun}
                                className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                              >
                                <RefreshCw size={14} />
                                补录批号并更新质控
                              </button>
                            </div>
                          </div>
                          {showReagentUpdate && reagentUpdateResult && (
                            <div className={`mt-3 p-3 rounded-lg text-xs ${reagentUpdateResult.success
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-red-100 text-red-700 border border-red-200'
                              }`}>
                              {reagentUpdateResult.success ? (
                                <div>
                                  <p className="font-medium mb-1">✅ 试剂批号已补录，质控数据已更新</p>
                                  <p>
                                    联动影响样本数: {reagentUpdateResult.affectedSamples.length} 个，
                                    所有关联样本的质控参数已重新计算
                                  </p>
                                </div>
                              ) : (
                                <p>❌ 更新失败，请检查数据</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        onClick={handleRecalculateQC}
                        className="px-5 py-2.5 rounded-lg border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm flex items-center gap-2"
                      >
                        <RefreshCw size={14} />
                        重新计算质控
                      </button>
                      <button className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm flex items-center gap-2 shadow-sm">
                        <Calculator size={14} />
                        保存并运行分析
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'formula' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <h4 className="font-semibold text-blue-800 text-sm mb-2">📐 计算工具使用说明</h4>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        本页所有计算均采用临床检验标准化公式。您可以在右侧面板查看每个公式的详细说明、
                        单位定义、适用范围和不适用情况。请确保数据符合适用范围，否则计算结果可能无效。
                      </p>
                    </div>
                    <div className="space-y-3">
                      <h5 className="text-sm font-semibold text-slate-700">当前计算过程演示</h5>
                      {results.slice(0, 3).map((result, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <p className="text-xs font-semibold text-slate-600 mb-2">
                            {result.timePoint}h 时间点计算过程
                          </p>
                          <div className="font-mono text-xs space-y-1 text-slate-700">
                            <p>① 实际面积 = 像素面积 × 校准系数</p>
                            <p className="pl-4 text-slate-500">
                              = {result.pixelArea.toLocaleString()} × {result.calibrationFactor}
                              = <span className="text-blue-600 font-bold">{result.areaMm2.toFixed(4)} mm²</span>
                            </p>
                            {result.timePoint > 0 && (
                              <>
                                <p className="mt-2">② 迁移率 = [(初始面积 - 当前面积) / 初始面积] × 100%</p>
                                <p className="pl-4 text-slate-500">
                                  = [({results[0].areaMm2.toFixed(4)} - {result.areaMm2.toFixed(4)}) / {results[0].areaMm2.toFixed(4)}] × 100%
                                </p>
                                <p className="pl-4">
                                  = <span className={`font-bold ${result.migrationRate >= 40 ? 'text-emerald-600' : 'text-amber-600'
                                    }`}>{result.migrationRate.toFixed(2)}%</span>
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="space-y-4">
                    {analysisRuns.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <Clock size={40} className="mx-auto mb-3 text-slate-300" />
                        <p>暂无历史分析记录</p>
                      </div>
                    ) : (
                      analysisRuns.map((run, idx) => (
                        <div
                          key={run.runId}
                          className={`rounded-xl border-2 p-5 ${idx === 0
                              ? 'border-blue-300 bg-blue-50/50'
                              : 'border-slate-200 bg-white'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${idx === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                <span className="font-bold">#{run.runNumber}</span>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">
                                  第 {run.runNumber} 次运行
                                  {idx === 0 && <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">最新</span>}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {run.analyzedAt.toLocaleString('zh-CN')} • {run.analyzedBy}
                                </p>
                              </div>
                            </div>
                            <StatusBadge
                              status={run.status === 'completed' ? (run.qcResult?.status || 'pass') : 'bad'}
                              type={run.status === 'completed' ? 'qc' : 'sample'}
                              size="sm"
                            />
                          </div>
                          {run.status === 'completed' && run.migrationData.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mb-3">
                              {run.migrationData.map(d => (
                                <div key={d.timePoint} className="bg-white rounded-lg p-2 border border-slate-200 text-center">
                                  <p className="text-xs text-slate-500">{d.timePoint}h 迁移率</p>
                                  <p className={`font-mono font-bold text-sm ${d.migrationRate >= 40 ? 'text-emerald-600' : 'text-amber-600'
                                    }`}>
                                    {d.migrationRate.toFixed(1)}%
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                          {run.reagentLotId ? (
                            <p className="text-xs text-slate-500">
                              🧪 试剂批号: <span className="font-mono text-slate-700">{run.reagentLotId}</span>
                            </p>
                          ) : (
                            <p className="text-xs text-amber-600">
                              ⚠️ 试剂批号未补录，请在「数据计算」标签页补录
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <FormulaPanel showAll={false} />

            {latestRun?.qcResult && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 text-sm">质控结果详情</h3>
                  <StatusBadge status={latestRun.qcResult.status} type="qc" size="sm" />
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">CV值</span>
                      <span className="font-mono font-bold text-slate-800">
                        {latestRun.qcResult.cvValue.toFixed(2)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${latestRun.qcResult.cvValue > 10 ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                        style={{ width: `${Math.min(latestRun.qcResult.cvValue * 5, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">阈值: ≤10%</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Z'因子</span>
                      <span className="font-mono font-bold text-slate-800">
                        {latestRun.qcResult.zPrimeFactor.toFixed(3)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${latestRun.qcResult.zPrimeFactor < 0.5 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        style={{ width: `${Math.max(latestRun.qcResult.zPrimeFactor * 100, 5)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">阈值: ≥0.5</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">细胞存活率</span>
                      <span className="font-mono font-bold text-slate-800">
                        {latestRun.qcResult.cellViability.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${latestRun.qcResult.cellViability < 90 ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                        style={{ width: `${latestRun.qcResult.cellViability}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">阈值: ≥90%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisCalculation;
