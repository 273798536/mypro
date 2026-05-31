import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ScrollText, AlertTriangle, Zap, Info, Settings } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { logTypeColors, logTypeBgColors } from '../types/game';

export function EventLog() {
  const { log } = useGameStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'risk':
        return <AlertTriangle size={12} />;
      case 'action':
        return <Zap size={12} />;
      case 'event':
        return <Info size={12} />;
      case 'system':
        return <Settings size={12} />;
      default:
        return <Info size={12} />;
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="p-3 border-b border-slate-700/50 flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <ScrollText size={16} className="text-cyan-400" />
          事件日志
        </h3>
        <span className="text-xs text-slate-500">{log.length} 条记录</span>
      </div>

      <div
        ref={scrollRef}
        className="h-48 overflow-y-auto p-3 space-y-2"
      >
        {log.length === 0 ? (
          <div className="text-center py-8">
            <ScrollText size={24} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">暂无日志</p>
          </div>
        ) : (
          log.map(entry => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-start gap-2 p-2 rounded-lg ${logTypeBgColors[entry.type]} text-xs`}
            >
              <span className={`mt-0.5 ${logTypeColors[entry.type]}`}>
                {getIcon(entry.type)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-slate-500 font-mono">
                    R{entry.round}
                  </span>
                  <span className={`font-medium ${logTypeColors[entry.type]}`}>
                    {entry.type === 'risk' ? '风险' :
                     entry.type === 'action' ? '操作' :
                     entry.type === 'event' ? '事件' : '系统'}
                  </span>
                </div>
                <p className={`${logTypeColors[entry.type]} break-words`}>
                  {entry.message}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
