import { useState, useMemo } from 'react';
import {
  Calculator,
  FlaskConical,
  Microscope,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
  Beaker
} from 'lucide-react';
import { calculatorConfigs } from '@/data/mockData';
import { runCalculation, getResultUnit } from '@/utils/calculations';
import type { CalculatorConfig } from '@/types';
import { cn } from '@/lib/utils';

export default function CalculatorPage() {
  const [activeCalculator, setActiveCalculator] = useState<string>('dilution');
  const [inputs, setInputs] = useState<Record<string, number>>({});

  const config = useMemo(
    () => calculatorConfigs.find((c) => c.id === activeCalculator) || calculatorConfigs[0],
    [activeCalculator]
  );

  const result = useMemo(() => {
    const inputValues: Record<string, number> = {};
    config.inputFields.forEach((field) => {
      inputValues[field.key] = inputs[field.key] ?? (field.defaultValue as number) ?? 0;
    });
    return runCalculation(activeCalculator, inputValues);
  }, [activeCalculator, inputs, config]);

  const handleInputChange = (key: string, value: string) => {
    const num = parseFloat(value);
    setInputs((prev) => ({
      ...prev,
      [key]: isNaN(num) ? 0 : num
    }));
  };

  const calculatorIcons: Record<string, typeof Calculator> = {
    dilution: Beaker,
    'cell-count': Microscope,
    'cell-viability': Activity
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-200">
          <Calculator size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">计算工具</h2>
        <p className="text-slate-500 mt-1">浓度稀释 · 细胞计数 · 存活率计算</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {calculatorConfigs.map((cfg) => {
          const Icon = calculatorIcons[cfg.id] || Calculator;
          const isActive = activeCalculator === cfg.id;

          return (
            <button
              key={cfg.id}
              onClick={() => {
                setActiveCalculator(cfg.id);
                setInputs({});
              }}
              className={cn(
                'p-5 rounded-xl border-2 text-left transition-all',
                isActive
                  ? 'border-cyan-500 bg-cyan-50 shadow-lg shadow-cyan-100'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
              )}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center mb-3',
                  isActive ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-600'
                )}
              >
                <Icon size={24} />
              </div>
              <h3
                className={cn(
                  'font-semibold text-lg',
                  isActive ? 'text-cyan-700' : 'text-slate-800'
                )}
              >
                {cfg.name}
              </h3>
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                {cfg.applicableScope}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h3 className="font-semibold text-slate-800">参数输入</h3>
            <p className="text-sm text-slate-500">输入计算所需的各项参数</p>
          </div>
          <div className="p-6 space-y-5">
            {config.inputFields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {field.label}
                  <span className="text-slate-400 ml-1">({field.unit})</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={inputs[field.key] ?? (field.defaultValue as number) ?? ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400 text-lg font-medium"
                    placeholder={`请输入${field.label}`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    {field.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div
            className={cn(
              'rounded-2xl border shadow-sm overflow-hidden',
              result.success
                ? 'bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200'
                : 'bg-gradient-to-br from-rose-50 to-amber-50 border-rose-200'
            )}
          >
            <div className="px-6 py-4 border-b border-white/50">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 size={20} className="text-emerald-600" />
                ) : (
                  <AlertTriangle size={20} className="text-rose-600" />
                )}
                <h3 className="font-semibold text-slate-800">计算结果</h3>
              </div>
            </div>
            <div className="p-6">
              {result.success ? (
                <>
                  <div className="text-5xl font-bold text-emerald-600 mb-2">
                    {result.value?.toLocaleString(undefined, {
                      maximumFractionDigits: 2
                    })}
                    <span className="text-xl font-normal ml-2 text-emerald-500">
                      {getResultUnit(activeCalculator)}
                    </span>
                  </div>
                  {result.breakdown && (
                    <div className="mt-4 p-4 bg-white/60 rounded-lg text-sm text-slate-600 whitespace-pre-line">
                      {result.breakdown}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-rose-700">计算失败</p>
                    <p className="text-sm text-rose-600 mt-1">{result.error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Info size={18} className="text-cyan-500" />
                公式说明
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">计算公式</p>
                <div className="bg-slate-50 rounded-lg p-3 font-mono text-slate-700 text-center">
                  {config.formula}
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">单位</p>
                <p className="text-slate-700">{config.unit}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">适用范围</p>
                <p className="text-slate-700 text-sm leading-relaxed">
                  {config.applicableScope}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-2">失败原因</p>
                <ul className="space-y-1">
                  {config.failureReasons.map((reason, index) => (
                    <li
                      key={index}
                      className="text-sm text-slate-600 flex items-start gap-2"
                    >
                      <span className="text-amber-500 mt-0.5">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
