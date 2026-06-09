import type { Draft } from '@/types';
import { CheckCircle2, XCircle, Minus, Beaker, ArrowRight } from 'lucide-react';

export function CounterExamplePanel({ draft }: { draft: Draft }) {
  const ces = draft.counterExamples;
  const passed = ces.filter((c) => c.passed === true).length;
  const failed = ces.filter((c) => c.passed === false).length;
  const total = ces.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-100 text-teal-700">
            <Beaker size={14} />
          </div>
          <div>
            <h3 className="font-serif text-sm font-bold text-slate-800">反例生成器</h3>
            <p className="text-[11px] text-slate-500">
              通过率 {total > 0 ? Math.round((passed / total) * 100) : 0}% · {passed}/{total}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            ✓ {passed}
          </span>
          <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
            ✗ {failed}
          </span>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {ces.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-slate-400">
            执行公式计算后自动生成反例
          </div>
        )}
        {ces.map((ce, idx) => (
          <div key={ce.id} className="flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50">
            <div className="mt-0.5 shrink-0">
              {ce.passed === true ? (
                <CheckCircle2 size={16} className="text-emerald-600" />
              ) : ce.passed === false ? (
                <XCircle size={16} className="text-rose-600" />
              ) : (
                <Minus size={16} className="text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-slate-400">
                  CE-{String(idx + 1).padStart(3, '0')}
                </span>
                <span className="text-xs font-semibold text-slate-800">{ce.boundaryCondition}</span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded bg-slate-50 px-2 py-1">
                  <span className="text-slate-500">期望：</span>
                  <span className="text-slate-700">{ce.expectedOutput}</span>
                </div>
                <div
                  className={`rounded px-2 py-1 ${
                    ce.passed === false ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <span className="opacity-70">实际：</span>
                  <span>{ce.actualOutput ?? '待计算'}</span>
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500">
                <span>样本数 {ce.inputData.length}</span>
                <ArrowRight size={9} className="mx-1 opacity-40" />
                <span className="truncate">
                  首点 ({ce.inputData[0]?.x}, {ce.inputData[0]?.y?.toFixed(3)})
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
