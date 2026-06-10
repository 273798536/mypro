import { useState } from 'react';
import { FORMULA_METAS } from '@/utils/calculator';
import { BookOpen, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

export default function FormulaPanel() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  return (
    <div className="card p-5 animate-fade-in-up stagger-3">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen size={20} className="text-teal-900" />
        <h3 className="font-serif text-lg font-semibold text-warm-900">计算公式说明</h3>
      </div>

      <div className="space-y-2.5">
        {FORMULA_METAS.map((meta, idx) => {
          const expanded = expandedIdx === idx;
          return (
            <div
              key={meta.name}
              className="border border-warm-200 rounded-lg overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setExpandedIdx(expanded ? null : idx)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-warm-50 hover:bg-warm-100 transition-colors text-left"
              >
                <span className="font-medium text-warm-800 text-sm">{meta.name}</span>
                {expanded ? (
                  <ChevronUp size={16} className="text-warm-500" />
                ) : (
                  <ChevronDown size={16} className="text-warm-500" />
                )}
              </button>
              {expanded && (
                <div className="px-4 py-3 space-y-3 border-t border-warm-200 bg-white animate-fade-in-up">
                  <div>
                    <p className="text-xs text-warm-500 mb-1">公式表达式</p>
                    <p className="font-mono text-sm bg-teal-900/5 text-teal-900 px-3 py-2 rounded-md">
                      {meta.expression}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-warm-500 mb-1.5">变量说明</p>
                    <div className="space-y-1">
                      {meta.variables.map((v) => (
                        <div key={v.symbol} className="flex gap-2 text-xs">
                          <span className="font-mono text-teal-800 min-w-[80px]">{v.symbol}</span>
                          <span className="text-warm-700">{v.meaning}</span>
                          <span className="text-warm-400 ml-auto">单位: {v.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-warm-500 mb-1">结果单位</p>
                      <p className="text-sm text-warm-800 font-medium">{meta.unit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-warm-500 mb-1">适用范围</p>
                      <p className="text-sm text-warm-800 leading-snug">{meta.applicableRange}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-warm-500 mb-1.5">常见失败原因</p>
                    <ul className="space-y-1">
                      {meta.failureReasons.map((reason, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-rose-700">
                          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
