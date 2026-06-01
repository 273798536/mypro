import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, X, ChevronLeft, AlertOctagon } from 'lucide-react';
import type { Event } from '../../types';
import { useStore } from '../../store/useStore';

const eventTypeLabels: Record<Event['type'], string> = {
  probe_offline: '探头离线',
  product_block: '货品遮挡',
  fan_stop: '风机停转',
};

const eventTypeIcons: Record<Event['type'], typeof AlertTriangle> = {
  probe_offline: AlertOctagon,
  product_block: AlertTriangle,
  fan_stop: AlertCircle,
};

const severityColors: Record<Event['severity'], { bg: string; border: string; text: string }> = {
  critical: {
    bg: 'bg-red-950/50',
    border: 'border-red-500/60',
    text: 'text-red-400',
  },
  warning: {
    bg: 'bg-amber-950/50',
    border: 'border-amber-500/60',
    text: 'text-amber-400',
  },
  info: {
    bg: 'bg-blue-950/50',
    border: 'border-blue-500/60',
    text: 'text-blue-400',
  },
};

const severityLabels: Record<Event['severity'], string> = {
  critical: '严重',
  warning: '警告',
  info: '提示',
};

interface EventCardProps {
  event: Event;
  isSelected: boolean;
  onClick: () => void;
}

function EventCard({ event, isSelected, onClick }: EventCardProps) {
  const colors = severityColors[event.severity];
  const IconComponent = eventTypeIcons[event.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        p-3 rounded-lg cursor-pointer border transition-all duration-200
        ${colors.bg} ${colors.border}
        ${isSelected ? 'ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-500/20' : ''}
        hover:shadow-lg
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded ${colors.text} bg-current/10`}>
          <IconComponent size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm text-slate-200">
              {eventTypeLabels[event.type]}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors.text} bg-current/10`}>
              {severityLabels[event.severity]}
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-2 line-clamp-2">
            {event.description}
          </p>
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>{event.timestamp.split(' ')[1]}</span>
            <span className="text-cyan-400">
              {event.relatedClues.length} 个关联线索
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function EventPanel() {
  const { events, selection, selectEvent, eventPanelOpen, toggleEventPanel } = useStore();

  return (
    <AnimatePresence mode="wait">
      {eventPanelOpen ? (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="h-full bg-slate-900/95 border-r border-slate-700/50 flex flex-col"
        >
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-200">异常事件</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  共 {events.length} 条待处理
                </p>
              </div>
              <button
                onClick={toggleEventPanel}
                className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isSelected={selection.type === 'event' && selection.id === event.id}
                onClick={() => selectEvent(event.id)}
              />
            ))}
          </div>

          <div className="p-3 border-t border-slate-700/50">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-red-950/30">
                <div className="text-red-400 font-bold text-sm">
                  {events.filter((e) => e.severity === 'critical').length}
                </div>
                <div className="text-slate-500">严重</div>
              </div>
              <div className="p-2 rounded bg-amber-950/30">
                <div className="text-amber-400 font-bold text-sm">
                  {events.filter((e) => e.severity === 'warning').length}
                </div>
                <div className="text-slate-500">警告</div>
              </div>
              <div className="p-2 rounded bg-blue-950/30">
                <div className="text-blue-400 font-bold text-sm">
                  {events.filter((e) => e.severity === 'info').length}
                </div>
                <div className="text-slate-500">提示</div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={toggleEventPanel}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-slate-800/90 border border-r-0 border-slate-600/50 rounded-r-lg p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/90 transition-all"
        >
          <AlertTriangle size={18} />
          <span className="absolute -right-1 -top-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
            {events.length}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
