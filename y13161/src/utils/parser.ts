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

function createLogEntry(
  timestamp: Date,
  rawValue: string,
  rawUnit: string,
  rawDirection: string | undefined,
  source: string,
  lineNumber: number,
  sensorType: 'wave_height' | 'wave_speed' | 'wave_direction' | 'temperature'
): RawSensorLog {
  return {
    id: generateId(),
    timestamp,
    rawValue,
    rawUnit,
    rawDirection,
    source,
    lineNumber,
    sensorType,
  };
}

const SENSOR_FIELD_PATTERNS: { type: 'wave_height' | 'wave_speed' | 'wave_direction' | 'temperature'; patterns: RegExp[] }[] = [
  { type: 'wave_height', patterns: [/高度|height|浪高|wave.*height|h(\d|_)?$/i] },
  { type: 'wave_speed', patterns: [/速度|speed|流速|wave.*speed|current|v(\d|_)?$/i] },
  { type: 'wave_direction', patterns: [/方向|direction|流向|wave.*direction|dir(\d|_)?$/i] },
  { type: 'temperature', patterns: [/温度|temp|水温|temperature|t(\d|_)?$/i] },
];

function detectSensorTypeFromField(fieldName: string): 'wave_height' | 'wave_speed' | 'wave_direction' | 'temperature' | null {
  const lower = fieldName.toLowerCase();
  for (const { type, patterns } of SENSOR_FIELD_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(lower)) {
        return type;
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
    : ['timestamp', 'wave_height', 'wave_speed', 'wave_direction', 'temperature'];

  const columnSensorTypes: ('wave_height' | 'wave_speed' | 'wave_direction' | 'temperature' | null)[] =
    fields.map((f) => detectSensorTypeFromField(f));

  const timestampIndex = fields.findIndex((f) => /时间|timestamp|time|date/i.test(f));

  dataLines.forEach((line, lineNum) => {
    try {
      const values = line.split(delimiter).map((v) => v.trim());
      if (values.length < 2) {
        errors.push(`第${lineNum + (hasHeader ? 2 : 1)}行: 数据格式不正确`);
        return;
      }

      const actualLineNum = lineNum + (hasHeader ? 2 : 1);
      const timestamp = timestampIndex >= 0 && values[timestampIndex]
        ? parseTimestamp(values[timestampIndex]) || new Date()
        : new Date();

      columnSensorTypes.forEach((sensorType, colIndex) => {
        if (!sensorType || colIndex === timestampIndex) return;

        const rawValue = values[colIndex] || '';
        if (!rawValue) return;

        const { value: parsedValue, unit } = parseValueAndUnit(rawValue);

        if (sensorType === 'wave_direction') {
          const direction = parseDirection(rawValue);
          if (direction) {
            logs.push(createLogEntry(
              timestamp,
              rawValue,
              '',
              direction,
              `csv_line_${actualLineNum}_${fields[colIndex]}`,
              actualLineNum,
              sensorType
            ));
          }
        } else {
          if (!isNaN(parsedValue)) {
            logs.push(createLogEntry(
              timestamp,
              rawValue,
              unit || '',
              undefined,
              `csv_line_${actualLineNum}_${fields[colIndex]}`,
              actualLineNum,
              sensorType
            ));
          }
        }
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
        const entryNum = index + 1;

        const entryKeys = Object.keys(entry);
        const hasMultiFields = entryKeys.some((k) => detectSensorTypeFromField(k) !== null);

        if (hasMultiFields) {
          for (const key of entryKeys) {
            const sensorType = detectSensorTypeFromField(key);
            if (!sensorType) continue;

            const rawValue = entry[key]?.toString() || '';
            if (!rawValue) continue;

            const { value: parsedValue, unit } = parseValueAndUnit(rawValue);

            if (sensorType === 'wave_direction') {
              const direction = parseDirection(rawValue);
              if (direction) {
                logs.push(createLogEntry(
                  timestamp,
                  rawValue,
                  '',
                  direction,
                  `json_entry_${entryNum}_${key}`,
                  entryNum,
                  sensorType
                ));
              }
            } else {
              if (!isNaN(parsedValue)) {
                logs.push(createLogEntry(
                  timestamp,
                  rawValue,
                  unit || entry.unit || '',
                  undefined,
                  `json_entry_${entryNum}_${key}`,
                  entryNum,
                  sensorType
                ));
              }
            }
          }
        } else {
          const rawValue = entry.value?.toString() || entry.data?.toString() || '';
          const { value: parsedValue, unit } = parseValueAndUnit(rawValue);
          const direction = entry.direction || parseDirection(rawValue) || undefined;
          const sensorType = entry.type || detectSensorType(entryKeys, Object.values(entry).map((v) => String(v))) || 'wave_height';

          if (sensorType === 'wave_direction') {
            if (direction) {
              logs.push(createLogEntry(
                timestamp,
                rawValue,
                '',
                direction,
                `json_entry_${entryNum}`,
                entryNum,
                sensorType
              ));
            }
          } else {
            if (!isNaN(parsedValue) || direction) {
              logs.push(createLogEntry(
                timestamp,
                rawValue,
                unit || entry.unit || '',
                direction,
                `json_entry_${entryNum}`,
                entryNum,
                sensorType
              ));
            }
          }
        }
      } catch (e) {
        errors.push(`第${index + 1}条记录: 解析失败 - ${e}`);
      }
    });
  } catch (e) {
    errors.push(`JSON解析失败: ${e}`);
  }

  return { logs, errors, format: 'json' };
}

const TEXT_KEYWORD_PATTERNS: { type: 'wave_height' | 'wave_speed' | 'wave_direction' | 'temperature'; keywords: string[] }[] = [
  { type: 'wave_height', keywords: ['波高', '浪高', 'height', 'wave_height'] },
  { type: 'wave_speed', keywords: ['流速', '速度', 'speed', 'current', 'wave_speed'] },
  { type: 'wave_direction', keywords: ['方向', '流向', 'direction', 'wave_direction'] },
  { type: 'temperature', keywords: ['水温', '温度', 'temp', 'temperature'] },
];

function parseTextLineSegments(line: string): { sensorType: 'wave_height' | 'wave_speed' | 'wave_direction' | 'temperature'; rawValue: string }[] {
  const segments: { sensorType: 'wave_height' | 'wave_speed' | 'wave_direction' | 'temperature'; rawValue: string }[] = [];
  const lowerLine = line.toLowerCase();

  for (const { type, keywords } of TEXT_KEYWORD_PATTERNS) {
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const idx = lowerLine.indexOf(keywordLower);
      if (idx !== -1) {
        const afterKeyword = line.slice(idx + keyword.length).trim();
        const match = afterKeyword.match(/^([^\s]+(?:\s+[^\s]+)?)/);
        if (match) {
          segments.push({ sensorType: type, rawValue: match[1].trim() });
        }
        break;
      }
    }
  }

  return segments;
}

export function parseText(content: string): ParseResult {
  const lines = content.trim().split('\n');
  const logs: RawSensorLog[] = [];
  const errors: string[] = [];

  lines.forEach((line, lineNum) => {
    try {
      if (!line.trim()) return;

      const actualLineNum = lineNum + 1;
      const timestampMatch = line.match(/(\d{4}[-/\d\s:]+)/);
      const timestamp = (timestampMatch && parseTimestamp(timestampMatch[1])) || new Date();

      const segments = parseTextLineSegments(line);

      if (segments.length > 0) {
        segments.forEach((seg, segIdx) => {
          const { value: parsedValue, unit } = parseValueAndUnit(seg.rawValue);

          if (seg.sensorType === 'wave_direction') {
            const direction = parseDirection(seg.rawValue);
            if (direction) {
              logs.push(createLogEntry(
                timestamp,
                seg.rawValue,
                '',
                direction,
                `text_line_${actualLineNum}_${segIdx}`,
                actualLineNum,
                seg.sensorType
              ));
            }
          } else {
            if (!isNaN(parsedValue)) {
              logs.push(createLogEntry(
                timestamp,
                seg.rawValue,
                unit || '',
                undefined,
                `text_line_${actualLineNum}_${segIdx}`,
                actualLineNum,
                seg.sensorType
              ));
            }
          }
        });
      } else {
        const { value, unit } = parseValueAndUnit(line);
        const direction = parseDirection(line);

        if (!isNaN(value) || direction) {
          const fields = line.split(/\s+/);
          const sensorType = detectSensorType(fields, fields);

          logs.push(createLogEntry(
            timestamp,
            line,
            unit || '',
            direction || undefined,
            `text_line_${actualLineNum}`,
            actualLineNum,
            sensorType
          ));
        }
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
