import { useState, useEffect } from 'react';
import { Calculator, Check, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import type { CalculationResult, CalculationMethod } from '@/types';
import { formatNumber } from '@/utils/format';
import { SectionCard } from '@/components/common/UIComponents';
import { cn } from '@/lib/utils';

interface CalculationPanelProps {
  result?: CalculationResult;
  onRecalculate?: () => void;
  className?: string;
}

function AnimatedNumber({ value, suffix = '', duration = 800 }: { value: number; suffix?: string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(value * ease);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{formatNumber(display, 2)}{suffix}</>;
}

export function CalculationPanel({ result, onRecalculate, className }: CalculationPanelProps) {
  const [method, setMethod] = useState<CalculationMethod>('normalization');

  if (!result) {
    return (
      <SectionCard
        title="配平计算"
        icon={<Calculator className="w-5 h-5 text-lab-500" />}
        extra={onRecalculate && (
          <button onClick={onRecalculate} className="btn-secondary text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            执行计算
          </button>
        )}
      >
        <div className="py-8 text-center">
          <Calculator className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
          <p className="text-sm text-zinc-500">尚未执行配平计算</p>
          <p className="text-xs text-zinc-400 mt-1">点击右上角按钮根据谱图峰面积计算各组分百分含量</p>
        </div>
      </SectionCard>
    );
  }

  const totalOk = Math.abs(result.totalPercentage - 100) < 1;
  const totalWarn = !totalOk && Math.abs(result.totalPercentage - 100) < 3;

  return (
    <SectionCard className={className}
      title="配平计算"
      icon={<Calculator className="w-5 h-5 text-lab-500" />}
      extra={
        <div className="flex items-center gap-2">
          <select
            value={method}
            onChange={e => setMethod(e.target.value as CalculationMethod)}
            className="input text-xs py-1.5 w-auto"
          >
            <option value="normalization">归一化法</option>
            <option value="external_standard">外标法</option>
            <option value="internal_standard">内标法</option>
          </select>
          {onRecalculate && (
            <button onClick={onRecalculate} className="btn-secondary text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              重算
            </button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-lab-50 to-white rounded-xl p-5 border border-lab-100 h-full flex flex-col">
            <div className="text-xs uppercase tracking-wide text-lab-500 font-semibold mb-1">主含量结果</div>
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-4xl font-semibold text-lab-800 tabular-nums">
                <AnimatedNumber value={result.finalResult} />
              </span>
              <span className="text-lg text-lab-500 font-medium">{result.unit}</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs">
              {totalOk ? (
                <span className="badge-success"><Check className="w-3 h-3" /> 配平良好</span>
              ) : totalWarn ? (
                <span className="badge-warning"><AlertTriangle className="w-3 h-3" /> 配平略低</span>
              ) : (
                <span className="badge-danger"><AlertTriangle className="w-3 h-3" /> 配平异常</span>
              )}
              <span className="text-zinc-500 tabular-nums">
                总和 <AnimatedNumber value={result.totalPercentage} suffix="%" duration={600} />
              </span>
            </div>
            <div className="mt-4 pt-3 border-t border-lab-100/60 text-xs text-lab-600 leading-relaxed">
              {result.note}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-start gap-2 text-xs bg-info-50 text-info-600 px-3 py-2 rounded-md border border-info-100">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">计算公式：</span>
              <code className="font-mono bg-white/80 px-1.5 py-0.5 rounded">{result.formula}</code>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500 font-semibold mb-2">各组分百分含量</div>
            <div className="space-y-2">
              {result.components.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-24 shrink-0 text-sm text-lab-700 font-medium truncate">{c.name}</div>
                  <div className="flex-1 h-6 bg-lab-50 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-700 ease-out',
                        c.percentage > 50 ? 'bg-lab-600' : c.percentage > 5 ? 'bg-lab-400' : 'bg-lab-300',
                      )}
                      style={{ width: `${Math.min(c.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="w-20 shrink-0 text-right text-sm font-mono tabular-nums text-lab-800">
                    {formatNumber(c.percentage, 2)}%
                  </div>
                  <div className="w-28 shrink-0 text-right text-xs text-zinc-500 font-mono tabular-nums">
                    A = {c.area.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer text-zinc-500 hover:text-lab-600 py-1 select-none">
              查看中间计算过程 ({result.intermediateValues.length} 项)
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2 bg-lab-50/50 rounded-lg p-3">
              {result.intermediateValues.map((v, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-600">{v.label}</span>
                  <span className="font-mono text-lab-700 tabular-nums">{v.value.toLocaleString()}{v.unit || ''}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </SectionCard>
  );
}

export default CalculationPanel;
