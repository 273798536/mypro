import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calculator as CalcIcon, ChevronDown, AlertTriangle, FileText, History } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatusBadge, ResultStatusBadge } from '@/components/common/StatusBadge';
import { ParameterPanel } from '@/components/calculator/ParameterPanel';
import { FormulaDisplay } from '@/components/calculator/FormulaDisplay';
import { UnifiedAnnotationPanel } from '@/components/annotation/UnifiedAnnotationPanel';
import { useExperimentStore } from '@/store/useExperimentStore';
import { useCalculation } from '@/hooks/useCalculation';
import { useAnnotationSync } from '@/hooks/useAnnotationSync';
import { CalculationParameters, CalculationResult } from '@/types/experiment';
import { DEFAULT_PARAMETERS } from '@/constants/parameters';
import { useNavigate } from 'react-router-dom';

export default function Calculator() {
  const [showSuspendWarning, setShowSuspendWarning] = useState(false);
  const navigate = useNavigate();

  const experiments = useExperimentStore(state => state.experiments);
  const selectedRecordId = useExperimentStore(state => state.selectedRecordId);
  const selectRecord = useExperimentStore(state => state.selectRecord);
  const results = useExperimentStore(state => state.results);
  const getSelectedRecord = useExperimentStore(state => state.getSelectedRecord);
  const getResultsForRecord = useExperimentStore(state => state.getResultsForRecord);
  const getPendingSuspends = useExperimentStore(state => state.getPendingSuspends);

  const selectedRecord = getSelectedRecord();
  const recordResults = selectedRecordId ? getResultsForRecord(selectedRecordId) : [];
  const pendingSuspends = getPendingSuspends();

  const {
    parameters,
    currentResult,
    boundaryAnalysis,
    isCalculating,
    updateParameter,
    resetToDefaults,
    applyGearShift,
    performCalculation: doCalculation,
    gearLevel,
    sensitivityReport,
  } = useCalculation(selectedRecordId, DEFAULT_PARAMETERS);

  const {
    annotation,
    updateAnnotation,
    syncMode,
    toggleSyncMode,
    syncToAll,
  } = useAnnotationSync(currentResult?.id || null);

  useEffect(() => {
    if (pendingSuspends.length > 0) {
      setShowSuspendWarning(true);
    }
  }, [pendingSuspends.length]);

  useEffect(() => {
    if (experiments.length > 0 && !selectedRecordId) {
      selectRecord(experiments[0].id);
    }
  }, [experiments, selectedRecordId, selectRecord]);

  const handleCalculate = () => {
    if (!selectedRecordId) return;
    doCalculation(parameters);
  };

  const handleGoToExceptions = () => {
    navigate('/exceptions');
  };

  const handleGoToHistory = () => {
    navigate('/history');
  };

  const handleGoToExport = () => {
    navigate('/report');
  };

  if (experiments.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md w-full">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalcIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">暂无实验数据</h2>
            <p className="text-gray-500 mb-6">请先导入实验数据文件，然后再进行复算</p>
            <Button onClick={() => navigate('/import')}>
              前往数据导入
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">复算工作台</h1>
          <p className="text-gray-500 mt-1">调整参数档位，执行风洞实验复算</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingSuspends.length > 0 && (
            <Button
              variant="danger"
              onClick={handleGoToExceptions}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              {pendingSuspends.length} 个异常待处理
            </Button>
          )}
          <Button variant="outline" onClick={handleGoToHistory} className="flex items-center gap-2">
            <History className="w-4 h-4" />
            历史记录
          </Button>
          <Button onClick={handleGoToExport} className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            导出报告
          </Button>
        </div>
      </div>

      {showSuspendWarning && pendingSuspends.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-amber-800">存在方向符号异常</h3>
            <p className="text-sm text-amber-700 mt-1">
              检测到 {pendingSuspends.length} 条记录存在方向符号写反的情况，系统已自动挂起等待项目经理确认。
              请先处理异常后再继续复算，避免得出假稳定结论。
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleGoToExceptions}>
            处理异常
          </Button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">选择实验记录</h2>
                <span className="text-sm text-gray-500">{experiments.length} 条</span>
              </div>
            </div>
            <div className="p-2 max-h-96 overflow-y-auto">
              {experiments.map(exp => (
                <button
                  key={exp.id}
                  onClick={() => selectRecord(exp.id)}
                  className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                    selectedRecordId === exp.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="font-medium text-gray-900 truncate">
                    {exp.experimentName || `实验 #${exp.id.slice(-6)}`}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(exp.importedAt).toLocaleString('zh-CN')}
                  </div>
                  {exp.fieldMappings && (
                    <div className="flex items-center gap-2 mt-2">
                      <StatusBadge status={exp.fieldMappings.every(m => m.processStatus === 'processed') ? 'success' : 'pending'} size="sm">
                        {exp.fieldMappings.filter(m => m.processStatus === 'processed').length}/{exp.fieldMappings.length} 字段已映射
                      </StatusBadge>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </Card>

          <Card className="mt-6">
            <ParameterPanel
              parameters={parameters}
              onParameterChange={updateParameter}
              onReset={resetToDefaults}
              onGearShift={(direction) => applyGearShift(direction === 'up' ? 1 : -1)}
              gearLevel={gearLevel}
              isCalculating={isCalculating}
              disabled={!selectedRecordId}
            />
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">计算结果</h2>
                <div className="flex items-center gap-3">
                  <ResultStatusBadge status={currentResult?.status || 'pending'} />
                  <Button
                    onClick={handleCalculate}
                    disabled={!selectedRecordId || isCalculating}
                    isLoading={isCalculating}
                  >
                    执行复算
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-6">
              {currentResult ? (
                <FormulaDisplay
                  formula={currentResult.formula}
                  result={currentResult.result.liftCoefficient}
                  parameters={parameters}
                  boundaryAnalysis={boundaryAnalysis}
                  sensitivityReport={typeof sensitivityReport === 'string' ? {} : sensitivityReport}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <CalcIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>选择实验记录并调整参数后，点击"执行复算"</p>
                </div>
              )}
            </div>
          </Card>

          {currentResult && (
            <Card>
              <UnifiedAnnotationPanel
                annotation={annotation}
                onUpdate={updateAnnotation}
                syncMode={syncMode}
                onToggleSyncMode={toggleSyncMode}
                onSyncToAll={syncToAll}
              />
            </Card>
          )}

          {recordResults.length > 0 && (
            <Card>
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">历史计算结果</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {recordResults.slice(-5).reverse().map((result: CalculationResult) => (
                  <div key={result.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <ResultStatusBadge status={result.status} size="sm" />
                        <span className="text-sm font-medium text-gray-900">
                          档位 {result.parameterGear}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(result.calculatedAt).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        {result.liftCoefficient?.toFixed(4) || '-'}
                      </div>
                      <div className="text-xs text-gray-500">升力系数</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
