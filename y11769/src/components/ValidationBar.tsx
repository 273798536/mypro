import { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { useSandboxStore } from '@/store/useSandboxStore';

const levelConfig = {
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
};

export default function ValidationBar() {
  const validationResults = useSandboxStore(s => s.validationResults);
  const [expanded, setExpanded] = useState(false);

  const errorCount = validationResults.filter(r => r.level === 'error').length;
  const warningCount = validationResults.filter(r => r.level === 'warning').length;
  const infoCount = validationResults.filter(r => r.level === 'info').length;
  const hasIssues = validationResults.length > 0;

  return (
    <div className="w-full bg-[#0a0e1a]/90 border-t border-zinc-700/50">
      <button
        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {hasIssues ? (
          <>
            {errorCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-semibold">
                <AlertCircle size={10} /> {errorCount} 错误
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px] font-semibold">
                <AlertTriangle size={10} /> {warningCount} 警告
              </span>
            )}
            {infoCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-semibold">
                <Info size={10} /> {infoCount} 信息
              </span>
            )}
          </>
        ) : (
          <span className="flex items-center gap-1.5 text-green-400 text-xs">
            <CheckCircle size={14} /> 所有数据校验通过 ✓
          </span>
        )}
        <div className="flex-1" />
        {expanded ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronUp size={14} className="text-zinc-500" />}
      </button>

      {expanded && hasIssues && (
        <div className="px-3 pb-2 max-h-48 overflow-y-auto space-y-1" style={{ scrollbarWidth: 'thin' }}>
          {validationResults.map((result, i) => {
            const cfg = levelConfig[result.level];
            const Icon = cfg.icon;
            return (
              <div key={`${result.code}-${i}`} className={`flex items-start gap-2 rounded px-2 py-1.5 ${cfg.bg} border ${cfg.border}`}>
                <Icon size={14} className={`${cfg.color} mt-0.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono ${cfg.color}`}>{result.code}</span>
                    <span className="text-xs text-zinc-300">{result.message}</span>
                  </div>
                  {result.affectedIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.affectedIds.map(id => (
                        <span key={id} className="px-1.5 py-0.5 text-[9px] bg-zinc-700/50 text-zinc-400 rounded">
                          {id}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
