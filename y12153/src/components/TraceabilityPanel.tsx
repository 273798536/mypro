import { useState } from 'react';
import { BookOpen, FileText, Calculator, ChevronDown, ChevronRight, Link2 } from 'lucide-react';
import type { TraceInfo } from '@shared/types';

interface TraceabilityPanelProps {
  traceability: TraceInfo[];
}

export default function TraceabilityPanel({ traceability }: TraceabilityPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (traceability.length === 0) {
    return null;
  }

  const fieldLabels: Record<string, string> = {
    rollFrequency: '横摇频率',
    rollAmplitude: '横摇幅值',
    rmsAcceleration: 'RMS加速度',
    comfortScore: '舒适度评分',
  };

  return (
    <div className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between hover:bg-white/50 p-2 -m-2 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#0A2463]" />
          <h3 className="font-semibold text-slate-800">数据溯源</h3>
          <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
            {traceability.length} 条记录
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-slate-500">
            每一项计算结果都可追溯到原始数据源和计算公式，确保结论透明可验证
          </p>

          <div className="space-y-3">
            {traceability.map((trace, idx) => (
              <div
                key={idx}
                className="p-4 bg-white rounded-lg border border-slate-100 hover:border-[#0A2463]/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 flex-shrink-0">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800">
                          {fieldLabels[trace.field] || trace.field}
                        </span>
                        <span className="text-lg font-bold text-[#0A2463]">
                          {trace.value.toFixed(4)}
                          <span className="text-sm font-normal text-slate-500 ml-1">
                            {trace.unit}
                          </span>
                        </span>
                      </div>

                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-500">计算公式：</span>
                          <code className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-xs">
                            {trace.formula}
                          </code>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <Link2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-500">数据来源：</span>
                          <span className="text-slate-700">{trace.source}</span>
                        </div>

                        {trace.standard && (
                          <div className="flex items-center gap-2 text-xs">
                            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-500">引用标准：</span>
                            <span className="text-slate-700">{trace.standard}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-700">
              <strong>溯源说明：</strong>所有计算均基于公开的船舶工程公式和国际标准。
              每条记录包含输入参数的来源文件和时间戳，便于审计和复核。
              如需修改参数来源，请在输入页面调整"数据来源"字段。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
