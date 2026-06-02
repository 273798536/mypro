import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Clock, MapPin, ShieldAlert, AlertTriangle, ChevronRight } from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import { formatDateTime, getInstrumentById } from '@/utils/dataMapper';
import { getEventTypeLabel, getSeverityBg, getSeverityColor, getSeverityDot } from '@/utils/conflictDetector';

const Timeline = () => {
  const navigate = useNavigate();
  const { traceRecords, instruments } = useAppStore();

  const recentTraces = [...traceRecords]
    .sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime())
    .slice(0, 8);

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

  if (recentTraces.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <h3 className="title-section mb-4">最近事件时间轴</h3>
        <div className="text-center py-12 text-midnight-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">暂无事件记录</p>
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
        <h3 className="title-section">最近事件时间轴</h3>
        <span className="text-xs text-midnight-400">按事件时间排序，最新在前</span>
      </div>

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-midnight-700" />

        <div className="space-y-0">
          {recentTraces.map((trace, index) => {
            const instrument = getInstrumentById(trace.instrumentId, instruments);
            const Icon = getIconForType(trace.eventType);

            return (
              <motion.div
                key={trace.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/detail/${trace.instrumentId}`)}
                className="relative pl-16 pb-6 last:pb-0 cursor-pointer group"
              >
                <div
                  className={`absolute left-4 w-5 h-5 rounded-full ${getSeverityDot(trace.severity)} border-2 border-midnight-800 z-10`}
                >
                  <div className={`absolute inset-0 rounded-full ${getSeverityDot(trace.severity)} animate-ping opacity-30`} />
                </div>

                <div className={`card p-4 group-hover:border-amber-gold-500/50 transition-all ${getSeverityBg(trace.severity)} border`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 ${getSeverityColor(trace.severity)}`} />
                        <span className={`font-medium ${getSeverityColor(trace.severity)}`}>
                          {getEventTypeLabel(trace.eventType)}
                        </span>
                        <span className="text-xs text-midnight-500">
                          {formatDateTime(trace.eventTime)}
                        </span>
                      </div>

                      <p className="text-sm text-midnight-200 mb-1">
                        {instrument?.name || '未知乐器'}
                        <span className="text-midnight-500 ml-2">{instrument?.owner}</span>
                      </p>

                      <p className="text-xs text-midnight-400">{trace.description}</p>

                      {trace.beforeValue && trace.afterValue && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <span className="px-2 py-1 bg-midnight-700/50 rounded line-through text-midnight-500">
                            {trace.beforeValue}
                          </span>
                          <ChevronRight className="w-3 h-3 text-midnight-500" />
                          <span className="px-2 py-1 bg-amber-gold-500/20 rounded text-amber-gold-300">
                            {trace.afterValue}
                          </span>
                        </div>
                      )}

                      {trace.photoIds.length > 0 && (
                        <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-blue-500/20 rounded text-xs text-blue-400">
                          📷 {trace.photoIds.length} 张照片
                        </span>
                      )}

                      <div className="mt-2 flex items-center gap-2 text-xs text-midnight-500">
                        <span>操作员：{trace.operator}</span>
                        <span>·</span>
                        <span>来源：{trace.source}</span>
                        {trace.resolved && (
                          <>
                            <span>·</span>
                            <span className="text-success-green">已处理</span>
                          </>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-midnight-500 group-hover:text-amber-gold-400 transition-colors" />
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

export default Timeline;
