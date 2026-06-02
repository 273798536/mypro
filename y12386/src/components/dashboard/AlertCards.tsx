import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Package, Clock, MapPin, ShieldAlert, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import useAppStore from '@/store/useAppStore';
import { getEventTypeLabel, getSeverityBg, getSeverityColor } from '@/utils/conflictDetector';
import { formatDateTime } from '@/utils/dataMapper';
import type { TraceRecord } from '@/store/types';

const AlertCards = () => {
  const navigate = useNavigate();
  const { instruments, traceRecords, getConflictsByInstrumentId, getTransportByInstrumentId, getScheduleByInstrumentId } = useAppStore();

  const criticalInstruments = instruments.filter((inst) => {
    const conflicts = getConflictsByInstrumentId(inst.id);
    return conflicts.some((c) => c.severity === 'CRITICAL');
  }).sort((a, b) => {
    const aConflicts = getConflictsByInstrumentId(a.id);
    const bConflicts = getConflictsByInstrumentId(b.id);
    return bConflicts.length - aConflicts.length;
  });

  const getIconForConflict = (type: string) => {
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

  if (criticalInstruments.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-alert-red" />
          <h3 className="title-section">异常告警</h3>
        </div>
        <div className="text-center py-12 text-midnight-400">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">暂无异常告警</p>
          <p className="text-sm mt-1">所有乐器清单核对正常</p>
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-alert-red" />
          <h3 className="title-section">异常告警</h3>
          <span className="badge-danger ml-2">{criticalInstruments.length} 个严重异常</span>
        </div>
        <button
          onClick={() => navigate('/check')}
          className="text-sm text-amber-gold-400 hover:text-amber-gold-300 flex items-center gap-1"
        >
          查看全部 <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {criticalInstruments.slice(0, 5).map((instrument, index) => {
          const conflicts = getConflictsByInstrumentId(instrument.id);
          const transport = getTransportByInstrumentId(instrument.id);
          const schedule = getScheduleByInstrumentId(instrument.id);

          return (
            <motion.div
              key={instrument.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(`/detail/${instrument.id}`)}
              className={`card p-4 card-hover cursor-pointer ${conflicts.some(c => c.severity === 'CRITICAL') ? 'animate-pulse-red' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-midnight-100">{instrument.name}</h4>
                    <span className={`badge ${conflicts.some(c => c.severity === 'CRITICAL') ? 'badge-danger' : 'badge-warning'}`}>
                      {conflicts.length} 项异常
                    </span>
                  </div>
                  <p className="text-sm text-midnight-400 mb-2">
                    {instrument.owner} · {transport?.boxNumber || '无箱号'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {conflicts.slice(0, 3).map((conflict: TraceRecord) => {
                      const Icon = getIconForConflict(conflict.eventType);
                      return (
                        <div
                          key={conflict.id}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${getSeverityBg(conflict.severity)} border`}
                        >
                          <Icon className={`w-3 h-3 ${getSeverityColor(conflict.severity)}`} />
                          <span className={getSeverityColor(conflict.severity)}>
                            {getEventTypeLabel(conflict.eventType)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-midnight-500 mt-2">
                    最近事件：{formatDateTime(conflicts[conflicts.length - 1]?.eventTime)}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-midnight-500" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default AlertCards;
