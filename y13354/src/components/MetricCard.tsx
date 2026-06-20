import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, Sigma, Divide } from 'lucide-react';
import type { MetricResult } from '@/types';
import { formatMetricValue } from '@/utils/metrics';
import { cn } from '@/lib/utils';
import ThresholdSlider from './ThresholdSlider';

interface Props {
  metric: MetricResult;
  showFormula?: boolean;
}

export default function MetricCard({ metric, showFormula = true }: Props) {
  const [expanded, setExpanded] = useState(false);

  const distanceFromThreshold = metric.passCondition.includes('>')
    ? metric.value - metric.threshold
    : metric.threshold - metric.value;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border p-5 transition-all duration-300',
        metric.isPassed
          ? 'border-emerald-500/30 bg-slate-800/60 hover:border-emerald-500/60 hover:bg-slate-800'
          : 'border-rose-500/30 bg-slate-800/60 hover:border-rose-500/60 hover:bg-slate-800'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{metric.name}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={cn(
                'text-3xl font-bold font-mono',
                metric.isPassed ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {formatMetricValue(metric.value, metric.unit)}
            </span>
            {metric.unit && <span className="text-sm text-slate-500">{metric.unit}</span>}
          </div>
        </div>
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            metric.isPassed ? 'bg-emerald-500/20' : 'bg-rose-500/20'
          )}
        >
          {metric.isPassed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <XCircle className="h-5 w-5 text-rose-400" />
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px]">
        <span className="text-slate-500">阈值：</span>
        <span className="font-mono text-slate-300">
          {metric.passCondition} {formatMetricValue(metric.threshold, metric.unit)}
        </span>
        <span
          className={cn(
            'ml-auto rounded px-1.5 py-0.5 font-mono',
            distanceFromThreshold >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
          )}
        >
          {distanceFromThreshold >= 0 ? '+' : ''}
          {formatMetricValue(Math.abs(distanceFromThreshold), metric.unit)}
        </span>
      </div>

      {showFormula && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 flex w-full items-center justify-between rounded-md bg-slate-900/50 px-3 py-2 text-left text-[11px] text-slate-400 transition hover:bg-slate-900"
        >
          <span className="font-mono">{metric.formula}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      )}

      {expanded && (
        <div className="mt-3 space-y-3 rounded-lg bg-slate-900/80 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-1.5 text-[11px] text-slate-400">
            {metric.formulaDetail.split('\n').map((line, i) => (
              <p key={i} className="whitespace-pre-wrap font-mono leading-relaxed">
                {line}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-slate-700/60 pt-3">
            <div className="flex items-center gap-2">
              <Sigma className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[10px] text-slate-500">分子</span>
              <span className="ml-auto font-mono text-[12px] text-white">{metric.numerator}</span>
            </div>
            <div className="flex items-center gap-2">
              <Divide className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-[10px] text-slate-500">分母</span>
              <span className="ml-auto font-mono text-[12px] text-white">{metric.denominator}</span>
            </div>
          </div>
          <ThresholdSlider metricKey={metric.key} metric={metric} />
        </div>
      )}
    </div>
  );
}
