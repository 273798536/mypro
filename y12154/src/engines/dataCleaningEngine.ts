import type {
  ElevatorProfile,
  InspectionRecord,
  BadRow,
  BadRowErrorType,
  ColumnMapping,
  CleaningResult,
  DataTrace,
  ImportRawRow,
  SpeedPoint,
} from '../types';
import {
  generateId,
  parseNumber,
  isEmptyRow,
  isRemarkRow,
  parseSpeedCurve,
  parseDate,
  formatDate,
} from '../utils/helpers';

const REQUIRED_FIELDS: Array<keyof ColumnMapping> = [
  'elevatorNo',
  'inspectionDate',
  'inspector',
  'actualLoad',
  'actualSpeed',
  'brakeTime',
];

export function detectColumns(headers: string[]): ColumnMapping {
  const mapping: Partial<ColumnMapping> = {};
  
  const headerMap = new Map<string, string>();
  headers.forEach(h => {
    const normalized = h.toLowerCase().trim();
    headerMap.set(normalized, h);
    headerMap.set(normalized.replace(/[\s_()-]/g, ''), h);
  });
  
  const findMatch = (keywords: string[]): string | undefined => {
    for (const keyword of keywords) {
      const normalized = keyword.toLowerCase();
      for (const [key, original] of headerMap.entries()) {
        if (key.includes(normalized)) {
          return original;
        }
      }
    }
    return undefined;
  };
  
  mapping.elevatorNo = findMatch(['电梯编号', '梯号', '电梯号', 'elevator', 'lift', 'no']);
  mapping.inspectionDate = findMatch(['检验日期', '检测日期', '日期', 'date', 'inspection']);
  mapping.inspector = findMatch(['检验员', '检测人', '操作员', 'inspector', 'operator']);
  mapping.actualLoad = findMatch(['实际载荷', '载荷', '载重', 'load', 'weight']);
  mapping.actualSpeed = findMatch(['实际速度', '运行速度', '速度', 'speed', 'velocity']);
  mapping.brakeTime = findMatch(['制动时间', '刹车时间', 'braketime', 'brake']);
  mapping.speedCurveData = findMatch(['速度曲线', '曲线', 'speedcurve', 'curve']);
  mapping.inspectionRemark = findMatch(['检验备注', '备注', '说明', 'remark', 'note', 'comment']);
  mapping.ratedSpeed = findMatch(['额定速度', '标称速度', 'ratedspeed']);
  mapping.ratedLoad = findMatch(['额定载荷', '标称载荷', '额定载重', 'ratedload']);
  mapping.model = findMatch(['型号', 'model', 'type']);
  mapping.manufacturer = findMatch(['制造单位', '厂家', '厂商', 'manufacturer', 'factory']);
  mapping.location = findMatch(['使用地点', '地点', '位置', 'location', 'address', 'place']);
  
  return mapping as ColumnMapping;
}

export function validateMapping(mapping: ColumnMapping): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const field of REQUIRED_FIELDS) {
    if (!mapping[field]) {
      missing.push(field);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

function validateRow(
  row: ImportRawRow,
  mapping: ColumnMapping
): { valid: boolean; errors: BadRowErrorType[]; description: string } {
  const errors: BadRowErrorType[] = [];
  const missingFields: string[] = [];
  const invalidFields: string[] = [];
  
  for (const field of REQUIRED_FIELDS) {
    const colName = mapping[field];
    if (!colName) {
      missingFields.push(field);
      continue;
    }
    
    const value = row[colName];
    if (value === null || value === undefined || String(value).trim() === '') {
      missingFields.push(field);
      continue;
    }
    
    if (['actualLoad', 'actualSpeed', 'brakeTime'].includes(field)) {
      const num = parseNumber(value);
      if (num === null || num < 0) {
        invalidFields.push(field);
      }
    }
  }
  
  if (missingFields.length > 0) {
    errors.push('missing_col');
  }
  if (invalidFields.length > 0) {
    errors.push('invalid_value');
  }
  
  const descriptionParts: string[] = [];
  if (missingFields.length > 0) {
    descriptionParts.push(`缺失字段: ${missingFields.join(', ')}`);
  }
  if (invalidFields.length > 0) {
    descriptionParts.push(`无效值: ${invalidFields.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    description: descriptionParts.join('; '),
  };
}

function createElevatorProfile(
  row: ImportRawRow,
  mapping: ColumnMapping,
  existingProfiles: Map<string, ElevatorProfile>
): ElevatorProfile | null {
  const elevatorNo = String(row[mapping.elevatorNo] || '').trim();
  if (!elevatorNo) return null;
  
  if (existingProfiles.has(elevatorNo)) {
    return existingProfiles.get(elevatorNo)!;
  }
  
  const now = new Date().toISOString();
  const profile: ElevatorProfile = {
    id: generateId('elev_'),
    elevatorNo,
    model: String(row[mapping.model!] || '').trim() || '未知型号',
    ratedSpeed: parseNumber(row[mapping.ratedSpeed!]) || 1.6,
    ratedLoad: parseNumber(row[mapping.ratedLoad!]) || 1000,
    manufacturer: String(row[mapping.manufacturer!] || '').trim() || '未知厂家',
    installDate: formatDate(new Date()),
    location: String(row[mapping.location!] || '').trim() || '未知地点',
    createdAt: now,
    updatedAt: now,
  };
  
  existingProfiles.set(elevatorNo, profile);
  return profile;
}

function createInspectionRecord(
  row: ImportRawRow,
  mapping: ColumnMapping,
  elevator: ElevatorProfile
): InspectionRecord {
  const now = new Date().toISOString();
  
  const speedCurveData: SpeedPoint[] = mapping.speedCurveData
    ? parseSpeedCurve(row[mapping.speedCurveData])
    : generateDefaultSpeedCurve(
        parseNumber(row[mapping.actualSpeed]) || 0,
        parseNumber(row[mapping.brakeTime]) || 0
      );
  
  return {
    id: generateId('rec_'),
    elevatorId: elevator.id,
    elevatorNo: elevator.elevatorNo,
    ratedSpeed: elevator.ratedSpeed,
    ratedLoad: elevator.ratedLoad,
    speedCurve: speedCurveData,
    inspectionDate: formatDate(parseDate(String(row[mapping.inspectionDate] || ''))),
    inspector: String(row[mapping.inspector] || '').trim() || '未知检验员',
    actualLoad: parseNumber(row[mapping.actualLoad]) || 0,
    actualSpeed: parseNumber(row[mapping.actualSpeed]) || 0,
    brakeTime: parseNumber(row[mapping.brakeTime]) || 0,
    speedCurveData,
    inspectionRemark: String(row[mapping.inspectionRemark!] || '').trim(),
    sourceFile: row._sourceFile,
    rowNumber: row._rowNumber,
    dataStatus: 'normal',
    createdAt: now,
    updatedAt: now,
  };
}

function createBadRow(
  row: ImportRawRow,
  mapping: ColumnMapping,
  errors: BadRowErrorType[],
  description: string,
  existingErrorTypes: BadRowErrorType[] = []
): BadRow {
  const allErrors = [...new Set([...existingErrorTypes, ...errors])];
  
  return {
    id: generateId('bad_'),
    recordId: generateId('bad_rec_'),
    sourceFile: row._sourceFile,
    rowNumber: row._rowNumber,
    rowContent: JSON.stringify(row),
    rawData: row,
    errorTypes: allErrors,
    errorDescription: description,
    isManualReviewed: false,
    reviewed: false,
    reviewRemark: '',
    createdAt: new Date().toISOString(),
  };
}

function createTrace(
  recordId: string,
  step: 'raw' | 'cleaning',
  before: Record<string, any>,
  after: Record<string, any>,
  operation: string
): DataTrace {
  return {
    id: generateId('trace_'),
    recordId,
    traceStep: step,
    beforeData: before,
    afterData: after,
    operation,
    operator: 'system',
    operatedAt: new Date().toISOString(),
  };
}

function generateDefaultSpeedCurve(speed: number, brakeTime: number): SpeedPoint[] {
  if (speed <= 0 || brakeTime <= 0) return [];
  
  const points: SpeedPoint[] = [];
  const step = brakeTime / 20;
  
  for (let t = 0; t <= brakeTime + 0.1; t += step) {
    const currentSpeed = t >= brakeTime ? 0 : speed * (1 - t / brakeTime);
    points.push({
      time: Math.round(t * 1000) / 1000,
      speed: Math.round(currentSpeed * 1000) / 1000,
    });
  }
  
  return points;
}

export function cleanData(
  rawRows: ImportRawRow[],
  mapping: ColumnMapping
): CleaningResult {
  const normalRecords: InspectionRecord[] = [];
  const badRows: BadRow[] = [];
  const traces: DataTrace[] = [];
  const elevatorProfiles: ElevatorProfile[] = [];
  const profileMap = new Map<string, ElevatorProfile>();
  
  for (const row of rawRows) {
    const rowValues = Object.values(row).filter(v => v !== undefined && v !== '_rowNumber' && v !== '_sourceFile');
    
    if (isEmptyRow(rowValues)) {
      badRows.push(
        createBadRow(row, mapping, ['empty'], '空行数据', [])
      );
      continue;
    }
    
    if (isRemarkRow(rowValues)) {
      badRows.push(
        createBadRow(row, mapping, ['remark'], '备注说明行', [])
      );
      continue;
    }
    
    const rawTraceId = generateId('rec_');
    traces.push(
      createTrace(rawTraceId, 'raw', {}, { ...row }, '原始数据导入')
    );
    
    const validation = validateRow(row, mapping);
    if (!validation.valid) {
      badRows.push(
        createBadRow(row, mapping, validation.errors, validation.description)
      );
      traces.push(
        createTrace(rawTraceId, 'cleaning', { ...row }, { error: validation.description }, `数据清洗失败: ${validation.description}`)
      );
      continue;
    }
    
    const elevator = createElevatorProfile(row, mapping, profileMap);
    if (!elevator) {
      badRows.push(
        createBadRow(row, mapping, ['missing_col'], '无法识别电梯编号', [])
      );
      continue;
    }
    
    if (!profileMap.has(elevator.elevatorNo)) {
      elevatorProfiles.push(elevator);
    }
    
    const record = createInspectionRecord(row, mapping, elevator);
    record.id = rawTraceId;
    
    normalRecords.push(record);
    
    traces.push(
      createTrace(record.id, 'cleaning', { ...row }, { ...record }, '数据清洗完成，字段映射成功')
    );
  }
  
  return {
    normalRecords,
    badRows,
    traces,
    elevatorProfiles,
  };
}

export function parseFileContent(
  content: any[][],
  sourceFile: string
): { headers: string[]; rows: ImportRawRow[] } {
  if (content.length === 0) {
    return { headers: [], rows: [] };
  }
  
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(5, content.length); i++) {
    const row = content[i];
    if (row && row.some(cell => cell && String(cell).trim())) {
      headerRowIndex = i;
      break;
    }
  }
  
  const headers = content[headerRowIndex]
    .map(h => (h ? String(h).trim() : ''))
    .filter(Boolean);
  
  const rows: ImportRawRow[] = [];
  for (let i = headerRowIndex + 1; i < content.length; i++) {
    const row = content[i];
    if (!row) continue;
    
    const obj: ImportRawRow = {
      _rowNumber: i + 1,
      _sourceFile: sourceFile,
    };
    
    headers.forEach((header, idx) => {
      if (header) {
        obj[header] = row[idx];
      }
    });
    
    rows.push(obj);
  }
  
  return { headers, rows };
}
