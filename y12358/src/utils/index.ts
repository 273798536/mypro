import dayjs from 'dayjs';
import type { PressureAnomaly, OilPressurePoint, CheckResult } from '../types';

export const generateId = () => Math.random().toString(36).substring(2, 11);

export const formatDateTime = (date: string | Date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

export const formatDate = (date: string | Date) => {
  return dayjs(date).format('YYYY-MM-DD');
};

export const getConclusionColor = (conclusion: CheckResult['conclusion']) => {
  switch (conclusion) {
    case 'normal':
      return '#00B42A';
    case 'warning':
      return '#FF7D00';
    case 'danger':
      return '#F53F3F';
    default:
      return '#86909C';
  }
};

export const getConclusionText = (conclusion: CheckResult['conclusion']) => {
  switch (conclusion) {
    case 'normal':
      return '正常';
    case 'warning':
      return '预警';
    case 'danger':
      return '危险';
    default:
      return '未知';
  }
};

export const getStatusColor = (status: CheckResult['status']) => {
  switch (status) {
    case 'draft':
      return '#86909C';
    case 'confirmed':
      return '#00B42A';
    case 'archived':
      return '#165DFF';
    default:
      return '#86909C';
  }
};

export const getStatusText = (status: CheckResult['status']) => {
  switch (status) {
    case 'draft':
      return '草稿';
    case 'confirmed':
      return '已确认';
    case 'archived':
      return '已归档';
    default:
      return '未知';
  }
};

export const getAnomalyTypeText = (type: PressureAnomaly['type']) => {
  switch (type) {
    case 'spike':
      return '压力尖峰';
    case 'drop':
      return '压力骤降';
    case 'fluctuation':
      return '异常波动';
    case 'over_limit':
      return '超限';
    default:
      return '未知';
  }
};

export const getSeverityColor = (severity: PressureAnomaly['severity']) => {
  switch (severity) {
    case 'low':
      return '#FF7D00';
    case 'medium':
      return '#FF7D00';
    case 'high':
      return '#F53F3F';
    default:
      return '#86909C';
  }
};

export const getSeverityText = (severity: PressureAnomaly['severity']) => {
  switch (severity) {
    case 'low':
      return '轻微';
    case 'medium':
      return '中等';
    case 'high':
      return '严重';
    default:
      return '未知';
  }
};

export const getEvidenceTypeText = (type: string) => {
  switch (type) {
    case 'load_record':
      return '载重记录';
    case 'oil_pressure':
      return '油压序列';
    case 'maintenance_remark':
      return '检修备注';
    case 'report':
      return '导出报告';
    default:
      return '未知';
  }
};

export const getEvidenceTypeIcon = (type: string) => {
  switch (type) {
    case 'load_record':
      return 'Scale';
    case 'oil_pressure':
      return 'Activity';
    case 'maintenance_remark':
      return 'FileText';
    case 'report':
      return 'Download';
    default:
      return 'Circle';
  }
};

export const detectPressureAnomalies = (
  points: OilPressurePoint[],
  warningThreshold: number,
  alarmThreshold: number
): PressureAnomaly[] => {
  const anomalies: PressureAnomaly[] = [];
  const normalPressure = 22;
  const fluctuationThreshold = 5;

  let i = 0;
  while (i < points.length) {
    const point = points[i];

    if (point.pressure >= alarmThreshold) {
      let j = i;
      while (j < points.length && points[j].pressure >= alarmThreshold) {
        j++;
      }
      const segment = points.slice(i, j);
      const pressures = segment.map((p) => p.pressure);
      anomalies.push({
        id: generateId(),
        startTime: segment[0].timestamp,
        endTime: segment[segment.length - 1].timestamp,
        maxPressure: Math.max(...pressures),
        minPressure: Math.min(...pressures),
        fluctuation: Math.max(...pressures) - Math.min(...pressures),
        type: 'over_limit',
        severity: 'high',
      });
      i = j;
      continue;
    }

    if (point.pressure >= warningThreshold) {
      let j = i;
      while (j < points.length && points[j].pressure >= warningThreshold) {
        j++;
      }
      const segment = points.slice(i, j);
      const pressures = segment.map((p) => p.pressure);
      anomalies.push({
        id: generateId(),
        startTime: segment[0].timestamp,
        endTime: segment[segment.length - 1].timestamp,
        maxPressure: Math.max(...pressures),
        minPressure: Math.min(...pressures),
        fluctuation: Math.max(...pressures) - Math.min(...pressures),
        type: 'over_limit',
        severity: 'medium',
      });
      i = j;
      continue;
    }

    if (point.pressure > normalPressure + 8) {
      let j = i;
      while (j < points.length && points[j].pressure > normalPressure + 5) {
        j++;
      }
      if (j - i <= 5) {
        const segment = points.slice(i, j);
        const pressures = segment.map((p) => p.pressure);
        anomalies.push({
          id: generateId(),
          startTime: segment[0].timestamp,
          endTime: segment[segment.length - 1].timestamp,
          maxPressure: Math.max(...pressures),
          minPressure: Math.min(...pressures),
          fluctuation: Math.max(...pressures) - Math.min(...pressures),
          type: 'spike',
          severity: 'high',
        });
        i = j;
        continue;
      }
    }

    if (point.pressure < normalPressure - 5) {
      let j = i;
      while (j < points.length && points[j].pressure < normalPressure - 3) {
        j++;
      }
      if (j - i <= 5) {
        const segment = points.slice(i, j);
        const pressures = segment.map((p) => p.pressure);
        anomalies.push({
          id: generateId(),
          startTime: segment[0].timestamp,
          endTime: segment[segment.length - 1].timestamp,
          maxPressure: Math.max(...pressures),
          minPressure: Math.min(...pressures),
          fluctuation: Math.max(...pressures) - Math.min(...pressures),
          type: 'drop',
          severity: 'medium',
        });
        i = j;
        continue;
      }
    }

    if (i > 0 && i < points.length - 1) {
      const prevPressure = points[i - 1].pressure;
      const nextPressure = points[i + 1].pressure;
      const fluctuation = Math.abs(point.pressure - prevPressure) + Math.abs(nextPressure - point.pressure);
      if (fluctuation > fluctuationThreshold) {
        let j = i;
        let maxFluctuation = fluctuation;
        while (j < points.length - 1) {
          const f = Math.abs(points[j].pressure - points[j - 1].pressure);
          if (f > 3) {
            maxFluctuation = Math.max(maxFluctuation, f);
            j++;
          } else {
            break;
          }
        }
        if (j - i >= 3) {
          const segment = points.slice(i, j);
          const pressures = segment.map((p) => p.pressure);
          anomalies.push({
            id: generateId(),
            startTime: segment[0].timestamp,
            endTime: segment[segment.length - 1].timestamp,
            maxPressure: Math.max(...pressures),
            minPressure: Math.min(...pressures),
            fluctuation: maxFluctuation,
            type: 'fluctuation',
            severity: maxFluctuation > 8 ? 'high' : 'medium',
          });
          i = j;
          continue;
        }
      }
    }

    i++;
  }

  return anomalies;
};

export const downloadFile = (content: string | Blob, filename: string, mimeType: string) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const checkConclusionConsistency = (
  overloadPassed: boolean,
  pressurePassed: boolean,
  _heightPassed: boolean
): boolean => {
  const hasOverloadIssue = !overloadPassed;
  const hasPressureIssue = !pressurePassed;
  if (hasOverloadIssue && !hasPressureIssue) {
    return false;
  }
  return true;
};
