import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { insertBerth, getAllBerths, updateBerth } from '../db/repositories/berthRepo.js';
import { insertHandling, getAllHandlings, updateHandling } from '../db/repositories/handlingRepo.js';
import { insertContract, getAllContracts, updateContract } from '../db/repositories/contractRepo.js';
import { insertWeather, getAllWeathers, updateWeather } from '../db/repositories/weatherRepo.js';
import { validateBerth } from '../validators/berthValidator.js';
import { validateHandling } from '../validators/handlingValidator.js';
import { validateContract } from '../validators/contractValidator.js';
import { validateWeather } from '../validators/weatherValidator.js';
import type { DataType, ValidationIssue } from '@shared/types.js';
import type { BerthRow, HandlingRow, ContractRow, WeatherRow } from '../db/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const upload = multer({ dest: uploadDir });

function parseFile(filePath: string, originalName?: string): Record<string, unknown>[] {
  const ext = (originalName ? path.extname(originalName) : path.extname(filePath)).toLowerCase();

  if (ext === '.csv') {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = Papa.parse<Record<string, unknown>>(content, { header: true, skipEmptyLines: true, dynamicTyping: true });
    return result.data;
  }

  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  }

  throw new Error(`不支持的文件格式: ${ext}`);
}

function normalizeHeaders(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(row => {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
      normalized[cleanKey] = value;
    }
    return normalized;
  });
}

function mapBerthRow(row: Record<string, unknown>): Omit<BerthRow, 'id' | 'created_at'> {
  return {
    vessel_name: String(row.vessel_name || row.ship_name || row.船名 || ''),
    port: String(row.port || row.港口 || ''),
    berth_start: row.berth_start || row.berth_start_time || row.靠泊开始 ? String(row.berth_start || row.berth_start_time || row.靠泊开始) : null,
    berth_end: row.berth_end || row.berth_end_time || row.靠泊结束 ? String(row.berth_end || row.berth_end_time || row.靠泊结束) : null,
    notice_time: row.notice_time || row.nor_time || row.通知时间 ? String(row.notice_time || row.nor_time || row.通知时间) : null,
    free_period_end: row.free_period_end || row.免费期结束 ? String(row.free_period_end || row.免费期结束) : null,
    voyage_number: row.voyage_number || row.voyage || row.航次 ? String(row.voyage_number || row.voyage || row.航次) : null,
  };
}

function mapHandlingRow(row: Record<string, unknown>): Omit<HandlingRow, 'id' | 'created_at'> {
  return {
    berth_id: String(row.berth_id || row.靠泊ID || ''),
    handling_start: row.handling_start || row.装卸开始 ? String(row.handling_start || row.装卸开始) : null,
    handling_end: row.handling_end || row.装卸结束 ? String(row.handling_end || row.装卸结束) : null,
    operation_type: row.operation_type || row.操作类型 ? String(row.operation_type || row.操作类型) : null,
    quantity: typeof row.quantity === 'number' ? row.quantity : (row.数量 ? Number(row.数量) : null),
    pause_hours: typeof row.pause_hours === 'number' ? row.pause_hours : (row.暂停小时 ? Number(row.暂停小时) : 0),
    pause_reason: row.pause_reason || row.暂停原因 ? String(row.pause_reason || row.暂停原因) : null,
  };
}

function mapContractRow(row: Record<string, unknown>): Omit<ContractRow, 'id' | 'created_at'> {
  return {
    vessel_name: String(row.vessel_name || row.ship_name || row.船名 || ''),
    port: String(row.port || row.港口 || ''),
    free_hours: typeof row.free_hours === 'number' ? row.free_hours : (row.免费小时 ? Number(row.免费小时) : null),
    currency: String(row.currency || row.币种 || 'USD'),
    rate_tier1: typeof row.rate_tier1 === 'number' ? row.rate_tier1 : (row['一档费率'] != null ? Number(row['一档费率']) : (row['第一档费率'] != null ? Number(row['第一档费率']) : null)),
    rate_tier1_max_days: typeof row.rate_tier1_max_days === 'number' ? row.rate_tier1_max_days : (row['一档天数'] != null ? Number(row['一档天数']) : (row['第一档最大天数'] != null ? Number(row['第一档最大天数']) : null)),
    rate_tier2: typeof row.rate_tier2 === 'number' ? row.rate_tier2 : (row['二档费率'] != null ? Number(row['二档费率']) : (row['第二档费率'] != null ? Number(row['第二档费率']) : null)),
    rate_tier2_max_days: typeof row.rate_tier2_max_days === 'number' ? row.rate_tier2_max_days : (row['二档天数'] != null ? Number(row['二档天数']) : (row['第二档最大天数'] != null ? Number(row['第二档最大天数']) : null)),
    rate_tier3: typeof row.rate_tier3 === 'number' ? row.rate_tier3 : (row['三档费率'] != null ? Number(row['三档费率']) : (row['第三档费率'] != null ? Number(row['第三档费率']) : null)),
    valid_from: row.valid_from || row.生效日期 ? String(row.valid_from || row.生效日期) : null,
    valid_to: row.valid_to || row.失效日期 ? String(row.valid_to || row.失效日期) : null,
  };
}

function mapWeatherRow(row: Record<string, unknown>): Omit<WeatherRow, 'id' | 'created_at'> {
  return {
    berth_id: row.berth_id || row.靠泊ID ? String(row.berth_id || row.靠泊ID) : null,
    vessel_name: row.vessel_name || row.船名 ? String(row.vessel_name || row.船名) : null,
    port: row.port || row.港口 ? String(row.port || row.港口) : null,
    weather_start: row.weather_start || row.天气开始 ? String(row.weather_start || row.天气开始) : null,
    weather_end: row.weather_end || row.天气结束 ? String(row.weather_end || row.天气结束) : null,
    weather_type: row.weather_type || row.天气类型 ? String(row.weather_type || row.天气类型) : null,
    evidence: row.evidence || row.证据 ? String(row.evidence || row.证据) : null,
  };
}

export function processUpload(filePath: string, type: DataType, originalName?: string): {
  success: boolean;
  recordCount: number;
  warnings: ValidationIssue[];
  missingFields: string[];
} {
  const rawRows = parseFile(filePath, originalName);
  const rows = normalizeHeaders(rawRows);
  const warnings: ValidationIssue[] = [];
  const missingFields: string[] = [];

  let recordCount = 0;

  switch (type) {
    case 'berth': {
      const records = rows.map(mapBerthRow);
      for (const rec of records) {
        insertBerth(rec);
        recordCount++;
      }
      const allBerths = getAllBerths();
      warnings.push(...validateBerth(allBerths));
      for (const w of warnings) {
        if (!missingFields.includes(w.field)) missingFields.push(w.field);
      }
      break;
    }
    case 'handling': {
      const allBerths = getAllBerths();
      const records = rows.map(mapHandlingRow).map(rec => {
        const existingBerth = allBerths.find(b => b.id === rec.berth_id);
        if (!existingBerth && rec.berth_id) {
          const byVoyage = allBerths.find(b => b.voyage_number === rec.berth_id);
          if (byVoyage) {
            return { ...rec, berth_id: byVoyage.id };
          }
        }
        if (!existingBerth) {
          const berthByTime = allBerths[0];
          if (berthByTime) {
            return { ...rec, berth_id: berthByTime.id };
          }
        }
        return rec;
      });
      for (const rec of records) {
        try {
          insertHandling(rec);
          recordCount++;
        } catch {
          warnings.push({
            row: recordCount + 1,
            field: 'berth_id',
            severity: 'error',
            message: `装卸记录无法关联靠泊记录 (${rec.berth_id})`,
            suggestion: '请先导入靠泊记录，或确保靠泊ID正确',
          });
        }
      }
      const allHandlings = getAllHandlings();
      warnings.push(...validateHandling(allHandlings));
      for (const w of warnings) {
        if (!missingFields.includes(w.field)) missingFields.push(w.field);
      }
      break;
    }
    case 'contract': {
      const records = rows.map(mapContractRow);
      for (const rec of records) {
        insertContract(rec);
        recordCount++;
      }
      const allContracts = getAllContracts();
      warnings.push(...validateContract(allContracts));
      for (const w of warnings) {
        if (!missingFields.includes(w.field)) missingFields.push(w.field);
      }
      break;
    }
    case 'weather': {
      const records = rows.map(mapWeatherRow);
      for (const rec of records) {
        insertWeather(rec);
        recordCount++;
      }
      const allWeathers = getAllWeathers();
      warnings.push(...validateWeather(allWeathers));
      for (const w of warnings) {
        if (!missingFields.includes(w.field)) missingFields.push(w.field);
      }
      break;
    }
  }

  try { fs.unlinkSync(filePath); } catch {}

  return { success: true, recordCount, warnings, missingFields };
}

export function validateData(type: DataType): { valid: boolean; totalRows: number; issues: ValidationIssue[] } {
  let issues: ValidationIssue[] = [];
  let totalRows = 0;

  switch (type) {
    case 'berth': {
      const records = getAllBerths();
      totalRows = records.length;
      issues = validateBerth(records);
      break;
    }
    case 'handling': {
      const records = getAllHandlings();
      totalRows = records.length;
      issues = validateHandling(records);
      break;
    }
    case 'contract': {
      const records = getAllContracts();
      totalRows = records.length;
      issues = validateContract(records);
      break;
    }
    case 'weather': {
      const records = getAllWeathers();
      totalRows = records.length;
      issues = validateWeather(records);
      break;
    }
  }

  return { valid: issues.filter(i => i.severity === 'error').length === 0, totalRows, issues };
}

export function patchRecord(type: DataType, rowId: string, updates: Record<string, unknown>): {
  success: boolean;
  validation: { valid: boolean; issues: Array<{ field: string; message: string }> };
} {
  let success = false;

  switch (type) {
    case 'berth':
      success = updateBerth(rowId, updates as Partial<BerthRow>);
      break;
    case 'handling':
      success = updateHandling(rowId, updates as Partial<HandlingRow>);
      break;
    case 'contract':
      success = updateContract(rowId, updates as Partial<ContractRow>);
      break;
    case 'weather':
      success = updateWeather(rowId, updates as Partial<WeatherRow>);
      break;
  }

  const validationResult = validateData(type);

  return {
    success,
    validation: {
      valid: validationResult.issues.filter(i => i.severity === 'error').length === 0,
      issues: validationResult.issues
        .filter(i => i.severity === 'error')
        .map(i => ({ field: i.field, message: i.message })),
    },
  };
}

export function getRecords(type: DataType): unknown[] {
  switch (type) {
    case 'berth': return getAllBerths();
    case 'handling': return getAllHandlings();
    case 'contract': return getAllContracts();
    case 'weather': return getAllWeathers();
    default: return [];
  }
}
