import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { AlertTriangle, Clock, Zap, TrendingUp, DollarSign, Layers } from 'lucide-react';
import { EVENT_TYPE_LABELS, SEVERITY_BG_COLORS } from '../utils/constants';

const eventIcons: Record<string, React.ReactNode> = {
  volatility_storm: <Zap size={14} />,
  delta_surge: <TrendingUp size={14} />,
  gamma_gate: <Clock size={14} />,
  margin_warning: <DollarSign size={14} />,
  compound: <AlertTriangle size={14} />,
  info_conflict: <Layers size={14} />,
};

export default function EventTimeline() {
  const { timeline, events } = useGameStore();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const unhandledEvents = events.filter((e) => !e.handled);

  return (
    <div className="panel-glass p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-orbitron text-sm text-neon-cyan flex items-center gap-2">
          <Clock size={16} />
          事件时间线
        </h3>
        {unhandledEvents.length > 0 && (
          <span className="text-xs text-neon-red bg-neon-red/20 px-2 py-0.5 rounded-full animate-pulse">
            {unhandledEvents.length} 个待处理
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-2">
        <AnimatePresence initial={false}>
          {timeline.slice(-30).map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className={`relative pl-4 py-1.5 border-l-2 ${
                item.color.includes('red') ? 'border-neon-red/50' :
                item.color.includes('yellow') ? 'border-neon-yellow/50' :
                item.color.includes('green') ? 'border-neon-green/50' :
                'border-neon-cyan/50'
              }`}
            >
              <div
                className={`absolute left-0 top-2 w-2 h-2 rounded-full -translate-x-[5px] ${
                  item.color.includes('red') ? 'bg-neon-red' :
                  item.color.includes('yellow') ? 'bg-neon-yellow' :
                  item.color.includes('green') ? 'bg-neon-green' :
                  'bg-neon-cyan'
                } ${item.delayed ? 'animate-pulse' : ''}`}
              />

              <div className="flex items-start gap-2">
                <span className="text-xs font-mono text-gray-500 whitespace-nowrap">
                  {formatTime(item.timestamp)}
                </span>
                <div className="flex-1">
                  <div className={`text-sm ${item.color}`}>
                    {item.label}
                  </div>
                  {item.delayed && item.actualArrivalTime && (
                    <div className="text-xs text-neon-purple flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      延迟 {(item.actualArrivalTime - item.timestamp).toFixed(0)} 秒到达
                      {item.actualArrivalTime !== item.timestamp && (
                        <span className="text-gray-500">
                          (实际到达: {formatTime(item.actualArrivalTime)})
                        </span>
                      )}
                    </div>
                  )}
                  {item.description && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {timeline.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            暂无事件记录
          </div>
        )}
      </div>

      {unhandledEvents.length > 0 && (
        <div className="mt-3 pt-3 border-t border-space-600">
          <h4 className="text-xs text-neon-yellow mb-2">待处理事件</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {unhandledEvents.map((event) => (
              <div
                key={event.id}
                className={`p-2 rounded border text-xs ${SEVERITY_BG_COLORS[event.severity]}`}
              >
                <div className="flex items-center gap-2">
                  {eventIcons[event.type]}
                  <span className="font-medium">{EVENT_TYPE_LABELS[event.type]}</span>
                  <span className="text-gray-400 ml-auto">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
