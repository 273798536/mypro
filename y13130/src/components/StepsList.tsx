import { CalculationStep } from '@/types';

export default function StepsList({ steps }: { steps: CalculationStep[] }) {
  if (!steps || steps.length === 0) {
    return (
      <div className="text-xs text-ink-600 p-4 bg-paper-50 rounded border border-paper-200">
        暂无计算步骤，请点击「重跑」查看每步数字来源。
      </div>
    );
  }
  return (
    <ol className="space-y-2">
      {steps.map((s) => (
        <li key={s.step} className="card p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-ink-800">
              Step {s.step} · {s.description}
            </span>
            <span className="font-mono text-sm font-bold text-ink-900">
              → {typeof s.result === 'number' ? s.result.toFixed(4).replace(/\.?0+$/, '') : s.result}
            </span>
          </div>
          <div className="font-mono text-[11px] text-ink-700 bg-paper-50 rounded px-2 py-1 border border-paper-200">
            {s.formula}
          </div>
          {Object.keys(s.values).length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {Object.entries(s.values).map(([k, v]) => (
                <span key={k} className="text-[10px] bg-white border border-paper-200 rounded px-1.5 py-0.5 font-mono">
                  {k} = {v}
                </span>
              ))}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
