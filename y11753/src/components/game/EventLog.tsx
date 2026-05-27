import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, Zap, Cloud, AlertCircle, Clock } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { GameEvent } from '../../types';

const eventIcons: Record<string, typeof Info> = {
  weather_change: Cloud,
  battery_warning: Zap,
  fault_missed: AlertCircle,
  info: Info,
  operation: Info
};

const eventColors: Record<string, string> = {
  info: 'border-slate-600 bg-slate-700/50',
  warning: 'border-yellow-600 bg-yellow-900/20',
  danger: 'border-red-600 bg-red-900/20'
};

const eventIconColors: Record<string, string> = {
  info: 'text-slate-400',
  warning: 'text-yellow-400',
  danger: 'text-red-400'
};

export const EventLog = () => {
  const { events } = useGameStore();
  
  const recentEvents = [...events].reverse().slice(0, 20);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          事件日志
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence initial={false}>
          {recentEvents.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无事件</p>
            </div>
          ) : (
            recentEvents.map((event, index) => (
              <EventItem key={event.id} event={event} formatTime={formatTime} index={index} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

interface EventItemProps {
  event: GameEvent;
  formatTime: (seconds: number) => string;
  index: number;
}

const EventItem = ({ event, formatTime, index }: EventItemProps) => {
  const Icon = eventIcons[event.type] || Info;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
      className={`p-3 rounded-lg border-l-4 ${eventColors[event.level]} ${
        !event.acknowledged ? 'ring-1 ring-white/10' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${eventIconColors[event.level]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium text-white truncate">{event.title}</h4>
            <span className="text-xs text-slate-500 flex items-center gap-1 flex-shrink-0">
              <Clock className="w-3 h-3" />
              {formatTime(event.timestamp)}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{event.message}</p>
        </div>
      </div>
    </motion.div>
  );
};
