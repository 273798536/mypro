import { useState, useEffect } from 'react';
import { Play, RotateCcw, FileText } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CalculationService } from '../services/calculationService';
import { ReportService } from '../services/reportService';
import ParamsForm from '../components/calculator/ParamsForm';
import ResultDisplay from '../components/calculator/ResultDisplay';
import SavedList from '../components/calculator/SavedList';
import type { CalculationParams, CalculationResult, ValidationError } from '../types';

export default function CalculatorPage() {
  const {
    calculations,
    currentCalculation,
    currentResult,
    selectedCompareIds,
    setCurrentCalculation,
    setCurrentResult,
    addCalculation,
    updateCalculation,
    deleteCalculation,
    addReport,
    toggleCompare,
  } = useStore();

  const [params, setParams] = useState<CalculationParams>(() =>
    currentCalculation || CalculationService.createDefaultParams()
  );
  const [result, setResult] = useState<CalculationResult | null>(currentResult);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (currentCalculation) {
      setParams(currentCalculation);
      if (currentResult) {
        setResult(currentResult);
      } else {
        setResult(null);
      }
    }
  }, [currentCalculation, currentResult]);

  useEffect(() => {
    const validationErrors = CalculationService.validate(params);
    setErrors(validationErrors);
  }, [params]);

  const handleCalculate = () => {
    if (!CalculationService.canCalculate(params)) {
      return;
    }

    setIsCalculating(true);
    setTimeout(() => {
      try {
        const calcResult = CalculationService.calculate(params);
        setResult(calcResult);
        setCurrentCalculation(params);
        setCurrentResult(calcResult);
      } catch (error) {
        console.error('计算失败:', error);
      } finally {
        setIsCalculating(false);
      }
    }, 300);
  };

  const handleSave = () => {
    if (!result) return;

    const existingIndex = calculations.findIndex((c) => c.id === params.id);
    if (existingIndex >= 0) {
      updateCalculation(params.id, params);
    } else {
      addCalculation(params);
    }
    addReport(ReportService.generateReport(params, result));
    alert('方案已保存！');
  };

  const handleReset = () => {
    const newParams = CalculationService.createDefaultParams();
    setParams(newParams);
    setResult(null);
    setCurrentCalculation(null);
    setCurrentResult(null);
  };

  const handleSelectSaved = (calc: CalculationParams) => {
    setParams(calc);
    setCurrentCalculation(calc);
    setCurrentResult(null);
    setResult(null);
  };

  const handleAddToCompare = () => {
    if (params.id) {
      toggleCompare(params.id);
    }
  };

  const handleExportReport = () => {
    if (!result) return;
    ReportService.downloadTextReport(params, result);
  };

  const handleExportJSON = () => {
    if (!result) return;
    const json = ReportService.exportToJSON(params, result);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${params.name}_计算数据.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasErrors = errors.some((e) => e.severity === 'error');
  const canCalculate = CalculationService.canCalculate(params) && !hasErrors;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">压降计算</h1>
          <p className="text-gray-500 mt-1">输入管路参数，计算流体压降</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleReset} className="btn btn-secondary">
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
          <button
            onClick={handleCalculate}
            disabled={!canCalculate || isCalculating}
            className={`btn btn-primary ${(!canCalculate || isCalculating) ? 'btn-disabled' : ''}`}
          >
            <Play className="w-4 h-4" />
            {isCalculating ? '计算中...' : '开始计算'}
          </button>
        </div>
      </div>

      {hasErrors && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          请修正以下错误后再进行计算：
          <ul className="list-disc list-inside mt-2 space-y-1">
            {errors
              .filter((e) => e.severity === 'error')
              .map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header">输入参数</div>
            <div className="card-body">
              <ParamsForm
                params={params}
                onChange={setParams}
                errors={errors}
              />
            </div>
          </div>

          {result && (
            <div className="animate-fade-in-up">
              <ResultDisplay
                params={params}
                result={result}
                onSave={handleSave}
                onAddToCompare={handleAddToCompare}
                onExportReport={handleExportReport}
                onExportJSON={handleExportJSON}
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <SavedList
            calculations={calculations}
            selectedId={currentCalculation?.id}
            onSelect={handleSelectSaved}
            onDelete={deleteCalculation}
            onAddToCompare={toggleCompare}
            compareIds={selectedCompareIds}
          />

          {!result && (
            <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
              <div className="card-body text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-primary-400" />
                <h3 className="font-semibold text-gray-800 mb-2">准备开始</h3>
                <p className="text-sm text-gray-600">
                  输入管径、流量、管长等参数，点击"开始计算"获取压降结果
                </p>
                <div className="mt-4 text-xs text-gray-500 space-y-1 text-left">
                  <p>💡 <strong>提示：</strong></p>
                  <p>• 选择管材可自动填充粗糙度</p>
                  <p>• 添加阀门计算局部阻力损失</p>
                  <p>• 保存方案后可进行多方案对比</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
