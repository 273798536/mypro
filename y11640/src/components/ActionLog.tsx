import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { FileText, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export function ActionLogPanel() {
  const actionLogs = useGameStore(state => state.actionLogs);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [actionLogs]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'success':
        return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-red-400" />;
      default:
        return null;
    }
  };

  const getResultBg = (result: string) => {
    switch (result) {
      case 'success':
        return 'bg-green-900/20 border-l-green-500';
      case 'warning':
        return 'bg-yellow-900/20 border-l-yellow-500';
      case 'error':
        return 'bg-red-900/20 border-l-red-500';
      default:
        return 'bg-gray-800 border-l-gray-500';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 text-gray-300 text-sm mb-3">
        <FileText className="w-4 h-4" />
        <span>操作记录</span>
        <span className="text-xs text-gray-500 ml-auto">共 {actionLogs.length} 条</span>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-2 pr-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 #1f2937' }}
      >
        {actionLogs.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-4">
            暂无操作记录
          </div>
        ) : (
          actionLogs.map((log, index) => (
            <div
              key={index}
              className={`p-2 rounded border-l-2 ${getResultBg(log.result)}`}
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 font-mono">[行号:{log.lineNumber}]</span>
                <span className="text-gray-400">[来源:{log.source}]</span>
                <span className="text-gray-500">{formatTime(log.time)}</span>
                {getResultIcon(log.result)}
              </div>
              <div className="text-sm text-gray-200 mt-1">
                {log.action}
              </div>
              {log.details && (
                <div className="text-xs text-gray-400 mt-1">
                  {log.details}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
