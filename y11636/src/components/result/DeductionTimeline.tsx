import React from 'react';
import { AlertTriangle, Clock, RefreshCw, ArrowUpDown, DoorOpen, CheckCircle, UserPlus, X } from 'lucide-react';
import type { GameEvent } from '@/types';
import { EVENT_CONFIG } from '@/types';
import { formatDateTime } from '@/utils/helpers';

interface DeductionTimelineProps {
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

export const DeductionTimeline: React.FC<DeductionTimelineProps> = ({ events }) => {
  const getEventIcon = (iconName: string) => {
    const IconComponent = ICON_MAP[iconName] || AlertTriangle;
    return IconComponent;
  };

  const deductionEvents = events.filter(e => e.pointsChange !== 0);
  const totalDeductions = deductionEvents.filter(e => e.pointsChange < 0).reduce((sum, e) => sum + Math.abs(e.pointsChange), 0);
  const totalAdditions = deductionEvents.filter(e => e.pointsChange > 0).reduce((sum, e) => sum + e.pointsChange, 0);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">事件时间线</h2>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-gray-600">得分: +{totalAdditions}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            <span className="text-gray-600">扣分: -{totalDeductions}</span>
          </span>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Clock size={48} className="mx-auto mb-2 opacity-50" />
            <p>暂无事件记录</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            
            <div className="space-y-4">
              {events.map((event, index) => {
                const config = EVENT_CONFIG[event.type];
                const IconComponent = getEventIcon(config.icon);
                const isDeduction = event.pointsChange < 0;
                const isAddition = event.pointsChange > 0;
                const isCritical = event.type === 'critical_miss';

                return (
                  <div key={event.id} className="relative pl-10">
                    <div className={`absolute left-2 w-5 h-5 rounded-full border-2 border-white ${
                      isCritical ? 'bg-red-500' :
                      isDeduction ? 'bg-yellow-500' :
                      isAddition ? 'bg-green-500' :
                      'bg-blue-500'
                    }`}>
                      <IconComponent size={10} className="text-white m-auto mt-0.5" />
                    </div>

                    <div className={`p-4 rounded-xl border ${
                      isCritical ? 'bg-red-50 border-red-200' :
                      isDeduction ? 'bg-yellow-50 border-yellow-200' :
                      isAddition ? 'bg-green-50 border-green-200' :
                      'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                              isCritical ? 'bg-red-100 text-red-600' :
                              isDeduction ? 'bg-yellow-100 text-yellow-600' :
                              isAddition ? 'bg-green-100 text-green-600' :
                              'bg-blue-100 text-blue-600'
                            }`}>
                              {config.label}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDateTime(event.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{event.message}</p>
                          
                          {event.details && Object.keys(event.details).length > 0 && (
                            <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-2">
                              {Object.entries(event.details).map(([key, value]) => (
                                <span key={key} className="bg-white/50 px-2 py-1 rounded">
                                  {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {event.pointsChange !== 0 && (
                          <span className={`text-lg font-bold flex-shrink-0 ${
                            isDeduction ? 'text-red-500' :
                            isAddition ? 'text-green-500' :
                            'text-gray-500'
                          }`}>
                            {isAddition ? '+' : ''}{event.pointsChange}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeductionTimeline;
