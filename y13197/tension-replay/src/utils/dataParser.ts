import { TensionRecord, RawSensorLog, ProcessingStatus, FieldMapping } from '../types';
import { mapField, detectTensionUnit, normalizeValue, DEFAULT_FIELD_MAPPING } from './fieldMapper';

let recordIdCounter = 0;

function generateRecordId(): string {
  recordIdCounter += 1;
  return `rec_${Date.now()}_${recordIdCounter}`;
}

export function parseSensorLog(
  rawLog: RawSensorLog,
  sourceFile: string,
  mapping?: FieldMapping
): TensionRecord {
  const useMapping = mapping || DEFAULT_FIELD_MAPPING;
  
  const sourceFields: string[] = [];
  
  const { value: tsValue, sourceField: tsField } = mapField(rawLog, 'timestamp', useMapping);
  const timestamp = normalizeValue(tsValue, 'timestamp') as number || Date.now();
  if (tsField) sourceFields.push(tsField);
  
  const { value: materialIdValue, sourceField: matIdField } = mapField(rawLog, 'materialId', useMapping);
  const materialId = String(normalizeValue(materialIdValue, 'string') || 'UNKNOWN');
  if (matIdField) sourceFields.push(matIdField);
  
  const { value: materialNameValue, sourceField: matNameField } = mapField(rawLog, 'materialName', useMapping);
  const materialName = String(normalizeValue(materialNameValue, 'string') || '未知材料');
  if (matNameField) sourceFields.push(matNameField);
  
  const { value: tensionValue, sourceField: tensionField } = mapField(rawLog, 'tension', useMapping);
  const tension = normalizeValue(tensionValue, 'number') as number || 0;
  if (tensionField) sourceFields.push(tensionField);
  
  const tensionUnit = detectTensionUnit(tension, rawLog, useMapping);
  
  const { value: pulleyValue, sourceField: pulleyField } = mapField(rawLog, 'pulleyGroupId', useMapping);
  const pulleyGroupId = String(normalizeValue(pulleyValue, 'string') || 'PG-01');
  if (pulleyField) sourceFields.push(pulleyField);
  
  const { value: speedValue, sourceField: speedField } = mapField(rawLog, 'speed', useMapping);
  const speed = normalizeValue(speedValue, 'number') as number || 0;
  if (speedField) sourceFields.push(speedField);
  
  const { value: tempValue, sourceField: tempField } = mapField(rawLog, 'temperature', useMapping);
  const temperature = normalizeValue(tempValue, 'number') as number || 25;
  if (tempField) sourceFields.push(tempField);
  
  return {
    id: generateRecordId(),
    timestamp,
    materialId,
    materialName,
    tension,
    tensionUnit,
    pulleyGroupId,
    speed,
    temperature,
    sourceFile,
    sourceFields,
    processingStatus: ProcessingStatus.PENDING,
    statusReason: '待分析',
    isJumpPoint: false,
    rawData: rawLog,
  };
}

export function parseSensorLogs(
  rawLogs: RawSensorLog[],
  sourceFile: string,
  mapping?: FieldMapping
): TensionRecord[] {
  return rawLogs.map(log => parseSensorLog(log, sourceFile, mapping));
}

export function parseJsonString(jsonStr: string, sourceFile: string): TensionRecord[] {
  try {
    const data = JSON.parse(jsonStr);
    if (Array.isArray(data)) {
      return parseSensorLogs(data, sourceFile);
    }
    if (Array.isArray(data.records)) {
      return parseSensorLogs(data.records, sourceFile);
    }
    if (Array.isArray(data.data)) {
      return parseSensorLogs(data.data, sourceFile);
    }
    return [parseSensorLog(data, sourceFile)];
  } catch (e) {
    console.error('JSON 解析失败:', e);
    return [];
  }
}
