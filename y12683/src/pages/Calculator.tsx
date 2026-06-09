import { useState, useMemo } from 'react';
import {
  Calculator as CalcIcon,
  Play,
  AlertCircle,
  CheckCircle2,
  Info,
  BookOpen,
  Target,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { formulaDefinitions, calculateWithFormula, getFormulaById } from '@/utils/formulas';
import type { CalculationResult } from '@/types';

export default function Calculator() {
  const { slices, addMeasurement, tanks } = useAppStore();
  const [selectedFormulaId, setSelectedFormulaId] = useState(formulaDefinitions[0].id);
  const [params, setParams] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    formulaDefinitions[0].parameters.forEach((p) => {
      initial[p.name] = p.defaultValue ?? 0;
    });
    return initial;
  });
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [selectedTankId, setSelectedTankId] = useState(tanks[0]?.id || '');
  const [selectedSliceId, setSelectedSliceId] = useState(slices[0]?.id || '');

  const currentFormula = useMemo(
    () => getFormulaById(selectedFormulaId),
    [selectedFormulaId]
  );

  const availableSlices = slices.filter((s) => s.tankId === selectedTankId);

  const handleFormulaChange = (formulaId: string) => {
    setSelectedFormulaId(formulaId);
    const formula = getFormulaById(formulaId);
    const newParams: Record<string, number> = {};
    if (formula) {
      formula.parameters.forEach((p) => {
        newParams[p.name] = p.defaultValue ?? 0;
      });
    }
    setParams(newParams);
    setResult(null);
    setHasCalculated(false);
  };

  const handleParamChange = (name: string, value: string) => {
    const numValue = parseFloat(value);
    setParams((prev) => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
    setResult(null);
  };

  const handleCalculate = () => {
    const calcResult = calculateWithFormula(selectedFormulaId, params);
    setResult(calcResult);
    setHasCalculated(true);
  };

  const handleSaveAsMeasurement = () => {
    if (!result?.success || !selectedSliceId) return;

    const slice = slices.find((s) => s.id === selectedSliceId);
    if (!slice) return;

    const calculatedValues: Record<string, number> = { result: result.value ?? 0 };
    if (selectedFormulaId === 'cylindrical' || selectedFormulaId === 'spherical' || selectedFormulaId === 'conical') {
      calculatedValues.volume = result.value ?? 0;
    }

    addMeasurement({
      relatedSliceId: selectedSliceId,
      tankId: slice.tankId,
      tankName: slice.tankName,
      parameters: params,
      calculatedValues,
      formulaType: selectedFormulaId,
      notes: `由计算工具生成 - ${currentFormula?.name}`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">计算工具</h1>
        <p className="text-tech-gray-400 mt-1">
          评审会前核算工具 - 公式、单位、适用范围与失败原因清晰展示
        </p>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 space-y-6">
          <div className="glass-card p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-tech-gray-300 mb-2">
                选择计算公式
              </label>
              <div className="grid grid-cols-2 gap-2">
                {formulaDefinitions.map((formula) => (
                  <button
                    key={formula.id}
                    onClick={() => handleFormulaChange(formula.id)}
                    className={`p-4 rounded-xl text-left transition-all ${
                      selectedFormulaId === formula.id
                        ? 'bg-deep-sea-500/20 border-2 border-deep-sea-500/50 shadow-lg shadow-deep-sea-500/10'
                        : 'bg-tech-gray-900/40 border-2 border-transparent hover:border-white/10'
                    }`}
                  >
                    <p className="text-white font-medium mb-1">{formula.name}</p>
                    <p className="text-deep-sea-400 font-mono text-sm">{formula.formula}</p>
                  </button>
                ))}
              </div>
            </div>

            {currentFormula && (
              <div className="p-5 rounded-xl bg-gradient-to-br from-deep-sea-500/10 to-transparent border border-deep-sea-500/20">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-deep-sea-500/20 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-deep-sea-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{currentFormula.name}</h3>
                    <p className="text-2xl font-mono text-deep-sea-300 mt-1">
                      {currentFormula.formula}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-tech-gray-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-tech-gray-500 text-xs">单位</p>
                      <p className="text-white font-medium">{currentFormula.unit}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-tech-gray-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-tech-gray-500 text-xs">适用范围</p>
                      <p className="text-white text-sm">{currentFormula.scope}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning-orange-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-tech-gray-500 text-xs">失败原因</p>
                      <ul className="text-white text-xs space-y-0.5">
                        {currentFormula.failureReasons.slice(0, 2).map((reason, i) => (
                          <li key={i}>· {reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CalcIcon className="w-5 h-5 text-deep-sea-400" />
              参数输入
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {currentFormula?.parameters.map((param) => (
                <div key={param.name}>
                  <label className="block text-sm text-tech-gray-400 mb-1.5">
                    {param.label}
                    {param.min !== undefined && param.max !== undefined && (
                      <span className="text-tech-gray-600 ml-1">
                        ({param.min} ~ {param.max})
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={params[param.name] ?? ''}
                      onChange={(e) => handleParamChange(param.name, e.target.value)}
                      className="input-field pr-14"
                      placeholder={param.defaultValue?.toString()}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-tech-gray-500 text-sm">
                      {param.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={handleCalculate} className="btn-primary flex items-center gap-2">
                <Play className="w-4 h-4" />
                开始计算
              </button>

              {hasCalculated && (
                <div className="flex-1 flex items-center justify-end gap-3">
                  <select
                    value={selectedTankId}
                    onChange={(e) => {
                      setSelectedTankId(e.target.value);
                      const firstSlice = slices.find((s) => s.tankId === e.target.value);
                      if (firstSlice) setSelectedSliceId(firstSlice.id);
                    }}
                    className="input-field w-40 py-2 text-sm"
                  >
                    {tanks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedSliceId}
                    onChange={(e) => setSelectedSliceId(e.target.value)}
                    className="input-field w-48 py-2 text-sm"
                  >
                    {availableSlices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleSaveAsMeasurement}
                    disabled={!result?.success}
                    className="btn-success text-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <ArrowRight className="w-4 h-4" />
                    保存为测量记录
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              {result?.success ? (
                <CheckCircle2 className="w-5 h-5 text-success-green-500" />
              ) : hasCalculated ? (
                <AlertCircle className="w-5 h-5 text-warning-orange-500" />
              ) : (
                <Info className="w-5 h-5 text-tech-gray-500" />
              )}
              计算结果
            </h3>

            {!hasCalculated ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-tech-gray-900/60 flex items-center justify-center mx-auto mb-4">
                  <CalcIcon className="w-8 h-8 text-tech-gray-600" />
                </div>
                <p className="text-tech-gray-500">输入参数后点击"开始计算"</p>
              </div>
            ) : result?.success ? (
              <div className="space-y-4">
                <div className="p-6 rounded-xl bg-success-green-500/10 border border-success-green-500/30 text-center">
                  <p className="text-tech-gray-400 text-sm mb-2">计算结果</p>
                  <p className="text-5xl font-bold text-white">
                    {result.value}
                    <span className="text-xl text-tech-gray-400 ml-2">{result.unit}</span>
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-tech-gray-900/40">
                  <p className="text-xs text-tech-gray-500 mb-2">使用公式</p>
                  <p className="text-deep-sea-400 font-mono text-lg">{result.formulaUsed}</p>
                </div>

                <div className="p-4 rounded-xl bg-tech-gray-900/40">
                  <p className="text-xs text-tech-gray-500 mb-2">参数明细</p>
                  <div className="space-y-1">
                    {Object.entries(params).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-tech-gray-400">{key}</span>
                        <span className="text-white font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-5 rounded-xl bg-warning-orange-500/10 border border-warning-orange-500/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-medium mb-1">计算失败</p>
                      <p className="text-sm text-tech-gray-400">请检查输入参数后重试</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-tech-gray-400 mb-2">失败原因：</p>
                  <ul className="space-y-2">
                    {result?.errors?.map((error, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                      >
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <span className="text-red-300 text-sm">{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-tech-gray-900/40">
                  <p className="text-xs text-tech-gray-500 mb-2">常见失败原因</p>
                  <ul className="space-y-1">
                    {currentFormula?.failureReasons.map((reason, i) => (
                      <li key={i} className="text-sm text-tech-gray-400 flex items-start gap-2">
                        <span className="text-warning-orange-500">·</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
