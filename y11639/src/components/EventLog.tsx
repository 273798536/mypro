import { useEffect, useRef } from 'react';
import type { LogEntry } from '../types/game';
import { useGameStore } from '../store/gameStore';

const typeLabels = {
  dispatch: '派遣',
  recall: '撤回',
  weather: '天气',
  error: '错误',
  system: '系统',
  score: '得分'
};

const levelColors = {
  info: 'text-slate-300',
  warning: 'text-yellow-400',
  error: 'text-red-400',
  success: 'text-emerald-400'
};

const levelBgColors = {
  info: 'bg-slate-600/30',
  warning: 'bg-yellow-500/10',
  error: 'bg-red-500/10',
  success: 'bg-emerald-500/10'
};

const typeColors = {
  dispatch: 'bg-blue-500',
  recall: 'bg-yellow-500',
  weather: 'bg-cyan-500',
  error: 'bg-red-500',
  system: 'bg-slate-500',
  score: 'bg-emerald-500'
};

export function EventLog() {
  const publicState = useGameStore(s => s.publicState);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [publicState?.logs.length]);

  if (!publicState) return null;

  const logs = publicState.logs.slice(-50);

  return (
    <div className="h-full flex flex-col bg-slate-800/50 rounded-xl border border-slate-600">
      <div className="p-3 border-b border-slate-600 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">📜 操作日志</h3>
        <span className="text-xs text-slate-400">共 {publicState.logs.length} 条</span>
      </div>

      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin"
      >
        {logs.map((log, index) => (
          <LogItem key={index} log={log} />
        ))}
      </div>
    </div>
  );
}

function LogItem({ log }: { log: LogEntry }) {
  return (
    <div
      className={`p-2 rounded-lg text-xs ${levelBgColors[log.level]} border-l-2 ${
        log.level === 'error'
          ? 'border-red-500'
          : log.level === 'warning'
          ? 'border-yellow-500'
          : log.level === 'success'
          ? 'border-emerald-500'
          : 'border-slate-500'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-slate-500 font-mono">R{log.round}</span>
        <span
          className={`px-1.5 py-0.5 rounded text-white text-[10px] font-medium ${typeColors[log.type]}`}
        >
          {typeLabels[log.type]}
        </span>
        {log.line !== undefined && (
          <span className="text-slate-500 text-[10px]">L{log.line}</span>
        )}
      </div>
      <p className={levelColors[log.level]}>{log.message}</p>
      {log.source && (
        <p className="text-slate-500 text-[10px] mt-0.5 font-mono truncate">
          {log.source}
        </p>
      )}
    </div>
  );
}