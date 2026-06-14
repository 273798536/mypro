import { SensorLog, QualityIssue } from '../types';
import { generateId } from '../data/sampleLogs';

const isResistanceValid = (resistance: number | null): boolean => {
  if (resistance === null) return false;
  return resistance >= 0 && resistance <= 10000000;
};

const isTemperatureValid = (temperature: number | null): boolean => {
  if (temperature === null) return false;
  return temperature >= -40 && temperature <= 120;
};

const isTimestampValid = (timestamp: string): boolean => {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
};

const formatRawReference = (log: SensorLog): string => {
  const fields = [];
  fields.push(`行号: ${log.rawLineNumber}`);
  if (log.deviceId) fields.push(`${log.deviceIdField}: ${log.deviceId}`);
  return fields.join(', ');
};

export const checkDataQuality = (logs: SensorLog[]): QualityIssue[] => {
  const issues: QualityIssue[] = [];
  const seenRecords = new Map<string, string[]>();

  logs.forEach((log) => {
    const key = `${log.deviceId}-${log.timestamp}`;
    if (seenRecords.has(key)) {
      const existingLines = seenRecords.get(key)!;
      existingLines.push(String(log.rawLineNumber));
      seenRecords.set(key, existingLines);
    } else {
      seenRecords.set(key, [String(log.rawLineNumber)]);
    }
  });

  seenRecords.forEach((lines, key) => {
    if (lines.length > 1) {
      const [deviceId, timestamp] = key.split('-');
      lines.forEach((lineNum, index) => {
        if (index === 0) return;
        const log = logs.find((l) => l.rawLineNumber === parseInt(lineNum));
        if (log) {
          issues.push({
            issueId: generateId(),
            logId: log.id,
            rawLineNumber: log.rawLineNumber,
            deviceId: log.deviceId,
            issueType: 'duplicate',
            description: `设备编号重复，与第 ${lines[0]} 行的记录相同（设备: ${deviceId}, 时间: ${timestamp}）`,
            severity: 'warning',
            rawReference: formatRawReference(log),
          });
        }
      });
    }
  });

  logs.forEach((log) => {
    if (log.resistance === null && log.temperature === null && !log.timestamp) {
      issues.push({
        issueId: generateId(),
        logId: log.id,
        rawLineNumber: log.rawLineNumber,
        deviceId: log.deviceId,
        issueType: 'missing_field',
        description: '空行或关键字段全部缺失',
        severity: 'error',
        rawReference: formatRawReference(log),
      });
      return;
    }

    if (!log.deviceId || log.deviceId === '') {
      issues.push({
        issueId: generateId(),
        logId: log.id,
        rawLineNumber: log.rawLineNumber,
        deviceId: log.deviceId,
        issueType: 'missing_field',
        description: '设备编号缺失',
        severity: 'error',
        rawReference: formatRawReference(log),
      });
    }

    if (log.resistance === null) {
      issues.push({
        issueId: generateId(),
        logId: log.id,
        rawLineNumber: log.rawLineNumber,
        deviceId: log.deviceId,
        issueType: 'missing_field',
        description: '内阻测量值缺失',
        severity: 'error',
        rawReference: formatRawReference(log),
      });
    } else if (!isResistanceValid(log.resistance)) {
      issues.push({
        issueId: generateId(),
        logId: log.id,
        rawLineNumber: log.rawLineNumber,
        deviceId: log.deviceId,
        issueType: 'out_of_range',
        description: `内阻测量值异常: ${log.resistance}${log.resistanceUnit}（合理范围: 0-10000Ω）`,
        severity: 'error',
        rawReference: formatRawReference(log),
      });
    }

    if (log.temperature === null) {
      issues.push({
        issueId: generateId(),
        logId: log.id,
        rawLineNumber: log.rawLineNumber,
        deviceId: log.deviceId,
        issueType: 'missing_field',
        description: '温度值缺失',
        severity: 'warning',
        rawReference: formatRawReference(log),
      });
    } else if (!isTemperatureValid(log.temperature)) {
      issues.push({
        issueId: generateId(),
        logId: log.id,
        rawLineNumber: log.rawLineNumber,
        deviceId: log.deviceId,
        issueType: 'out_of_range',
        description: `温度值异常: ${log.temperature}°C（合理范围: -40°C ~ 120°C）`,
        severity: 'error',
        rawReference: formatRawReference(log),
      });
    }

    if (!log.timestamp || log.timestamp === '') {
      issues.push({
        issueId: generateId(),
        logId: log.id,
        rawLineNumber: log.rawLineNumber,
        deviceId: log.deviceId,
        issueType: 'missing_field',
        description: '时间戳缺失',
        severity: 'warning',
        rawReference: formatRawReference(log),
      });
    } else if (!isTimestampValid(log.timestamp)) {
      issues.push({
        issueId: generateId(),
        logId: log.id,
        rawLineNumber: log.rawLineNumber,
        deviceId: log.deviceId,
        issueType: 'bad_data',
        description: `时间戳格式无效: ${log.timestamp}`,
        severity: 'error',
        rawReference: formatRawReference(log),
      });
    }
  });

  return issues.sort((a, b) => a.rawLineNumber - b.rawLineNumber);
};

export const getQualityIssueLogIds = (issues: QualityIssue[]): Set<string> => {
  return new Set(issues.map((issue) => issue.logId));
};

export const getIssueTypeLabel = (type: QualityIssue['issueType']): string => {
  const labels: Record<QualityIssue['issueType'], string> = {
    duplicate: '重复记录',
    bad_data: '坏数据',
    missing_field: '字段缺失',
    out_of_range: '数值超限',
  };
  return labels[type];
};

export const getSeverityLabel = (severity: QualityIssue['severity']): string => {
  return severity === 'error' ? '错误' : '警告';
};
