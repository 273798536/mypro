import { FieldMapping, RawSensorLog } from '../types';

export const DEFAULT_FIELD_MAPPING: FieldMapping = {
  timestamp: ['timestamp', 'time', 'ts', 'datetime', 'date_time', 'record_time'],
  materialId: ['material_id', 'materialId', 'mat_id', 'matId', 'batch_id', 'batchId'],
  materialName: ['material_name', 'materialName', 'mat_name', 'matName', 'material', 'name', 'product_name'],
  tension: ['tension', 'force', 'tensile', 'pull_force', 'tension_value', 'tension_kn', 'tension_n'],
  tensionUnit: ['tension_unit', 'unit', 'tensionUnit', 'force_unit'],
  pulleyGroupId: ['pulley_group_id', 'pulleyGroupId', 'pulley_id', 'pulleyId', 'group_id', 'groupId', 'pulley_group'],
  speed: ['speed', 'velocity', 'line_speed', 'lineSpeed', 'v'],
  temperature: ['temperature', 'temp', 't', 'env_temp', 'temperature_c'],
};

export function mapField(rawLog: RawSensorLog, standardField: string, mapping: FieldMapping = DEFAULT_FIELD_MAPPING): { value: unknown; sourceField: string | null } {
  const candidates = mapping[standardField] || [standardField];
  
  for (const fieldName of candidates) {
    if (fieldName in rawLog && rawLog[fieldName] !== undefined && rawLog[fieldName] !== null && rawLog[fieldName] !== '') {
      return { value: rawLog[fieldName], sourceField: fieldName };
    }
  }
  
  const allKeys = Object.keys(rawLog);
  for (const fieldName of candidates) {
    const lowerField = fieldName.toLowerCase();
    const matchedKey = allKeys.find(k => k.toLowerCase() === lowerField);
    if (matchedKey && rawLog[matchedKey] !== undefined && rawLog[matchedKey] !== null && rawLog[matchedKey] !== '') {
      return { value: rawLog[matchedKey], sourceField: matchedKey };
    }
  }
  
  return { value: undefined, sourceField: null };
}

export function detectTensionUnit(tensionValue: number, rawLog: RawSensorLog, mapping: FieldMapping = DEFAULT_FIELD_MAPPING): string {
  const { value: unitValue } = mapField(rawLog, 'tensionUnit', mapping);
  if (unitValue && typeof unitValue === 'string') {
    return unitValue;
  }
  
  if (tensionValue > 1000) {
    return 'N';
  }
  return 'kN';
}

export function normalizeValue(value: unknown, type: 'number' | 'string' | 'timestamp'): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  
  switch (type) {
    case 'number': {
      const num = Number(value);
      return isNaN(num) ? undefined : num;
    }
    case 'string':
      return String(value).trim();
    case 'timestamp': {
      if (typeof value === 'number') {
        return value > 1e12 ? value : value * 1000;
      }
      if (typeof value === 'string') {
        const ts = Date.parse(value);
        return isNaN(ts) ? undefined : ts;
      }
      return undefined;
    }
    default:
      return value;
  }
}
