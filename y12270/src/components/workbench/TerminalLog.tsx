import { useState, useRef, useEffect } from 'react';
import { Terminal, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const LOG_COLORS: Record<string, string> = {
  info: 'text-slate-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
  success: 'text-emerald-400'
};

export function TerminalLog() {
  const { terminalLog, clearTerminalLog } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logEndRef.current && isExpanded) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLog, isExpanded]);

  const latestSuccessLog = terminalLog
    .filter(e => e.level === 'success' && e.message.includes('久期结论'))
    .slice(-1)[0];

  return (
    <div className="border-t border-slate-700 bg-slate-950/95">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm">
          <Terminal size={14} className="text-slate-400" />
          <span className="text-slate-300">终端日志</span>
          {latestSuccessLog && !isExpanded && (
            <span className="text-xs text-emerald-400 font-mono ml-2 truncate max-w-md">
              {latestSuccessLog.message}
            </span>
          )}
          <span className="text-xs text-slate-500">({terminalLog.length}条)</span>
        </div>
        <div className="flex items-center gap-2">
          {terminalLog.length > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                clearTerminalLog();
              }}
              className="p-1 hover:bg-slate-700 rounded transition-colors cursor-pointer"
              title="清空日志"
            >
              <Trash2 size={12} className="text-slate-500 hover:text-slate-300" />
            </span>
          )}
          {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
        </div>
      </button>
      
      {isExpanded && (
        <div className="h-48 overflow-y-auto px-4 py-2 font-mono text-xs space-y-1">
          {terminalLog.length === 0 ? (
            <div className="text-slate-600 italic">暂无日志，运行分析后将显示计算过程</div>
          ) : (
            terminalLog.map((entry, index) => (
              <div key={index} className={`${LOG_COLORS[entry.level]} flex items-start gap-2`}>
                <span className="text-slate-600 flex-shrink-0">
                  [{new Date(entry.timestamp).toLocaleTimeString()}]
                </span>
                <span className="flex-1">{entry.message}</span>
                {entry.data && (
                  <button
                    className="text-slate-500 hover:text-slate-300 flex-shrink-0"
                    onClick={() => console.log('Log data:', entry.data)}
                    title="查看详细数据"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      )}
    </div>
  );
}
