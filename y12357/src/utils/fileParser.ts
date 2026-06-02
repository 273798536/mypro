import Papa from 'papaparse';
import type { AngularVelocityRecord } from '../types';

export interface ParseResult {
  success: boolean;
  records: AngularVelocityRecord[];
  errors: string[];
}

interface RawCsvRecord {
  timestamp?: string;
  omega?: string;
  alpha?: string;
  torque?: string;
  time?: string;
  velocity?: string;
  acceleration?: string;
  force?: string;
}

export const parseJsonFile = (content: string, flywheelId: string): ParseResult => {
  const errors: string[] = [];
  const records: AngularVelocityRecord[] = [];

  try {
    const data = JSON.parse(content);
    const rawRecords = Array.isArray(data) ? data : [data];

    rawRecords.forEach((record, index) => {
      const timestamp = parseFloat(record.timestamp ?? record.time);
      const omega = parseFloat(record.omega ?? record.velocity);
      const alpha = parseFloat(record.alpha ?? record.acceleration);
      const torque = parseFloat(record.torque ?? record.force);

      if (isNaN(timestamp) || timestamp < 0) {
        errors.push(`第 ${index + 1} 行: 时间戳无效或为负数`);
        return;
      }
      if (isNaN(omega)) {
        errors.push(`第 ${index + 1} 行: 角速度 (omega) 无效`);
        return;
      }

      records.push({
        id: `vel-import-${Date.now()}-${index}`,
        flywheelId,
        timestamp: parseFloat(timestamp.toFixed(2)),
        omega: parseFloat(omega.toFixed(4)),
        alpha: isNaN(alpha) ? 0 : parseFloat(alpha.toFixed(4)),
        torque: isNaN(torque) ? 0 : parseFloat(torque.toFixed(2)),
        source: 'import',
        isValid: true,
      });
    });
  } catch (e) {
    errors.push(`JSON 解析失败: ${(e as Error).message}`);
  }

  return {
    success: errors.length === 0 && records.length > 0,
    records,
    errors,
  };
};

export const parseCsvFile = (content: string, flywheelId: string): ParseResult => {
  const errors: string[] = [];
  const records: AngularVelocityRecord[] = [];

  const result = Papa.parse<RawCsvRecord>(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (result.errors.length > 0) {
    errors.push(`CSV 格式错误: ${result.errors[0].message}`);
    return { success: false, records: [], errors };
  }

  result.data.forEach((row, index) => {
    const timestamp = parseFloat(row.timestamp ?? row.time ?? '');
    const omega = parseFloat(row.omega ?? row.velocity ?? '');
    const alpha = parseFloat(row.alpha ?? row.acceleration ?? '');
    const torque = parseFloat(row.torque ?? row.force ?? '');

    if (isNaN(timestamp) || timestamp < 0) {
      errors.push(`第 ${index + 2} 行: 时间戳无效或为负数`);
      return;
    }
    if (isNaN(omega)) {
      errors.push(`第 ${index + 2} 行: 角速度 (omega) 无效`);
      return;
    }

    records.push({
      id: `vel-import-${Date.now()}-${index}`,
      flywheelId,
      timestamp: parseFloat(timestamp.toFixed(2)),
      omega: parseFloat(omega.toFixed(4)),
      alpha: isNaN(alpha) ? 0 : parseFloat(alpha.toFixed(4)),
      torque: isNaN(torque) ? 0 : parseFloat(torque.toFixed(2)),
      source: 'import',
      isValid: true,
    });
  });

  return {
    success: errors.length === 0 && records.length > 0,
    records,
    errors,
  };
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

export const parseVelocityFile = async (
  file: File,
  flywheelId: string
): Promise<ParseResult> => {
  const content = await readFileAsText(file);
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.json')) {
    return parseJsonFile(content, flywheelId);
  } else if (fileName.endsWith('.csv')) {
    return parseCsvFile(content, flywheelId);
  } else {
    return {
      success: false,
      records: [],
      errors: ['不支持的文件格式，请上传 .json 或 .csv 文件'],
    };
  }
};
