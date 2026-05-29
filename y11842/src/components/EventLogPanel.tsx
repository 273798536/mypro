import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Wifi, AlertTriangle, XCircle, CheckCircle, Target } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import type { EventLog } from '@/types';

const LogEntry = ({ log }: { log: EventLog }) => {
  const getIcon = () => {
    switch (log.type) {
      case 'network':
        return <Wifi className="w-3.5 h-3.5" />;
      case 'penalty':
        return <XCircle className="w-3.5 h-3.5" />;
      case 'decision':
        return <Target className="w-3.5 h-3.5" />;
      case 'system':
        return log.severity === 'error' 
          ? <AlertTriangle className="w-3.5 h-3.5" />
          : <CheckCircle className="w-3.5 h-3.5" />;
      default:
        return <Terminal className="w-3.5 h-3.5" />;
    }
  };

  const getColor = () => {
    switch (log.severity) {
      case 'error':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'warning':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'info':
      default:
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    }
  };

  const getTypeLabel = () => {
    switch (log.type) {
      case 'network':
        return '网络';
      case 'penalty':
        return '惩罚';
      case 'decision':
        return '决策';
      case 'system':
        return '系统';
      default:
        return '日志';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-start gap-3 p-3 rounded-lg border ${getColor()} font-mono text-xs`}
    >
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
            R{log.round}
          </span>
          <span className="text-[10px] uppercase tracking-wide opacity-70">
            {getTypeLabel()}
          </span>
        </div>
        <p className="break-all">{log.message}</p>
      </div>
      <span className="text-[10px] text-slate-500 whitespace-nowrap">
        {log.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </motion.div>
  );
};

export const EventLogPanel = () => {
  const { eventLogs } = useGameStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [eventLogs]);

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 font-['Orbitron']">
          <Terminal className="w-5 h-5 text-cyan-400" />
          事件日志
        </h2>
        <span className="text-xs text-slate-500 font-mono">
          {eventLogs.length} 条记录
        </span>
      </div>

      <div
        ref={scrollRef}
        className="space-y-2 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
      >
        <AnimatePresence initial={false}>
          {eventLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Terminal className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">游戏开始后将显示事件日志</p>
            </div>
          ) : (
            eventLogs.slice(-50).map((log) => (
              <LogEntry key={log.id} log={log} />
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
