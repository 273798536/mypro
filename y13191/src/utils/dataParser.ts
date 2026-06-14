import Papa from 'papaparse';
import {
  SensorLog,
  FieldMappingResult,
  FieldMapping,
  FIELD_SYNONYMS,
} from '../types';
import { generateId } from '../data/sampleLogs';

const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const normalizeString = (s: string): string => {
  return s.toLowerCase().trim().replace(/[\s_\-]/g, '');
};

const findBestMatch = (field: string, synonyms: string[]): string | null => {
  const normalizedField = normalizeString(field);
  let bestMatch: string | null = null;
  let bestScore = Infinity;

  for (const synonym of synonyms) {
    const normalizedSynonym = normalizeString(synonym);
    if (normalizedField === normalizedSynonym) {
      return synonym;
    }
    const distance = levenshteinDistance(normalizedField, normalizedSynonym);
    const maxLength = Math.max(normalizedField.length, normalizedSynonym.length);
    const similarity = 1 - distance / maxLength;
    if (similarity >= 0.7 && distance < bestScore) {
      bestScore = distance;
      bestMatch = synonym;
    }
  }
  return bestMatch;
};

export const detectFieldMapping = (headers: string[]): FieldMappingResult => {
  const detectedFields: Record<string, string[]> = {};
  const mapping: Partial<FieldMapping> = {};
  const usedFields = new Set<string>();

  Object.keys(FIELD_SYNONYMS).forEach((key) => {
    const synonyms = FIELD_SYNONYMS[key];
    detectedFields[key] = [];
    for (const header of headers) {
      if (usedFields.has(header)) continue;
      const match = findBestMatch(header, synonyms);
      if (match) {
        detectedFields[key].push(header);
        if (!mapping[key as keyof FieldMapping]) {
          mapping[key as keyof FieldMapping] = header;
          usedFields.add(header);
        }
      }
    }
  });

  const unmatchedFields = headers.filter((h) => !usedFields.has(h));

  return {
    mapping: mapping as FieldMapping,
    detectedFields,
    unmatchedFields,
  };
};

const parseNumber = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(num) ? null : num;
};

const parseUnit = (value: string): string => {
  const str = String(value);
  if (str.includes('mΩ') || str.includes('毫欧')) return 'mΩ';
  if (str.includes('kΩ') || str.includes('KΩ') || str.includes('千欧')) return 'kΩ';
  if (str.includes('Ω') || str.includes('欧')) return 'Ω';
  return 'mΩ';
};

const parseManualJudgement = (remark: string | null): 'normal' | 'warning' | null => {
  if (!remark) return null;
  const lower = remark.toLowerCase();
  if (lower.includes('正常') || lower.includes('通过') || lower.includes('正常') || lower.includes('no warning') || lower.includes('pass')) {
    return 'normal';
  }
  if (lower.includes('异常') || lower.includes('预警') || lower.includes('警告') || lower.includes('确认为') || lower.includes('warning') || lower.includes('alert')) {
    return 'warning';
  }
  return null;
};

export const parseCSVData = (
  csvContent: string,
  fileName: string
): { logs: SensorLog[]; mappingResult: FieldMappingResult } => {
  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
    worker: false,
    download: false,
  });

  const headers = result.meta.fields || [];
  const mappingResult = detectFieldMapping(headers);
  const { mapping } = mappingResult;

  const logs: SensorLog[] = result.data.map((row: any, index: number) => {
    const resistanceValue = parseNumber(row[mapping.resistance]);
    const resistanceUnit = parseUnit(String(row[mapping.resistance] || ''));
    const rawResistance = resistanceUnit === 'mΩ' && resistanceValue !== null
      ? resistanceValue
      : resistanceValue;

    return {
      id: generateId(),
      rawLineNumber: index + 2,
      deviceId: String(row[mapping.deviceId] || ''),
      deviceIdField: mapping.deviceId,
      resistance: rawResistance,
      resistanceField: mapping.resistance,
      resistanceUnit: resistanceUnit || 'mΩ',
      temperature: parseNumber(row[mapping.temperature]),
      temperatureField: mapping.temperature,
      timestamp: String(row[mapping.timestamp] || ''),
      timestampField: mapping.timestamp,
      manualRemark: row[mapping.manualRemark]?.trim() || null,
      manualRemarkField: mapping.manualRemark,
      manualOperator: row[mapping.manualOperator]?.trim() || null,
      manualOperatorField: mapping.manualOperator,
      rawData: { ...row },
    };
  });

  return { logs, mappingResult };
};

export const parseJSONData = (
  jsonContent: string,
  fileName: string
): { logs: SensorLog[]; mappingResult: FieldMappingResult } => {
  let data: any[];
  try {
    data = JSON.parse(jsonContent);
  } catch (e) {
    throw new Error('JSON解析失败');
  }

  if (!Array.isArray(data)) {
    throw new Error('JSON数据必须是数组格式');
  }

  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  const mappingResult = detectFieldMapping(headers);
  const { mapping } = mappingResult;

  const logs: SensorLog[] = data.map((row: any, index: number) => {
    const resistanceValue = parseNumber(row[mapping.resistance]);
    const resistanceUnit = parseUnit(String(row[mapping.resistance] || ''));
    const rawResistance = resistanceUnit === 'mΩ' && resistanceValue !== null
      ? resistanceValue
      : resistanceValue;

    return {
      id: generateId(),
      rawLineNumber: index + 1,
      deviceId: String(row[mapping.deviceId] || ''),
      deviceIdField: mapping.deviceId,
      resistance: rawResistance,
      resistanceField: mapping.resistance,
      resistanceUnit: resistanceUnit || 'mΩ',
      temperature: parseNumber(row[mapping.temperature]),
      temperatureField: mapping.temperature,
      timestamp: String(row[mapping.timestamp] || ''),
      timestampField: mapping.timestamp,
      manualRemark: row[mapping.manualRemark]?.trim() || null,
      manualRemarkField: mapping.manualRemark,
      manualOperator: row[mapping.manualOperator]?.trim() || null,
      manualOperatorField: mapping.manualOperator,
      rawData: { ...row },
    };
  });

  return { logs, mappingResult };
};

export { parseManualJudgement };
