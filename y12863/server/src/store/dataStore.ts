import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  AnchorageRecord,
  ImportBatch,
  PhotoRef,
  ReviewHistory,
  DataStatus,
  ReviewStatus,
} from '../types';
import { calculateDrift } from '../services/driftCalculator';

const DATA_DIR = path.resolve(__dirname, '../../data');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const BATCHES_FILE = path.join(DATA_DIR, 'batches.json');
const REVIEW_HISTORY_FILE = path.join(DATA_DIR, 'review_history.json');
const PHOTOS_DIR = path.join(DATA_DIR, 'photos');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

function ensureDirs() {
  for (const dir of [DATA_DIR, PHOTOS_DIR, UPLOADS_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

function readJson<T>(file: string, fallback: T): T {
  ensureDirs();
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  ensureDirs();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

export function getAllRecords(): AnchorageRecord[] {
  return readJson<AnchorageRecord[]>(RECORDS_FILE, []);
}

export function getRecordById(id: string): AnchorageRecord | undefined {
  return getAllRecords().find((r) => r.id === id);
}

export function saveRecords(records: AnchorageRecord[]) {
  writeJson(RECORDS_FILE, records);
}

export function getAllBatches(): ImportBatch[] {
  return readJson<ImportBatch[]>(BATCHES_FILE, []);
}

export function saveBatches(batches: ImportBatch[]) {
  writeJson(BATCHES_FILE, batches);
}

export function getReviewHistory(recordId: string): ReviewHistory[] {
  const all = readJson<ReviewHistory[]>(REVIEW_HISTORY_FILE, []);
  return all.filter((h) => h.recordId === recordId);
}

export function getAllReviewHistory(): ReviewHistory[] {
  return readJson<ReviewHistory[]>(REVIEW_HISTORY_FILE, []);
}

export function saveReviewHistory(history: ReviewHistory[]) {
  writeJson(REVIEW_HISTORY_FILE, history);
}

export function getPhotosDir(): string {
  ensureDirs();
  return PHOTOS_DIR;
}

export function getUploadsDir(): string {
  ensureDirs();
  return UPLOADS_DIR;
}

function normalizeKey(
  shipName: string,
  typhoonName: string,
  anchorageName: string,
  reportDate: string
): string {
  return [shipName.trim(), typhoonName.trim(), anchorageName.trim(), reportDate.trim()]
    .join('|')
    .toLowerCase();
}

function parseNumber(v: unknown): number {
  if (v === null || v === undefined || v === '') return NaN;
  if (typeof v === 'number') return v;
  const s = String(v).trim().replace(/[°\s]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? NaN : n;
}

function parseDate(v: unknown): string {
  if (!v) return '';
  if (v instanceof Date) {
    return v.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const match = s.match(/(\d{4})[-\/年.](\d{1,2})[-\/月.](\d{1,2})/);
  if (match) {
    const [_, y, m, d] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return s;
}

interface RawRow {
  [key: string]: unknown;
}

function findField(row: RawRow, candidates: string[]): unknown {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const found = keys.find(
      (k) => k.toLowerCase().replace(/[\s_]/g, '') === c.toLowerCase().replace(/[\s_]/g, '')
    );
    if (found) return row[found];
  }
  return undefined;
}

export function parseFile(filePath: string): RawRow[] {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv') {
    const content = fs.readFileSync(filePath, 'utf8');
    const result = Papa.parse<RawRow>(content, { header: true, skipEmptyLines: true });
    return result.data;
  }
  if (ext === '.xlsx' || ext === '.xls') {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<RawRow>(ws);
  }
  throw new Error('不支持的文件格式，仅支持 CSV、XLS、XLSX');
}

export function buildRecordFromRow(
  row: RawRow,
  rowIndex: number,
  sourceFile: string,
  batchId: string
): { record: AnchorageRecord; error: string | null } {
  const shipName = String(findField(row, ['shipName', 'ship_name', '船名', '船舶名称']) || '').trim();
  const anchorageName = String(
    findField(row, ['anchorageName', 'anchorage_name', '锚地名', '锚地名称', '避风锚地']) || ''
  ).trim();
  const typhoonName = String(
    findField(row, ['typhoonName', 'typhoon_name', '台风名', '台风名称', '台风编号']) || ''
  ).trim();
  const reportDate = parseDate(
    findField(row, ['reportDate', 'report_date', '日期', '上报日期', '报告日期', '记录日期'])
  );
  const recordNo = String(
    findField(row, ['recordNo', 'record_no', '记录编号', '编号', '流水号']) || ''
  ).trim();

  const reportedLat = parseNumber(
    findField(row, ['reportedLat', 'reported_lat', '上报纬度', '上报lat', 'lat1', '预报纬度'])
  );
  const reportedLng = parseNumber(
    findField(row, ['reportedLng', 'reported_lng', '上报经度', '上报lng', 'lng1', '预报经度'])
  );
  const actualLat = parseNumber(
    findField(row, ['actualLat', 'actual_lat', '实际纬度', '实际lat', 'lat2', '实测纬度'])
  );
  const actualLng = parseNumber(
    findField(row, ['actualLng', 'actual_lng', '实际经度', '实际lng', 'lng2', '实测经度'])
  );

  if (!shipName || !anchorageName || !typhoonName || !reportDate) {
    return {
      record: {} as AnchorageRecord,
      error: `第${rowIndex + 1}行：缺少必填字段（船名/锚地名/台风名/日期）`,
    };
  }

  const drift = calculateDrift(reportedLat, reportedLng, actualLat, actualLng);
  const driftNoteParts: string[] = [];
  driftNoteParts.push(`公式：${drift.formula}`);
  driftNoteParts.push(`适用范围：${drift.scope}`);
  if (drift.failReason) driftNoteParts.push(drift.failReason);
  driftNoteParts.push(
    `输入：上报(${drift.input.lat1},${drift.input.lng1}) 实际(${drift.input.lat2},${drift.input.lng2})`
  );

  let status: DataStatus = 'available';
  if (!drift.applicable || isNaN(reportedLat) || isNaN(reportedLng) || isNaN(actualLat) || isNaN(actualLng)) {
    status = 'pending';
  }
  if (
    drift.applicable &&
    (Math.abs(reportedLat) < 0.0001 ||
      Math.abs(reportedLng) < 0.0001 ||
      Math.abs(actualLat) < 0.0001 ||
      Math.abs(actualLng) < 0.0001)
  ) {
    status = 'recollect';
  }

  const record: AnchorageRecord = {
    id: uuidv4(),
    recordNo: recordNo || `${typhoonName}-${shipName}-${reportDate}`,
    shipName,
    anchorageName,
    typhoonName,
    reportDate,
    reportedLat,
    reportedLng,
    actualLat,
    actualLng,
    driftDistance: drift.applicable ? drift.distance : null,
    driftCalculationNote: driftNoteParts.join('\n'),
    status,
    reviewStatus: 'pending',
    photos: [],
    sourceFile: path.basename(sourceFile),
    sourceRow: rowIndex + 2,
    importedAt: new Date().toISOString(),
    importBatchId: batchId,
  };

  return { record, error: null };
}

export function importRecordsFromFile(filePath: string, operator: string): {
  batch: ImportBatch;
  imported: AnchorageRecord[];
  duplicates: AnchorageRecord[];
  errors: string[];
} {
  const batchId = uuidv4();
  const rows = parseFile(filePath);
  const existing = getAllRecords();
  const existingKeys = new Set(
    existing.map((r) => normalizeKey(r.shipName, r.typhoonName, r.anchorageName, r.reportDate))
  );

  const imported: AnchorageRecord[] = [];
  const duplicates: AnchorageRecord[] = [];
  const errors: string[] = [];

  rows.forEach((row, i) => {
    const { record, error } = buildRecordFromRow(row, i, filePath, batchId);
    if (error) {
      errors.push(error);
      return;
    }
    const key = normalizeKey(record.shipName, record.typhoonName, record.anchorageName, record.reportDate);
    if (existingKeys.has(key)) {
      duplicates.push(record);
      return;
    }
    existingKeys.add(key);
    imported.push(record);
  });

  saveRecords([...existing, ...imported]);
  const batch: ImportBatch = {
    id: batchId,
    fileName: path.basename(filePath),
    importedAt: new Date().toISOString(),
    recordCount: imported.length,
    duplicateCount: duplicates.length,
    operator,
  };
  const batches = getAllBatches();
  batches.push(batch);
  saveBatches(batches);

  return { batch, imported, duplicates, errors };
}

export function updateRecordStatus(
  id: string,
  status: DataStatus | null,
  reviewStatus: ReviewStatus | null,
  reviewer: string,
  remark: string
): AnchorageRecord | null {
  const records = getAllRecords();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const original = records[idx];
  const updated: AnchorageRecord = { ...original };
  const allHistory = getAllReviewHistory();

  if (status && status !== original.status) {
    allHistory.push({
      id: uuidv4(),
      recordId: id,
      fieldName: 'status',
      oldValue: original.status,
      newValue: status,
      reviewer,
      remark,
      reviewedAt: new Date().toISOString(),
      fromStatus: original.reviewStatus,
      toStatus: reviewStatus || original.reviewStatus,
    });
    updated.status = status;
  }

  if (reviewStatus && reviewStatus !== original.reviewStatus) {
    allHistory.push({
      id: uuidv4(),
      recordId: id,
      fieldName: 'reviewStatus',
      oldValue: original.reviewStatus,
      newValue: reviewStatus,
      reviewer,
      remark,
      reviewedAt: new Date().toISOString(),
      fromStatus: original.reviewStatus,
      toStatus: reviewStatus,
    });
    updated.reviewStatus = reviewStatus;
  }

  records[idx] = updated;
  saveRecords(records);
  saveReviewHistory(allHistory);
  return updated;
}

export function updateRecordDrift(
  id: string,
  reportedLat: number,
  reportedLng: number,
  actualLat: number,
  actualLng: number,
  reviewer: string,
  remark: string
): AnchorageRecord | null {
  const records = getAllRecords();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const original = records[idx];
  const drift = calculateDrift(reportedLat, reportedLng, actualLat, actualLng);
  const driftNoteParts: string[] = [];
  driftNoteParts.push(`公式：${drift.formula}`);
  driftNoteParts.push(`适用范围：${drift.scope}`);
  if (drift.failReason) driftNoteParts.push(drift.failReason);
  driftNoteParts.push(
    `输入：上报(${drift.input.lat1},${drift.input.lng1}) 实际(${drift.input.lat2},${drift.input.lng2})`
  );
  driftNoteParts.push(`人工修正：${reviewer} @ ${new Date().toISOString()}`);
  if (remark) driftNoteParts.push(`备注：${remark}`);

  const allHistory = getAllReviewHistory();
  allHistory.push({
    id: uuidv4(),
    recordId: id,
    fieldName: 'coordinates',
    oldValue: `(${original.reportedLat},${original.reportedLng})→(${original.actualLat},${original.actualLng})`,
    newValue: `(${reportedLat},${reportedLng})→(${actualLat},${actualLng})`,
    reviewer,
    remark,
    reviewedAt: new Date().toISOString(),
    fromStatus: original.reviewStatus,
    toStatus: original.reviewStatus,
  });
  saveReviewHistory(allHistory);

  const updated: AnchorageRecord = {
    ...original,
    reportedLat,
    reportedLng,
    actualLat,
    actualLng,
    driftDistance: drift.applicable ? drift.distance : null,
    driftCalculationNote: driftNoteParts.join('\n'),
    status: drift.applicable ? original.status : 'pending',
  };
  records[idx] = updated;
  saveRecords(records);
  return updated;
}

export function attachPhoto(recordId: string, fileName: string, filePath: string, remark: string): AnchorageRecord | null {
  const records = getAllRecords();
  const idx = records.findIndex((r) => r.id === recordId);
  if (idx < 0) return null;
  const photo: PhotoRef = {
    id: uuidv4(),
    fileName,
    filePath,
    uploadTime: new Date().toISOString(),
    remark,
  };
  records[idx] = {
    ...records[idx],
    photos: [...records[idx].photos, photo],
  };
  saveRecords(records);
  return records[idx];
}

export function generateMonthlyReport(month: string) {
  const all = getAllRecords();
  const filtered = all.filter((r) => r.reportDate.startsWith(month));
  const driftDistances = filtered
    .map((r) => r.driftDistance)
    .filter((d): d is number => d !== null && !isNaN(d));
  const avg = driftDistances.length
    ? Number((driftDistances.reduce((a, b) => a + b, 0) / driftDistances.length).toFixed(3))
    : null;
  return {
    month,
    generatedAt: new Date().toISOString(),
    totalRecords: filtered.length,
    availableCount: filtered.filter((r) => r.status === 'available').length,
    pendingCount: filtered.filter((r) => r.status === 'pending').length,
    recollectCount: filtered.filter((r) => r.status === 'recollect').length,
    approvedCount: filtered.filter((r) => r.reviewStatus === 'approved').length,
    pendingReviewCount: filtered.filter((r) => r.reviewStatus === 'pending').length,
    avgDriftDistance: avg,
    records: filtered,
  };
}

export function exportReportAsCsv(month: string): string {
  const report = generateMonthlyReport(month);
  const rows = report.records.map((r) => ({
    记录编号: r.recordNo,
    船名: r.shipName,
    锚地名: r.anchorageName,
    台风名: r.typhoonName,
    报告日期: r.reportDate,
    上报纬度: r.reportedLat,
    上报经度: r.reportedLng,
    实际纬度: r.actualLat,
    实际经度: r.actualLng,
    漂移距离_海里: r.driftDistance ?? '',
    数据状态: r.status === 'available' ? '可用' : r.status === 'pending' ? '暂缓' : '需重新采集',
    复核状态: r.reviewStatus === 'approved' ? '通过' : r.reviewStatus === 'pending' ? '待确认' : '驳回',
    关联照片数: r.photos.length,
    计算说明: r.driftCalculationNote ? r.driftCalculationNote.replace(/\n/g, ' | ') : '',
    来源文件: r.sourceFile,
    来源行号: r.sourceRow,
  }));
  const summary = [
    { 记录编号: `月报汇总 - ${month}`, 船名: `总记录:${report.totalRecords}`, 锚地名: `可用:${report.availableCount}`, 台风名: `暂缓:${report.pendingCount}`, 报告日期: `重采:${report.recollectCount}`, 上报纬度: `通过:${report.approvedCount}`, 上报经度: `待确认:${report.pendingReviewCount}`, 实际纬度: `平均漂移(海里):${report.avgDriftDistance ?? ''}`, 实际经度: '', 漂移距离_海里: '', 数据状态: '', 复核状态: '', 关联照片数: '', 计算说明: '', 来源文件: '', 来源行号: '' },
  ];
  return Papa.unparse([...summary, ...rows]);
}
