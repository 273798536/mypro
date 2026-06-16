import { useState } from 'react';
import { ChevronDown, ChevronUp, Calculator, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormulaInfo } from '../types';

interface FormulaPanelProps {
  formula: FormulaInfo;
  result?: number;
  resultUnit?: string;
  calculation?: {
    values: Record<string, number>;
    breakdown?: Record<string, string | number>;
  };
  defaultOpen?: boolean;
  className?: string;
}

export function FormulaPanel({
  formula,
  result,
  resultUnit,
  calculation,
  defaultOpen = false,
  className,
}: FormulaPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden',
        className
      )}
    >
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
            <Calculator size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{formula.name}</h3>
            <p className="text-sm text-slate-500">{formula.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {result !== undefined && (
            <div className="text-right">
              <div className="text-xl font-bold text-slate-800">
                {result.toLocaleString()}
                <span className="ml-1 text-sm font-normal text-slate-500">{resultUnit}</span>
              </div>
            </div>
          )}
          {isOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-slate-100 p-4 space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg font-mono text-center">
            <span className="text-lg text-slate-700">{formula.formula}</span>
          </div>

          {calculation && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-600">代入数值</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(calculation.values).map(([key, value]) => (
                  <div key={key} className="flex justify-between p-2 bg-slate-50 rounded text-sm">
                    <span className="text-slate-600">{key}</span>
                    <span className="font-mono font-medium text-slate-800">{value}</span>
                  </div>
                ))}
              </div>
              {calculation.breakdown && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-slate-600 mb-2">计算过程</h4>
                  <div className="space-y-1">
                    {Object.entries(calculation.breakdown).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-slate-500">{key}</span>
                        <span className="font-mono text-slate-700">= {value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-slate-600 mb-2">变量说明</h4>
            <div className="space-y-2">
              {formula.variables.map((v, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <span className="font-mono font-medium text-sky-600 min-w-[60px]">{v.name}</span>
                  <span className="text-slate-600">{v.description}</span>
                  <span className="text-slate-400 ml-auto">单位：{v.unit || '无'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <Info size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="text-sm font-medium text-amber-800">适用范围</h5>
              <p className="text-sm text-amber-700 mt-0.5">{formula.scope}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
