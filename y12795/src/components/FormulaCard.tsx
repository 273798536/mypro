import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';

interface FormulaCardProps {
  title: string;
  formula: string;
  unit: string;
  scope: string;
  symbols?: Array<{ symbol: string; meaning: string; value?: string }>;
  failureReasons?: Array<{ code: string; title: string; explanation: string }>;
  steps?: Record<string, number>;
}

export function FormulaCard({
  title, formula, unit, scope, symbols = [], failureReasons = [], steps,
}: FormulaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showFailures, setShowFailures] = useState(false);

  return (
    <div className="lab-card overflow-hidden" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="formula-box">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-serif text-lg font-semibold text-lab-navy mb-1">{title}</h3>
            <p className="text-xs text-gray-500">单位: <span className="font-mono">{unit}</span></p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-white/50 rounded transition-colors"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        <div className="text-center py-4 px-2 bg-white/60 rounded border border-lab-line">
          <span className="font-mono text-xl text-lab-navy tracking-wide">{formula}</span>
        </div>

        <div className="mt-3 flex items-start gap-2 text-xs text-gray-600">
          <Info size={14} className="mt-0.5 text-lab-navy shrink-0" />
          <p><span className="font-medium">适用范围：</span>{scope}</p>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 border-t border-lab-line/50 pt-4">
            {symbols.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-lab-ink mb-2">符号说明</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {symbols.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="font-mono bg-white/80 px-2 py-0.5 rounded min-w-[60px] text-center text-lab-navy">{s.symbol}</span>
                      <span className="text-gray-600">{s.meaning}</span>
                      {s.value && <span className="font-mono text-xs text-gray-500">= {s.value}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {steps && Object.keys(steps).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-lab-ink mb-2">计算步骤</h4>
                <div className="space-y-1.5">
                  {Object.entries(steps).map(([desc, val], i) => (
                    <div key={i} className="flex items-start gap-3 text-sm bg-white/50 p-2 rounded">
                      <span className="w-5 h-5 rounded-full bg-lab-navy text-white text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-gray-700">{desc}</span>
                      <span className="font-mono text-lab-navy ml-auto">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {failureReasons.length > 0 && (
              <div>
                <button
                  onClick={() => setShowFailures(!showFailures)}
                  className="flex items-center gap-2 text-sm font-medium text-lab-red hover:text-lab-redLight transition-colors mb-2"
                >
                  <AlertTriangle size={16} />
                  常见失败原因与处理 ({failureReasons.length})
                  {showFailures ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showFailures && (
                  <div className="space-y-2 pl-4 border-l-2 border-lab-red/30">
                    {failureReasons.map((f) => (
                      <div key={f.code} className="text-sm bg-red-50/50 p-2 rounded">
                        <div className="flex items-center gap-2 font-medium text-lab-red">
                          <span className="font-mono text-xs">[{f.code}]</span>
                          {f.title}
                        </div>
                        <p className="text-gray-600 text-xs mt-1">{f.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
