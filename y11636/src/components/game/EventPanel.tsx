import React, { useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Clock, RefreshCw, ArrowUpDown, DoorOpen, CheckCircle, UserPlus, X } from 'lucide-react';
import type { GameEvent } from '@/types';
import { EVENT_CONFIG } from '@/types';
import { formatDateTime } from '@/utils/helpers';
import { useGameStore } from '@/stores/useGameStore';

interface EventPanelProps {
  events: GameEvent[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  clock: Clock,
  'refresh-cw': RefreshCw,
  'alert-triangle': AlertTriangle,
  'arrow-up-down': ArrowUpDown,
  'door-open': DoorOpen,
  'check-circle': CheckCircle,
  'user-plus': UserPlus,
};

export const EventPanel: React.FC<EventPanelProps> = ({ events }) => {
  const markEventAsRead = useGameStore(state => state.markEventAsRead);
  const panelRef = useRef<HTMLDivElement>(null);
  const unreadCount = events.filter(e => !e.read).length;

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTop = 0;
    }
  }, [events.length]);

  const getEventIcon = (iconName: string) => {
    const IconComponent = ICON_MAP[iconName] || Bell;
    return IconComponent;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold text-gray-800">事件记录</h2>
        </div>
        {unreadCount > 0 && (
          <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
            {unreadCount} 条新
          </span>
        )}
      </div>

      <div ref={panelRef} className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Bell size={32} className="mb-2 opacity-50" />
            <p className="text-sm">暂无事件</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {events.slice(0, 50).map((event, index) => {
              const config = EVENT_CONFIG[event.type];
              const IconComponent = getEventIcon(config.icon);
              const isDeduction = event.pointsChange < 0;
              const isAddition = event.pointsChange > 0;

              return (
                <div
                  key={event.id}
                  className={`p-3 transition-colors duration-200 hover:bg-gray-50 ${
                    !event.read ? 'bg-blue-50' : ''
                  }`}
                  onMouseEnter={() => {
                    if (!event.read) {
                      markEventAsRead(event.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                      event.type === 'critical_miss' ? 'bg-red-100' :
                      event.type === 'timeout' ? 'bg-yellow-100' :
                      event.type === 're_evaluate' ? 'bg-purple-100' :
                      event.type === 'room_complete' ? 'bg-green-100' :
                      'bg-gray-100'
                    }`}>
                      <IconComponent
                        size={14}
                        className={config.color}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${config.color} bg-opacity-10`}>
                              {config.label}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDateTime(event.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{event.message}</p>
                        </div>

                        {event.pointsChange !== 0 && (
                          <span className={`text-sm font-bold flex-shrink-0 ${
                            isDeduction ? 'text-red-500' :
                            isAddition ? 'text-green-500' :
                            'text-gray-500'
                          }`}>
                            {isAddition ? '+' : ''}{event.pointsChange}
                          </span>
                        )}
                      </div>

                      {event.details && Object.keys(event.details).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">
                          {Object.entries(event.details).map(([key, value]) => (
                            <div key={key} className="flex gap-1">
                              <span className="text-gray-400">{key}:</span>
                              <span className="text-gray-600">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventPanel;
