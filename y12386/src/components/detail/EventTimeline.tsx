import { motion } from 'framer-motion';
import { Package, Clock, MapPin, ShieldAlert, AlertTriangle, ChevronRight, Check } from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import { formatDateTime } from '@/utils/dataMapper';
import { getEventTypeLabel, getSeverityBg, getSeverityColor, getSeverityDot } from '@/utils/conflictDetector';
import type { TraceRecord, Photo } from '@/store/types';

interface EventTimelineProps {
  instrumentId: string;
}

const EventTimeline = ({ instrumentId }: EventTimelineProps) => {
  const { getConflictsByInstrumentId, getPhotosByTraceId, resolveTrace } = useAppStore();

  const events = getConflictsByInstrumentId(instrumentId)
    .sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());

  const getIconForType = (type: string) => {
    switch (type) {
      case 'MISSING_BOX':
        return Package;
      case 'LATE_ARRIVAL':
        return Clock;
      case 'CITY_MISMATCH':
        return MapPin;
      case 'INSURANCE_EXPIRED':
        return ShieldAlert;
      default:
        return AlertTriangle;
    }
  };

  if (events.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <h3 className="title-section mb-4">事件时间轴</h3>
        <div className="text-center py-12 text-midnight-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">暂无事件记录</p>
          <p className="text-sm mt-1">该乐器清单核对正常，无冲突事件</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="title-section flex items-center gap-2">
          <Clock className="w-4 h-4" />
          事件时间轴
        </h3>
        <span className="text-xs text-midnight-400">
          按事件先后顺序排列 · 共 {events.length} 条记录
        </span>
      </div>

      <div className="relative">
        <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-midnight-700" />

        <div className="space-y-0">
          {events.map((event: TraceRecord, index: number) => {
            const Icon = getIconForType(event.eventType);
            const photos = getPhotosByTraceId(event.id);

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`relative pl-16 pb-6 last:pb-0 ${event.resolved ? 'opacity-60' : ''}`}
              >
                <div
                  className={`absolute left-4 w-5 h-5 rounded-full ${getSeverityDot(event.severity)} border-2 border-midnight-800 z-10`}
                >
                  {event.resolved && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {!event.resolved && event.severity === 'CRITICAL' && (
                    <div className={`absolute inset-0 rounded-full ${getSeverityDot(event.severity)} animate-ping opacity-30`} />
                  )}
                </div>

                <div className={`absolute left-14 -top-1 px-2 py-0.5 bg-midnight-700 rounded text-xs text-midnight-400 font-mono`}>
                  #{index + 1}
                </div>

                <div className={`card p-4 ${getSeverityBg(event.severity)} border`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-4 h-4 ${getSeverityColor(event.severity)}`} />
                        <span className={`font-medium ${getSeverityColor(event.severity)}`}>
                          {getEventTypeLabel(event.eventType)}
                        </span>
                        <span className="text-xs text-midnight-500">
                          {formatDateTime(event.eventTime)}
                        </span>
                        {event.resolved && (
                          <span className="badge-success text-xs ml-2">已处理</span>
                        )}
                      </div>

                      <p className="text-sm text-midnight-200 mb-2">{event.description}</p>

                      {event.beforeValue && event.afterValue && (
                        <div className="flex items-center gap-2 text-xs mb-2">
                          <span className="px-2 py-1 bg-midnight-700/50 rounded line-through text-midnight-500">
                            {event.beforeValue}
                          </span>
                          <ChevronRight className="w-3 h-3 text-midnight-500" />
                          <span className="px-2 py-1 bg-amber-gold-500/20 rounded text-amber-gold-300">
                            {event.afterValue}
                          </span>
                        </div>
                      )}

                      {photos.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-midnight-500 mb-2">照片留痕 ({photos.length}张)</p>
                          <div className="flex gap-2">
                            {photos.map((photo: Photo) => (
                              <div
                                key={photo.id}
                                className="w-16 h-16 rounded-btn overflow-hidden border border-midnight-600 group relative"
                              >
                                <img
                                  src={photo.url}
                                  alt={photo.description}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-xs text-white">📷</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-midnight-700/50 flex items-center gap-4 text-xs">
                        <span className="text-midnight-500">
                          来源：<span className="text-midnight-300">{event.source}</span>
                        </span>
                        <span className="text-midnight-500">
                          操作员：<span className="text-midnight-300">{event.operator}</span>
                        </span>
                        <span className="text-midnight-500">
                          严重等级：<span className={getSeverityColor(event.severity)}>{event.severity}</span>
                        </span>
                      </div>

                      {event.resolution && (
                        <div className="mt-3 p-2 bg-success-green/10 border border-success-green/30 rounded-btn">
                          <p className="text-xs text-success-green font-medium mb-1">处理结果</p>
                          <p className="text-xs text-midnight-300">{event.resolution}</p>
                        </div>
                      )}
                    </div>

                    {!event.resolved && (
                      <button
                        onClick={() => {
                          const resolution = prompt('请输入处理结果：');
                          if (resolution) {
                            resolveTrace(event.id, resolution);
                          }
                        }}
                        className="ml-4 px-3 py-1 bg-success-green/20 text-success-green rounded text-xs hover:bg-success-green/30 transition-colors flex-shrink-0"
                      >
                        标记处理
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default EventTimeline;
