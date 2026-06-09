import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { CVExperiment, ReagentRecord, SampleType, ExperimentStatus, RecordStatus, TemperaturePoint } from '../types';

function mapSampleType(raw: string): SampleType {
  const map: Record<string, SampleType> = {
    '空白': 'blank', 'blank': 'blank', '对照': 'blank', '空白对照': 'blank',
    '标准': 'standard', 'standard': 'standard', '标样': 'standard', '标准品': 'standard',
    '未知': 'unknown', 'unknown': 'unknown', '样品': 'unknown', '未知样': 'unknown',
    '质控': 'qc', 'qc': 'qc', 'QC': 'qc', '质量控制': 'qc',
  };
  return map[String(raw).trim()] || 'unknown';
}

function mapExperimentStatus(raw: string): ExperimentStatus {
  const map: Record<string, ExperimentStatus> = {
    '待测试': 'pending', 'pending': 'pending',
    '进行中': 'running', 'running': 'running', '测试中': 'running',
    '已完成': 'completed', 'completed': 'completed', '完成': 'completed',
    '失败': 'failed', 'failed': 'failed', '作废': 'failed',
    '已拦截': 'blocked', 'blocked': 'blocked',
  };
  return map[String(raw).trim()] || 'pending';
}

function mapRecordStatus(raw: string): RecordStatus {
  const map: Record<string, RecordStatus> = {
    '有效': 'valid', 'valid': 'valid', '在用': 'valid',
    '无效': 'invalid', 'invalid': 'invalid', '作废': 'invalid',
    '待审核': 'review_needed', 'review_needed': 'review_needed', '待确认': 'review_needed',
    '过期': 'expired', 'expired': 'expired', '已过期': 'expired',
  };
  return map[String(raw).trim()] || 'valid';
}

function parseTemperaturePoints(raw: string): TemperaturePoint[] | undefined {
  if (!raw) return undefined;
  try {
    const pairs = String(raw).split(/[;；]/);
    const points: TemperaturePoint[] = [];
    for (const pair of pairs) {
      const [time, temp] = pair.split(/[:,，]/).map(s => s.trim());
      if (time && temp) {
        const t = parseFloat(temp);
        if (!isNaN(t)) points.push({ time, temperature: t });
      }
    }
    return points.length ? points : undefined;
  } catch {
    return undefined;
  }
}

function parseRow(row: Record<string, unknown>, defaults: Record<string, unknown> = {}): Record<string, unknown> {
  const result: Record<string, unknown> = { ...defaults };
  for (const [k, v] of Object.entries(row)) {
    if (v !== null && v !== undefined && String(v).trim() !== '') {
      result[String(k).trim()] = v;
    }
  }
  return result;
}

function num(v: unknown, d = 0): number {
  if (v === null || v === undefined || v === '') return d;
  const n = parseFloat(String(v));
  return isNaN(n) ? d : n;
}

function str(v: unknown, d = ''): string {
  return v === null || v === undefined ? d : String(v).trim();
}

function parseExperiments(rows: Record<string, unknown>[]): CVExperiment[] {
  return rows.map((r, idx) => {
    const row = parseRow(r);
    return {
      experimentId: str(row['实验编号'] || row['experimentId'] || row['id'] || `CV-IMP-${String(idx + 1).padStart(3, '0')}`),
      batchId: str(row['批次号'] || row['batchId'] || row['批次'] || `BATCH-IMP-${idx}`),
      sampleId: str(row['样品编号'] || row['sampleId'] || `S-IMP-${idx}`),
      sampleName: str(row['样品名称'] || row['sampleName'] || row['样品'], '未命名样品'),
      sampleType: mapSampleType(str(row['样品类型'] || row['sampleType'] || row['类型'])),
      operator: str(row['操作人员'] || row['operator'] || row['操作员'], '未知'),
      experimentDate: str(row['实验日期'] || row['experimentDate'] || row['日期'], new Date().toISOString().slice(0, 10)),
      startTime: str(row['开始时间'] || row['startTime']) || undefined,
      endTime: str(row['结束时间'] || row['endTime']) || undefined,
      potentialStart: num(row['起始电位(V)'] || row['potentialStart'] || row['起始电位'], -0.6),
      potentialEnd: num(row['终止电位(V)'] || row['potentialEnd'] || row['终止电位'], 0.8),
      scanRate: num(row['扫描速率(mV/s)'] || row['scanRate'] || row['扫速'], 50),
      cycles: num(row['循环圈数'] || row['cycles'] || row['圈数'], 3),
      workingElectrode: str(row['工作电极'] || row['workingElectrode']) || undefined,
      referenceElectrode: str(row['参比电极'] || row['referenceElectrode']) || undefined,
      counterElectrode: str(row['对电极'] || row['counterElectrode']) || undefined,
      electrolyte: str(row['电解液'] || row['electrolyte']) || undefined,
      temperaturePoints: parseTemperaturePoints(str(row['温度记录'] || row['temperaturePoints'] || row['温度'])),
      peakCurrent: num(row['峰电流(A)'] || row['peakCurrent']) || undefined,
      peakPotential: num(row['峰电位(V)'] || row['peakPotential']) || undefined,
      status: mapExperimentStatus(str(row['状态'] || row['status'])),
      reagentIds: str(row['试剂编号'] || row['reagentIds'] || row['试剂']).split(/[,，;；]/).filter(Boolean),
      manualNote: str(row['备注'] || row['manualNote'] || row['人工备注']) || undefined,
    };
  });
}

function parseReagents(rows: Record<string, unknown>[]): ReagentRecord[] {
  return rows.map((r, idx) => {
    const row = parseRow(r);
    return {
      reagentId: str(row['试剂编号'] || row['reagentId'] || row['id'] || `R-IMP-${String(idx + 1).padStart(3, '0')}`),
      reagentName: str(row['试剂名称'] || row['reagentName'] || row['名称'], '未命名试剂'),
      batchNumber: str(row['批号'] || row['batchNumber'] || row['批次号'], '未知'),
      concentration: str(row['浓度'] || row['concentration'], '未知'),
      expiryDate: str(row['有效期'] || row['expiryDate'] || row['到期日']),
      openedDate: str(row['开封日期'] || row['openedDate']) || undefined,
      storageCondition: str(row['储存条件'] || row['storageCondition'] || row['存放'], '室温'),
      status: mapRecordStatus(str(row['状态'] || row['status'])),
      manualNote: str(row['备注'] || row['manualNote'] || row['人工备注']) || undefined,
      handoverRemark: str(row['转交备注'] || row['handoverRemark']) || undefined,
    };
  });
}

export function parseCSV(content: string): { experiments: CVExperiment[]; reagents: ReagentRecord[] } {
  const result = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  const rows = result.data;
  const experiments: CVExperiment[] = [];
  const reagents: ReagentRecord[] = [];
  for (const row of rows) {
    if ('实验编号' in row || 'experimentId' in row || '样品名称' in row) {
      experiments.push(...parseExperiments([row]));
    } else if ('试剂编号' in row || 'reagentId' in row || '试剂名称' in row) {
      reagents.push(...parseReagents([row]));
    }
  }
  if (experiments.length === 0 && reagents.length === 0) {
    experiments.push(...parseExperiments(rows));
  }
  return { experiments, reagents };
}

export function parseExcel(buffer: ArrayBuffer): { experiments: CVExperiment[]; reagents: ReagentRecord[] } {
  const wb = XLSX.read(buffer, { type: 'array' });
  const experiments: CVExperiment[] = [];
  const reagents: ReagentRecord[] = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
    const lower = sheetName.toLowerCase();
    if (lower.includes('试剂') || lower.includes('reagent')) {
      reagents.push(...parseReagents(rows));
    } else if (lower.includes('实验') || lower.includes('experiment') || lower.includes('记录') || lower.includes('cv')) {
      experiments.push(...parseExperiments(rows));
    } else {
      if (rows.length && ('试剂名称' in rows[0] || 'reagentName' in rows[0])) {
        reagents.push(...parseReagents(rows));
      } else {
        experiments.push(...parseExperiments(rows));
      }
    }
  }
  return { experiments, reagents };
}

export async function parseFile(file: File): Promise<{ experiments: CVExperiment[]; reagents: ReagentRecord[] }> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'csv') {
    const text = await file.text();
    return parseCSV(text);
  } else if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    return parseExcel(buffer);
  }
  throw new Error(`不支持的文件格式: ${ext}`);
}
