import { useState } from 'react';
import type { ErrorComponent, AttributionResult } from '../types';
import { ChevronDown, ChevronUp, Calculator, ArrowRight } from 'lucide-react';

interface ErrorBreakdownProps {
  result: AttributionResult;
  label?: string;
  highlight?: boolean;
}

export function ErrorBreakdown({ result, label, highlight }: ErrorBreakdownProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const getBarColor = (percentage: number) => {
    const absPct = Math.abs(percentage);
    if (absPct > 60) return 'bg-rose-500';
    if (absPct > 30) return 'bg-amber-500';
    return 'bg-cyan-500';
  };

  return (
    <div className={`rounded-xl overflow-hidden border transition-all duration-300 ${
      highlight ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-slate-700/50 bg-slate-800/50'
    }`}>
      {label && (
        <div className={`px-4 py-2 text-sm font-semibold border-b ${
          highlight ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-slate-800/50 border-slate-700/50 text-slate-300'
        }`}>
          {label}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-xs text-slate-400 mb-1">总误差</div>
            <div className={`text-3xl font-mono font-bold ${
              result.isWithinTolerance ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {result.totalError >= 0 ? '+' : ''}{result.totalError.toFixed(3)}
              <span className="text-sm font-normal text-slate-500 ml-1">mΩ</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 mb-1">误差率</div>
            <div className={`text-xl font-mono font-semibold ${
              result.isWithinTolerance ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {result.totalErrorPercentage >= 0 ? '+' : ''}{result.totalErrorPercentage.toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            result.isWithinTolerance
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}>
            {result.isWithinTolerance ? '✓ 在容许范围内' : '✗ 超出容许范围'}
          </span>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-2">
            <Calculator className="w-3.5 h-3.5" />
            误差分解
          </div>

          {result.components.map((comp) => (
            <ErrorItem
              key={comp.id}
              component={comp}
              isExpanded={expandedId === comp.id}
              onToggle={() => toggleExpand(comp.id)}
              barColor={getBarColor(comp.percentage)}
            />
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-slate-900/50 border border-slate-700/30">
          <p className="text-sm text-slate-300 leading-relaxed">
            {result.conclusion}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ErrorItemProps {
  component: ErrorComponent;
  isExpanded: boolean;
  onToggle: () => void;
  barColor: string;
}

function ErrorItem({ component, isExpanded, onToggle, barColor }: ErrorItemProps) {
  return (
    <div className="rounded-lg border border-slate-700/50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center gap-3 hover:bg-slate-700/20 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-slate-200">{component.name}</span>
            <span className="text-sm font-mono text-slate-300">
              {component.value >= 0 ? '+' : ''}{component.value.toFixed(3)} mΩ
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.min(Math.abs(component.percentage), 100)}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 font-mono w-12 text-right">
              {component.percentage.toFixed(1)}%
            </span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 animate-fade-in">
          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-700/30">
            <div className="text-xs text-slate-500 mb-1">计算公式</div>
            <div className="font-mono text-sm text-cyan-300">{component.formula}</div>
          </div>

          {component.unitConversion && (
            <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-700/30">
              <div className="text-xs text-slate-500 mb-1">单位换算</div>
              <div className="text-xs text-amber-300">{component.unitConversion}</div>
            </div>
          )}

          <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-700/30">
            <div className="text-xs text-slate-500 mb-1">计算过程</div>
            <div className="font-mono text-sm text-emerald-300 flex items-center gap-2">
              <span className="text-slate-500">代入</span>
              <span>{component.calculation}</span>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-start gap-2">
            <ArrowRight className="w-3 h-3 mt-0.5 text-slate-500 flex-shrink-0" />
            <span>{component.description}</span>
          </div>
        </div>
      )}
    </div>
  );
}
