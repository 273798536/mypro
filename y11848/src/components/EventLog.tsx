import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameEvent } from '../types/game';

interface EventLogProps {
  events: GameEvent[];
  maxItems?: number;
}

const getEventColor = (type: string): string => {
  switch (type) {
    case 'hit':
      return 'text-tech-green';
    case 'miss':
      return 'text-tech-orange';
    case 'dirty_read':
    case 'breakdown':
    case 'timeout':
    case 'evict':
      return 'text-tech-red';
    case 'expired_read':
      return 'text-yellow-400';
    case 'breakdown_prevented':
    case 'write':
    case 'refresh':
    case 'delete':
      return 'text-tech-cyan';
    default:
      return 'text-gray-400';
  }
};

const getEventIcon = (type: string): string => {
  switch (type) {
    case 'hit':
      return '✅';
    case 'miss':
      return '❌';
    case 'dirty_read':
      return '💩';
    case 'expired_read':
      return '⏰';
    case 'breakdown':
      return '💥';
    case 'breakdown_prevented':
      return '🛡️';
    case 'timeout':
      return '⌛';
    case 'write':
      return '✏️';
    case 'delete':
      return '🗑️';
    case 'refresh':
      return '🔄';
    case 'evict':
      return '⬇️';
    default:
      return '📌';
  }
};

const getScoreDisplay = (change: number): string => {
  if (change > 0) return `+${change}`;
  if (change < 0) return `${change}`;
  return '';
};

export const EventLog: React.FC<EventLogProps> = ({ events, maxItems = 50 }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const displayEvents = events.slice(-maxItems).reverse();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length]);

  return (
    <div className="bg-tech-blue/50 rounded-xl p-4 border border-tech-cyan/20 h-full flex flex-col">
      <h3 className="text-tech-cyan font-bold text-lg mb-4 flex items-center gap-2">
        <span className="text-2xl">📜</span>
        实时战报
      </h3>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1 pr-1 font-mono text-sm"
      >
        <AnimatePresence initial={false}>
          {displayEvents.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              暂无事件
            </div>
          ) : (
            displayEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.01 }}
                className={`
                  flex items-center gap-2 py-1.5 px-2 rounded
                  ${index === 0 ? 'bg-tech-cyan/10' : ''}
                  hover:bg-white/5
                `}
              >
                <span className="text-base">{getEventIcon(event.type)}</span>
                <span className="text-gray-500 text-xs min-w-[40px]">
                  {new Date(event.timestamp).toLocaleTimeString('zh-CN', { 
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span className={`flex-1 ${getEventColor(event.type)}`}>
                  {event.message}
                </span>
                {event.scoreChange !== 0 && (
                  <span className={`
                    font-bold text-xs min-w-[40px] text-right
                    ${event.scoreChange > 0 ? 'text-tech-green' : 'text-tech-red'}
                  `}>
                    {getScoreDisplay(event.scoreChange)}
                  </span>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
