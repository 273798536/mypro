import { useEffect, useRef } from 'react';
import { ScrollText, Plus, Minus, Clock } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { COMMAND_INFO } from '../types/game';
import { cn } from '../lib/utils';

export default function ActionLog() {
  const { actions } = useGameStore();
  const logRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [actions]);
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour12: false });
  };
  
  return (
    <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-5 border border-dark-700 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <ScrollText className="w-5 h-5 text-info-500" />
        <h3 className="text-lg font-semibold text-white">操作日志</h3>
        <span className="ml-auto text-xs text-dark-500">{actions.length} 条记录</span>
      </div>
      
      <div 
        ref={logRef}
        className="flex-1 overflow-y-auto space-y-2 pr-2 min-h-[200px] max-h-[300px]"
      >
        {actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-dark-500">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">暂无操作记录</p>
          </div>
        ) : (
          actions.slice(-20).map((action) => (
            <div 
              key={action.id}
              className={cn(
                "p-3 rounded-lg border transition-all",
                action.scoreChange >= 0 
                  ? 'bg-success-500/10 border-success-500/30' 
                  : 'bg-danger-500/10 border-danger-500/30'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {COMMAND_INFO[action.command]?.name || action.command}
                    </span>
                    <span className="text-xs text-dark-500">
                      第{action.roundNumber}回合
                    </span>
                  </div>
                  {action.reason && (
                    <p className="text-xs text-dark-400 mt-1">{action.reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {action.scoreChange >= 0 ? (
                    <Plus className="w-3 h-3 text-success-500" />
                  ) : (
                    <Minus className="w-3 h-3 text-danger-500" />
                  )}
                  <span className={cn(
                    "text-sm font-bold",
                    action.scoreChange >= 0 ? 'text-success-500' : 'text-danger-500'
                  )}>
                    {Math.abs(action.scoreChange)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-dark-500">
                <Clock className="w-3 h-3" />
                {formatTime(action.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
