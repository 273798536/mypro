import { AlertTriangle, ArrowRight, Check, XCircle } from 'lucide-react';
import type { EdgeCase } from '@/types';

interface EdgeCaseCardProps {
  edgeCase: EdgeCase;
}

const conclusionColor = (c: string) =>
  c === '阳性'
    ? 'text-rose-700 bg-rose-50 border-rose-200'
    : c === '阴性'
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : 'text-amber-700 bg-amber-50 border-amber-200';

export default function EdgeCaseCard({ edgeCase }: EdgeCaseCardProps) {
  const isReversed =
    (edgeCase.beforeConclusion === '阳性' && edgeCase.afterConclusion !== '阳性') ||
    (edgeCase.beforeConclusion === '阴性' && edgeCase.afterConclusion === '阳性');

  return (
    <div className="card p-5 card-hover animate-fade-in-up">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              edgeCase.category === '条码重复'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-rose-100 text-rose-700'
            }`}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-serif text-base font-semibold text-warm-900">
                {edgeCase.title}
              </h4>
              <span className="badge badge-warning text-xs">{edgeCase.category}</span>
            </div>
            <p className="text-sm text-warm-600 leading-relaxed">{edgeCase.description}</p>
          </div>
        </div>
        {edgeCase.doesChangeResult && (
          <span className="badge badge-danger gap-1 text-xs flex-shrink-0">
            <XCircle size={12} />
            真实改变结果
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start mb-4">
        <div className="bg-warm-50 rounded-lg p-3 border border-warm-200/60">
          <p className="text-xs text-warm-500 mb-2 font-medium">修改前条件</p>
          <div className="space-y-1">
            {Object.entries(edgeCase.beforeCondition).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-warm-600">{k}</span>
                <span className="font-mono text-warm-800">{String(v)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-warm-200">
            <p className="text-xs text-warm-500 mb-1">计算结果</p>
            <p className="text-sm font-medium text-warm-800">{edgeCase.beforeResult}</p>
            <span className={`badge ${conclusionColor(edgeCase.beforeConclusion)} gap-1 mt-2`}>
              结论：{edgeCase.beforeConclusion}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center pt-8">
          <ArrowRight
            size={24}
            className={isReversed ? 'text-rose-500' : 'text-amber-500'}
          />
          <span className="text-xs text-warm-400 mt-1">变更</span>
        </div>

        <div className="bg-warm-50 rounded-lg p-3 border border-warm-200/60 ring-1 ring-inset ring-amber-600/20">
          <p className="text-xs text-amber-700 mb-2 font-medium">修改后条件</p>
          <div className="space-y-1">
            {Object.entries(edgeCase.afterCondition).map(([k, v]) => {
              const changed = edgeCase.beforeCondition[k] !== v;
              return (
                <div
                  key={k}
                  className={`flex justify-between text-xs ${
                    changed ? 'bg-amber-50/60 -mx-1 px-1 rounded' : ''
                  }`}
                >
                  <span className="text-warm-600">{k}</span>
                  <span
                    className={`font-mono ${
                      changed ? 'text-amber-700 font-semibold' : 'text-warm-800'
                    }`}
                  >
                    {changed && '⚠ '}
                    {String(v)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-warm-200">
            <p className="text-xs text-amber-700 mb-1">计算结果</p>
            <p className="text-sm font-medium text-warm-800">{edgeCase.afterResult}</p>
            <span className={`badge ${conclusionColor(edgeCase.afterConclusion)} gap-1 mt-2`}>
              结论：{edgeCase.afterConclusion}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-rose-50/60 border border-rose-200/60 rounded-lg p-3">
        <p className="text-xs font-medium text-rose-700 flex items-center gap-1">
          <Check size={12} className="text-rose-600" />
          影响说明（此案例确实改变判定结果）
        </p>
        <p className="text-sm text-rose-800 mt-1 leading-relaxed">
          {edgeCase.impactExplanation}
        </p>
      </div>
    </div>
  );
}
