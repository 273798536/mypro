import fs from 'fs';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { createRun, updateRunStats } from './runService';
import { insertRecord } from './recordService';
import { detectAnomaliesForRecord } from './anomalyService';

export interface RawRecord {
  report_name: string;
  table_name: string;
  column_count?: number;
  row_count?: number;
  original_size_mb?: number;
  compressed_size_mb?: number;
  compression_ratio?: number;
  source_system?: string;
  owner?: string;
  backup_exists?: boolean;
}

export function importFile(filePath: string, originalName: string): { runId: number; recordCount: number } {
  const ext = originalName.split('.').pop()?.toLowerCase();
  let rawRecords: RawRecord[] = [];

  if (ext === 'csv') {
    rawRecords = parseCsv(filePath);
  } else if (ext === 'xlsx' || ext === 'xls') {
    rawRecords = parseExcel(filePath);
  } else {
    throw new Error('不支持的文件格式，仅支持 CSV 和 Excel');
  }

  if (rawRecords.length === 0) {
    throw new Error('文件中没有有效数据');
  }

  const run = createRun(originalName);

  for (const raw of rawRecords) {
    const originalSize = Number(raw.original_size_mb) || 0;
    const compressedSize = Number(raw.compressed_size_mb) || 0;
    const compressionRatio =
      raw.compression_ratio !== undefined
        ? Number(raw.compression_ratio)
        : originalSize > 0
        ? compressedSize / originalSize
        : 0;

    const recordId = insertRecord({
      run_id: run.id,
      report_name: raw.report_name || '未命名报表',
      table_name: raw.table_name || 'unknown_table',
      column_count: Number(raw.column_count) || 0,
      row_count: Number(raw.row_count) || 0,
      original_size_mb: originalSize,
      compressed_size_mb: compressedSize,
      compression_ratio: compressionRatio,
      source_system: raw.source_system || '',
      owner: raw.owner || '',
      backup_exists: typeof raw.backup_exists === 'boolean'
        ? raw.backup_exists
        : ['是', 'true', '1', 'yes', 'Y'].includes(String(raw.backup_exists).toLowerCase())
    });

    detectAnomaliesForRecord(recordId, {
      backup_exists: typeof raw.backup_exists === 'boolean'
        ? raw.backup_exists
        : ['是', 'true', '1', 'yes', 'Y'].includes(String(raw.backup_exists).toLowerCase()),
      compression_ratio: compressionRatio,
      owner: raw.owner || '',
      source_system: raw.source_system || '',
      report_name: raw.report_name || '未命名报表'
    });
  }

  updateRunStats(run.id);

  try {
    fs.unlinkSync(filePath);
  } catch {}

  return { runId: run.id, recordCount: rawRecords.length };
}

function parseCsv(filePath: string): RawRecord[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  return rows.map((row: any) => normalizeRow(row));
}

function parseExcel(filePath: string): RawRecord[] {
  const workbook = XLSX.readFile(filePath);
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
  return rows.map((row: any) => normalizeRow(row));
}

function normalizeRow(row: any): RawRecord {
  const get = (keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
    }
    return undefined;
  };

  return {
    report_name: String(get(['report_name', '报表名称', '报表名', 'name']) || ''),
    table_name: String(get(['table_name', '表名', '表名称', 'table']) || ''),
    column_count: Number(get(['column_count', '列数', '字段数']) || 0),
    row_count: Number(get(['row_count', '行数', '记录数']) || 0),
    original_size_mb: Number(get(['original_size_mb', '原始大小', '原始大小MB', 'size']) || 0),
    compressed_size_mb: Number(get(['compressed_size_mb', '压缩后大小', '压缩大小', 'compressed']) || 0),
    compression_ratio: Number(get(['compression_ratio', '压缩率', 'ratio']) || NaN),
    source_system: String(get(['source_system', '来源系统', '系统', 'source']) || ''),
    owner: String(get(['owner', '负责人', 'Owner', '所属人']) || ''),
    backup_exists: get(['backup_exists', '是否备份', '备份', 'has_backup']) as any
  };
}
