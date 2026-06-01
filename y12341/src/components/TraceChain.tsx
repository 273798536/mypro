import { ArrowRight, Database, BrainCircuit, FileCheck } from 'lucide-react';

interface TraceChainProps {
  trace: string;
  className?: string;
}

export default function TraceChain({ trace, className = '' }: TraceChainProps) {
  const parts = trace.split(' | ').map((part) => {
    if (part.startsWith('[来源]')) {
      return { type: 'source', text: part.replace('[来源] ', '').trim() };
    }
    if (part.startsWith('[判断]')) {
      return { type: 'judgment', text: part.replace('[判断] ', '').trim() };
    }
    if (part.startsWith('[结果]')) {
      return { type: 'result', text: part.replace('[结果] ', '').trim() };
    }
    return { type: 'unknown', text: part };
  });

  const icons = {
    source: <Database className="w-4 h-4 text-blue-600" />,
    judgment: <BrainCircuit className="w-4 h-4 text-amber-600" />,
    result: <FileCheck className="w-4 h-4 text-emerald-600" />,
    unknown: <ArrowRight className="w-4 h-4 text-slate-400" />,
  };

  const labels = {
    source: '来源',
    judgment: '判断',
    result: '结果',
    unknown: '',
  };

  const bgColors = {
    source: 'bg-blue-50 border-blue-200',
    judgment: 'bg-amber-50 border-amber-200',
    result: 'bg-emerald-50 border-emerald-200',
    unknown: 'bg-slate-50 border-slate-200',
  };

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {parts.map((part, idx) => (
        <div key={idx} className="flex items-center gap-1">
          {idx > 0 && <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />}
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs ${bgColors[part.type]}`}
          >
            {icons[part.type]}
            <span className="font-medium text-slate-700">{labels[part.type]}:</span>
            <span className="text-slate-600 font-mono" title={part.text}>
              {part.text.length > 40 ? part.text.slice(0, 40) + '...' : part.text}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
