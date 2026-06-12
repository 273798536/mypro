import { RawSensorLog } from '@/types';
import { parseValueAndUnit } from './units';
import { parseDirection } from './direction';

export type LogFormat = 'csv' | 'json' | 'text';

export interface ParseOptions {
  delimiter?: string;
  hasHeader?: boolean;
  timestampFormat?: string;
}

export interface ParseResult {
  logs: RawSensorLog[];
  errors: string[];
  format: LogFormat;
}

export function detectFormat(content: string): LogFormat {
  const firstLine = content.trim().split('\n')[0];
  
  if (firstLine.trim().startsWith('{') || firstLine.trim().startsWith('[')) {
    return 'json';
  }
  
  if (firstLine.includes(',') || firstLine.includes('\t') || firstLine.includes(';')) {
    return 'csv';
  }
  
  return 'text';
}

export function detectDelimiter(content: string): string {
  const firstLine = content.trim().split('\n')[0];
  const delimiters = [',', '\t', ';', '|'];
  
  let bestDelimiter = ',';
  let maxCount = 0;
  
  for (const d of delimiters) {
    const count = (firstLine.match(new RegExp(`\\${d}`, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = d;
    }
  }
  
  return bestDelimiter;
}

function generateId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function detectSensorType(fields: string[], values: string[]): 'wave_height' | 'wave_speed' | 'wave_direction' | 'temperature' {
  const lowerFields = fields.map((f) => f.toLowerCase());
  
  const typePatterns: { [key: string]: RegExp[] } = {
    wave_height: [/高度|height|浪高|wave.*height/i],
    wave_speed: [/速度|speed|流速|wave.*speed|current/i],
    wave_direction: [/方向|direction|流向|wave.*direction/i],
    temperature: [/温度|temp|水温|temperature/i],
  };

  for (let i = 0; i < lowerFields.length; i++) {
    for (const [type, patterns] of Object.entries(typePatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerFields[i]) || (values[i] && pattern.test(values[i]))) {
          return type as 'wave_height' | 'wave_speed' | 'wave_direction' | 'temperature';
        }
      }
    }
  }

  const value = values.find((v) => v) || '';
  const { unit } = parseValueAndUnit(value);
  
  if (unit) {
    const heightUnits = ['m', 'km', 'cm', 'mm', 'ft'];
    const speedUnits = ['m/s', 'km/h', 'km/s', 'knot', 'mph'];
    const tempUnits = ['C', 'F', 'K'];
    
    if (heightUnits.includes(unit)) return 'wave_height';
    if (speedUnits.includes(unit)) return 'wave_speed';
    if (tempUnits.includes(unit)) return 'temperature';
  }

  const direction = parseDirection(value);
  if (direction) return 'wave_direction';

  return 'wave_height';
}

function parseTimestamp(value: string): Date | null {
  if (!value) return null;
  
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date;
  }

  const patterns = [
    /(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/,
    /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
    /(\d{1,2})[-/](\d{1,2})[-/](\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      const [, y, m, d, h, min, s] = match;
      const year = parseInt(y);
      const month = parseInt(m) - 1;
      const day = parseInt(d);
      const hour = parseInt(h);
      const minute = parseInt(min);
      const second = parseInt(s);
      
      const parsed = new Date(year, month, day, hour, minute, second);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  return null;
}

export function parseCSV(content: string, options: ParseOptions = {}): ParseResult {
  const delimiter = options.delimiter || detectDelimiter(content);
  const lines = content.trim().split('\n');
  const logs: RawSensorLog[] = [];
  const errors: string[] = [];
  
  if (lines.length === 0) {
    return { logs, errors: ['文件为空'], format: 'csv' };
  }

  const hasHeader = options.hasHeader !== false;
  const headerLine = hasHeader ? lines[0] : null;
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const fields = headerLine
    ? headerLine.split(delimiter).map((f) => f.trim())
    : ['timestamp', 'value', 'unit', 'direction'];

  let timestampIndex = fields.findIndex((f) => /时间|timestamp|time|date/i.test(f));
  let valueIndex = fields.findIndex((f) => /数值|value|数据|val/i.test(f));
  let unitIndex = fields.findIndex((f) => /单位|unit/i.test(f));
  let directionIndex = fields.findIndex((f) => /方向|direction/i.test(f));

  if (timestampIndex === -1) timestampIndex = 0;
  if (valueIndex === -1) valueIndex = 1;
  if (unitIndex === -1) unitIndex = 2;
  if (directionIndex === -1) directionIndex = 3;

  dataLines.forEach((line, lineNum) => {
    try {
      const values = line.split(delimiter).map((v) => v.trim());
      if (values.length < 2) {
        errors.push(`第${lineNum + (hasHeader ? 2 : 1)}行: 数据格式不正确`);
        return;
      }

      const timestamp = parseTimestamp(values[timestampIndex]) || new Date();
      const rawValue = values[valueIndex] || '';
      const { value, unit } = parseValueAndUnit(rawValue);
      const rawUnit = unit || values[unitIndex] || '';
      const rawDirection = values[directionIndex] || parseDirection(rawValue) || undefined;
      
      const sensorType = detectSensorType(fields, values);

      logs.push({
        id: generateId(),
        timestamp,
        rawValue,
        rawUnit,
        rawDirection,
        source: `csv_line_${lineNum + (hasHeader ? 2 : 1)}`,
        lineNumber: lineNum + (hasHeader ? 2 : 1),
        sensorType,
      });
    } catch (e) {
      errors.push(`第${lineNum + (hasHeader ? 2 : 1)}行: 解析失败 - ${e}`);
    }
  });

  return { logs, errors, format: 'csv' };
}

export function parseJSON(content: string): ParseResult {
  const logs: RawSensorLog[] = [];
  const errors: string[] = [];

  try {
    const data = JSON.parse(content);
    const entries = Array.isArray(data) ? data : [data];

    entries.forEach((entry, index) => {
      try {
        const timestamp = parseTimestamp(entry.timestamp || entry.time || entry.date) || new Date();
        const rawValue = entry.value?.toString() || entry.data?.toString() || '';
        const { unit } = parseValueAndUnit(rawValue);
        
        logs.push({
          id: generateId(),
          timestamp,
          rawValue,
          rawUnit: unit || entry.unit || '',
          rawDirection: entry.direction || parseDirection(rawValue) || undefined,
          source: `json_entry_${index}`,
          lineNumber: index + 1,
          sensorType: entry.type || detectSensorType(Object.keys(entry), Object.values(entry).map((v) => String(v))),
        });
      } catch (e) {
        errors.push(`第${index + 1}条记录: 解析失败 - ${e}`);
      }
    });
  } catch (e) {
    errors.push(`JSON解析失败: ${e}`);
  }

  return { logs, errors, format: 'json' };
}

export function parseText(content: string): ParseResult {
  const lines = content.trim().split('\n');
  const logs: RawSensorLog[] = [];
  const errors: string[] = [];

  lines.forEach((line, lineNum) => {
    try {
      if (!line.trim()) return;

      const timestampMatch = line.match(/(\d{4}[-/\d\s:]+)/);
      const timestamp = timestampMatch ? parseTimestamp(timestampMatch[1]) : new Date();

      const { value, unit } = parseValueAndUnit(line);
      const direction = parseDirection(line);

      if (!isNaN(value) || direction) {
        const fields = line.split(/\s+/);
        const sensorType = detectSensorType(fields, fields);

        logs.push({
          id: generateId(),
          timestamp,
          rawValue: line,
          rawUnit: unit || '',
          rawDirection: direction || undefined,
          source: `text_line_${lineNum + 1}`,
          lineNumber: lineNum + 1,
          sensorType,
        });
      }
    } catch (e) {
      errors.push(`第${lineNum + 1}行: 解析失败 - ${e}`);
    }
  });

  return { logs, errors, format: 'text' };
}

export function parseLog(content: string, options: ParseOptions = {}): ParseResult {
  const format = detectFormat(content);

  switch (format) {
    case 'csv':
      return parseCSV(content, options);
    case 'json':
      return parseJSON(content);
    case 'text':
      return parseText(content);
    default:
      return parseText(content);
  }
}

export function formatLogForDisplay(log: RawSensorLog): string {
  return `[${log.timestamp.toLocaleString()}] ${log.rawValue}${log.rawUnit ? ' ' + log.rawUnit : ''}${log.rawDirection ? ' ' + log.rawDirection : ''}`;
}
