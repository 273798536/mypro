import type { Instrument, Transport, CitySchedule, ConflictInfo, TraceSource, TraceEventType, TraceSeverity, TraceRecord } from '@/store/types';

export const detectConflicts = (
  instrument: Instrument,
  transport?: Transport,
  schedule?: CitySchedule
): ConflictInfo[] => {
  const conflicts: ConflictInfo[] = [];
  const now = new Date();

  if (new Date(instrument.insuranceExpiry) < now) {
    conflicts.push({
      instrumentId: instrument.id,
      source: 'INSTRUMENT',
      type: 'INSURANCE_EXPIRED',
      severity: 'WARNING',
      description: `保险已过期，过期日期：${new Date(instrument.insuranceExpiry).toLocaleDateString()}`,
      eventTime: instrument.insuranceExpiry,
      details: {
        field: 'insuranceExpiry',
        expected: `> ${now.toLocaleDateString()}`,
        actual: new Date(instrument.insuranceExpiry).toLocaleDateString(),
      },
    });
  }

  if (instrument.status === '漏箱') {
    conflicts.push({
      instrumentId: instrument.id,
      source: 'INSTRUMENT',
      type: 'MISSING_BOX',
      severity: 'CRITICAL',
      description: `乐器漏箱：${instrument.name}，请检查箱号：${transport?.boxNumber || '未知'}`,
      eventTime: instrument.updatedAt,
      details: {
        field: 'status',
        expected: '正常',
        actual: '漏箱',
      },
    });
  }

  if (transport && schedule) {
    if (transport.toCity !== schedule.city) {
      conflicts.push({
        instrumentId: instrument.id,
        source: 'CITY',
        type: 'CITY_MISMATCH',
        severity: 'WARNING',
        description: `城市错配：运输单目的城市为 ${transport.toCity}，但日程安排为 ${schedule.city}`,
        eventTime: schedule.actualArrival || schedule.scheduledArrival,
        details: {
          field: 'city',
          expected: schedule.city,
          actual: transport.toCity,
        },
      });
    }

    if (transport.actualArrival && new Date(transport.actualArrival) > new Date(schedule.scheduledArrival)) {
      const delayDays = Math.ceil(
        (new Date(transport.actualArrival).getTime() - new Date(schedule.scheduledArrival).getTime()) / (1000 * 60 * 60 * 24)
      );
      conflicts.push({
        instrumentId: instrument.id,
        source: 'CITY',
        type: 'LATE_ARRIVAL',
        severity: 'CRITICAL',
        description: `货物晚到 ${delayDays} 天，原计划到达：${new Date(schedule.scheduledArrival).toLocaleDateString()}，实际到达：${new Date(transport.actualArrival).toLocaleDateString()}`,
        eventTime: transport.actualArrival,
        details: {
          field: 'actualArrival',
          expected: `<= ${new Date(schedule.scheduledArrival).toLocaleDateString()}`,
          actual: new Date(transport.actualArrival).toLocaleDateString(),
        },
      });
    }
  }

  return conflicts.sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());
};

export const getSeverityColor = (severity: TraceSeverity): string => {
  switch (severity) {
    case 'CRITICAL':
      return 'text-alert-red';
    case 'WARNING':
      return 'text-amber-gold-400';
    case 'INFO':
      return 'text-midnight-400';
    default:
      return 'text-midnight-400';
  }
};

export const getSeverityBg = (severity: TraceSeverity): string => {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-alert-red/20 border-alert-red/50';
    case 'WARNING':
      return 'bg-amber-gold-600/20 border-amber-gold-500/50';
    case 'INFO':
      return 'bg-midnight-700/50 border-midnight-600';
    default:
      return 'bg-midnight-700/50 border-midnight-600';
  }
};

export const getEventTypeLabel = (type: TraceEventType): string => {
  const labels: Record<TraceEventType, string> = {
    IMPORT: '数据导入',
    UPDATE: '数据更新',
    LINK_TRANSPORT: '关联运输单',
    LINK_SCHEDULE: '关联日程',
    CONFLICT: '数据冲突',
    INSURANCE_EXPIRED: '保险过期',
    MISSING_BOX: '乐器漏箱',
    LATE_ARRIVAL: '到货晚到',
    CITY_MISMATCH: '城市错配',
    CONFLICT_RESOLVED: '冲突已解决',
    EXPORT: '数据导出',
  };
  return labels[type] || type;
};

export const getSourceLabel = (source: TraceSource): string => {
  const labels: Record<TraceSource, string> = {
    INSTRUMENT: '乐器清单',
    TRANSPORT: '运输单',
    CITY: '城市日程',
  };
  return labels[source] || source;
};

export const getSourceColor = (source: TraceSource): string => {
  switch (source) {
    case 'INSTRUMENT':
      return 'bg-blue-500/20 text-blue-400';
    case 'TRANSPORT':
      return 'bg-purple-500/20 text-purple-400';
    case 'CITY':
      return 'bg-green-500/20 text-green-400';
    default:
      return 'bg-midnight-600 text-midnight-300';
  }
};

export const getStatusBadge = (status: string) => {
  switch (status) {
    case '正常':
    case '已到达':
    case '按计划':
    case '已核对':
      return 'badge-success';
    case '漏箱':
    case '延误':
    case '错配':
      return 'badge-danger';
    case '待核对':
    case '运输中':
    case '晚到':
      return 'badge-warning';
    default:
      return 'badge-info';
  }
};

export const getSeverityDot = (severity: TraceSeverity): string => {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-alert-red';
    case 'WARNING':
      return 'bg-amber-gold-500';
    case 'INFO':
      return 'bg-blue-500';
    default:
      return 'bg-blue-500';
  }
};

export const getConflictsByInstrumentId = (instrumentId: string, traceRecords: TraceRecord[]): TraceRecord[] => {
  return traceRecords
    .filter((t) => t.instrumentId === instrumentId && t.severity !== 'INFO' && !t.resolved)
    .sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());
};

export const getConflictCounts = (traceRecords: TraceRecord[]): { missingBox: number; insuranceExpired: number; cityMismatch: number; lateArrival: number } => {
  return {
    missingBox: traceRecords.filter((t) => t.eventType === 'MISSING_BOX' && !t.resolved).length,
    insuranceExpired: traceRecords.filter((t) => t.eventType === 'INSURANCE_EXPIRED' && !t.resolved).length,
    cityMismatch: traceRecords.filter((t) => t.eventType === 'CITY_MISMATCH' && !t.resolved).length,
    lateArrival: traceRecords.filter((t) => t.eventType === 'LATE_ARRIVAL' && !t.resolved).length,
  };
};

export const getStatistics = (instruments: Instrument[], traceRecords: TraceRecord[]) => {
  const counts = getConflictCounts(traceRecords);
  return {
    total: instruments.length,
    checked: instruments.filter((i) => i.status === '已核对').length,
    hasConflict: new Set(traceRecords.filter((t) => !t.resolved && t.severity !== 'INFO').map((t) => t.instrumentId)).size,
    pending: instruments.filter((i) => i.status === '待核对').length,
    missingBox: counts.missingBox,
    insuranceExpired: counts.insuranceExpired,
    lateArrival: counts.lateArrival,
    cityMismatch: counts.cityMismatch,
  };
};
