import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import type { FittingParameter } from '@/store/fittingStore';
import { cn } from '@/lib/utils';

interface ParameterCardsProps {
  parameters?: FittingParameter[];
  rSquared?: number;
  rmse?: number;
  iterations?: number;
}

function formatValue(value: number, name: string): string {
  const unit = name === 'R0' || name === 'R1' ? 'Ω' : name === 'C1' ? 'F' : name === 'ocv' ? 'V' : '';
  if (Math.abs(value) >= 1e-3 && Math.abs(value) < 1e3) {
    return `${value.toFixed(6)}${unit}`;
  }
  return `${value.toExponential(4)}${unit}`;
}

function getParamLabel(name: string): string {
  const labels: Record<string, string> = {
    ocv: '开路电压',
    R0: '欧姆内阻',
    R1: '极化电阻',
    C1: '极化电容',
    tau1: '时间常数',
  };
  return labels[name] || name;
}

export default function ParameterCards({ parameters, rSquared, rmse, iterations }: ParameterCardsProps) {
  if (!parameters || parameters.length === 0) {
    return (
      <div className="bg-[#16162a] border border-[#2a2a4e] rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">拟合参数</h3>
        <div className="text-center py-6 text-gray-500 text-sm">
          暂无拟合结果
        </div>
      </div>
    );
  }

  const qualityMetrics = [
    { label: 'R²', value: rSquared, format: (v: number) => v.toFixed(6), color: 'text-[#00d4ff]' },
    { label: 'RMSE', value: rmse, format: (v: number) => `${v.toExponential(4)}V`, color: 'text-[#ff8c00]' },
    { label: '迭代次数', value: iterations, format: (v: number) => String(v), color: 'text-emerald-400' },
  ].filter(m => m.value !== undefined);

  return (
    <div className="bg-[#16162a] border border-[#2a2a4e] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-300">拟合参数</h3>
        {qualityMetrics.length > 0 && (
          <div className="flex gap-3">
            {qualityMetrics.map(m => (
              <div key={m.label} className="text-right">
                <div className="text-xs text-gray-500">{m.label}</div>
                <div className={cn('text-sm font-mono font-semibold', m.color)}>
                  {m.format(m.value!)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {parameters.map(param => (
          <div
            key={param.id}
            className={cn(
              'p-3 rounded-lg border transition-all',
              param.isWithinBound
                ? 'bg-[#0f0f1e] border-[#2a2a4e]'
                : 'bg-red-900/10 border-red-800/50'
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">{getParamLabel(param.name)}</span>
              {param.isWithinBound ? (
                <CheckCircle size={12} className="text-emerald-400" />
              ) : (
                <AlertTriangle size={12} className="text-red-400" />
              )}
            </div>
            <div className="text-lg font-mono font-semibold text-gray-200 mb-1">
              {formatValue(param.value, param.name)}
            </div>
            <div className="text-xs text-gray-500">
              ± {formatValue(param.stdError, param.name)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              [{formatValue(param.lowerBound, param.name)}, {formatValue(param.upperBound, param.name)}]
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
