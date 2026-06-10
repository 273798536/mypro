import { FileText, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { CalculationExplanation } from '../../shared/types';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface Props {
  explanation: CalculationExplanation;
  calculatedConcentration: number;
  deviation: number;
  status: 'pending' | 'passed' | 'rejected' | 'error';
}

export function ResultExplanationCard({ explanation, calculatedConcentration, deviation, status }: Props) {
  const [expanded, setExpanded] = useState(false);
  const deviationColor =
    Math.abs(deviation) <= 10 ? 'text-status-passed' :
    Math.abs(deviation) <= 20 ? 'text-status-attention' : 'text-status-anomaly';

  return (
    <div className="bg-white border border-slate-200 rounded shadow-card overflow-hidden animate-slide-up stagger-1">
      <div className={cn(
        'px-6 py-5 border-b',
        status === 'passed' ? 'bg-status-passed/5' :
        status === 'rejected' ? 'bg-status-rejected/5' :
        status === 'error' ? 'bg-status-error/5' :
        'bg-navy-50/50'
      )}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={cn(
              'w-14 h-14 rounded flex items-center justify-center shrink-0',
              status === 'passed' ? 'bg-status-passed/10' :
              status === 'rejected' ? 'bg-status-rejected/10' :
              status === 'error' ? 'bg-status-error/10' :
              'bg-navy-600/10'
            )}>
              <Sparkles className={cn(
                'w-7 h-7',
                status === 'passed' ? 'text-status-passed' :
                status === 'rejected' ? 'text-status-rejected' :
                status === 'error' ? 'text-status-error' :
                'text-navy-600'
              )} strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="font-serif text-sm font-medium text-slate-500 mb-1">试算浓度结果</div>
              <div className="flex items-baseline gap-3 mb-2">
                <span className={cn(
                  'font-mono font-bold leading-none tracking-tight',
                  'text-4xl md:text-5xl',
                  deviationColor
                )}>
                  {calculatedConcentration.toFixed(1)}
                </span>
                <span className="text-slate-500 font-medium">mg/L</span>
                <span className={cn(
                  'font-mono text-sm font-semibold px-2 py-0.5 rounded',
                  Math.abs(deviation) <= 10 ? 'bg-status-passed/10 text-status-passed' :
                  Math.abs(deviation) <= 20 ? 'bg-status-attention/10 text-status-attention' :
                  'bg-status-anomaly/10 text-status-anomaly'
                )}>
                  {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="shrink-0 mt-0.5">
            <FileText className="w-4 h-4 text-accent-500" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-accent-600 uppercase tracking-wider mb-1.5">结果解释</div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {explanation.summary}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {explanation.factors.map((f, idx) => (
            <div key={idx} className={cn(
              'rounded border p-3',
              f.impact === 'high' ? 'border-accent-500/30 bg-accent-500/5' :
              f.impact === 'medium' ? 'border-status-attention/30 bg-status-attention/5' :
              'border-slate-200 bg-slate-50'
            )}>
              <div className="text-[11px] text-slate-500 mb-1 truncate">{f.name}</div>
              <div className="font-mono font-semibold text-slate-800 text-sm">{f.value}</div>
            </div>
          ))}
        </div>

        {explanation.detail && (
          <div className="border-t border-slate-100 pt-4">
            <button
              onClick={() => setExpanded((e) => !e)}
              className="w-full flex items-center justify-between text-sm text-slate-600 hover:text-navy-700"
            >
              <span className="font-medium">详细推理过程</span>
              {expanded ? (
                <ChevronUp className="w-4 h-4" strokeWidth={2} />
              ) : (
                <ChevronDown className="w-4 h-4" strokeWidth={2} />
              )}
            </button>
            {expanded && (
              <div className="mt-3 p-4 bg-slate-50 rounded border border-slate-200 animate-slide-up">
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {explanation.detail}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
