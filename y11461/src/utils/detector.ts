import { isSameDay, parseISO, differenceInDays } from 'date-fns';
import { 
  MaterialRecord, 
  DirtyRecord, 
  DirtyType, 
  Database,
  RecordStatus 
} from '../types';
import { generateId, getCurrentTime } from './database';

const REQUIRED_FIELDS = [
  'batchNumber',
  'materialName',
  'materialType',
  'quantity',
  'unitPrice',
  'totalAmount',
  'supplier'
];

export function detectMissingFields(record: MaterialRecord): DirtyRecord | null {
  for (const field of REQUIRED_FIELDS) {
    const value = (record as any)[field];
    if (value === undefined || value === null || value === '') {
      return {
        id: generateId(),
        recordId: record.id,
        dirtyType: DirtyType.MISSING_FIELD,
        fieldName: field,
        description: `缺少必填字段: ${field}`,
        suggestion: `请补充字段 "${field}" 的值`,
        createdAt: getCurrentTime(),
        resolved: false
      };
    }
  }
  
  if (record.quantity <= 0) {
    return {
      id: generateId(),
      recordId: record.id,
      dirtyType: DirtyType.MISSING_FIELD,
      fieldName: 'quantity',
      actualValue: String(record.quantity),
      description: '数量必须大于0',
      suggestion: '请修正数量为正数',
      createdAt: getCurrentTime(),
      resolved: false
    };
  }
  
  if (record.unitPrice <= 0) {
    return {
      id: generateId(),
      recordId: record.id,
      dirtyType: DirtyType.MISSING_FIELD,
      fieldName: 'unitPrice',
      actualValue: String(record.unitPrice),
      description: '单价必须大于0',
      suggestion: '请修正单价为正数',
      createdAt: getCurrentTime(),
      resolved: false
    };
  }
  
  return null;
}

export function detectCrossDate(
  record: MaterialRecord,
  existingRecords: MaterialRecord[]
): DirtyRecord | null {
  if (!record.appointmentDate) {
    return null;
  }
  
  const sameBatchRecords = existingRecords.filter(r => 
    r.id !== record.id &&
    r.batchNumber === record.batchNumber &&
    r.appointmentDate
  );
  
  for (const existing of sameBatchRecords) {
    try {
      const recordDate = parseISO(record.appointmentDate);
      const existingDate = parseISO(existing.appointmentDate!);
      
      if (!isSameDay(recordDate, existingDate)) {
        const daysDiff = Math.abs(differenceInDays(recordDate, existingDate));
        return {
          id: generateId(),
          recordId: record.id,
          dirtyType: DirtyType.CROSS_DATE,
          fieldName: 'appointmentDate',
          expectedValue: existing.appointmentDate,
          actualValue: record.appointmentDate,
          description: `同一批号(${record.batchNumber})跨日期使用，相差${daysDiff}天`,
          suggestion: '请确认预约日期是否正确，或核对批号是否录入错误',
          createdAt: getCurrentTime(),
          resolved: false
        };
      }
    } catch (e) {
    }
  }
  
  return null;
}

export function detectNameChanged(
  record: MaterialRecord,
  existingRecords: MaterialRecord[]
): DirtyRecord | null {
  const sameBatchRecords = existingRecords.filter(r => 
    r.id !== record.id &&
    r.batchNumber === record.batchNumber &&
    r.materialName !== record.materialName
  );
  
  if (sameBatchRecords.length > 0) {
    const existingNames = [...new Set(sameBatchRecords.map(r => r.materialName))];
    return {
      id: generateId(),
      recordId: record.id,
      dirtyType: DirtyType.NAME_CHANGED,
      fieldName: 'materialName',
      expectedValue: existingNames.join(', '),
      actualValue: record.materialName,
      description: `同一批号(${record.batchNumber})材料名称不一致`,
      suggestion: `请确认材料名称，已有名称: ${existingNames.join(', ')}`,
      createdAt: getCurrentTime(),
      resolved: false
    };
  }
  
  return null;
}

export function detectAmountConflict(record: MaterialRecord): DirtyRecord | null {
  const calculatedAmount = record.quantity * record.unitPrice;
  const tolerance = 0.01;
  
  if (Math.abs(calculatedAmount - record.totalAmount) > tolerance) {
    return {
      id: generateId(),
      recordId: record.id,
      dirtyType: DirtyType.AMOUNT_CONFLICT,
      fieldName: 'totalAmount',
      expectedValue: calculatedAmount.toFixed(2),
      actualValue: record.totalAmount.toFixed(2),
      description: `金额计算冲突：数量(${record.quantity}) × 单价(${record.unitPrice}) = ${calculatedAmount.toFixed(2)}，但记录为 ${record.totalAmount.toFixed(2)}`,
      suggestion: '请核对数量、单价或总金额，建议自动修正总金额',
      createdAt: getCurrentTime(),
      resolved: false
    };
  }
  
  return null;
}

export function detectQuantityConflict(
  record: MaterialRecord,
  existingRecords: MaterialRecord[]
): DirtyRecord | null {
  const sameBatchRecords = existingRecords.filter(r => 
    r.id !== record.id &&
    r.batchNumber === record.batchNumber &&
    r.status !== RecordStatus.REJECTED
  );
  
  if (sameBatchRecords.length === 0) {
    return null;
  }
  
  const totalQuantity = sameBatchRecords.reduce((sum, r) => sum + r.quantity, 0);
  const newTotal = totalQuantity + record.quantity;
  
  if (newTotal > 100) {
    return {
      id: generateId(),
      recordId: record.id,
      dirtyType: DirtyType.QUANTITY_CONFLICT,
      fieldName: 'quantity',
      actualValue: String(record.quantity),
      description: `批号(${record.batchNumber})累计数量异常：已有${totalQuantity}，本次新增${record.quantity}，合计${newTotal}`,
      suggestion: '请确认数量是否正确，累计数量超过常规阈值',
      createdAt: getCurrentTime(),
      resolved: false
    };
  }
  
  return null;
}

export function detectAllDirty(
  record: MaterialRecord,
  db: Database
): DirtyRecord[] {
  const dirtyRecords: DirtyRecord[] = [];
  const existingRecords = db.records;
  
  const missingField = detectMissingFields(record);
  if (missingField) dirtyRecords.push(missingField);
  
  if (!missingField) {
    const crossDate = detectCrossDate(record, existingRecords);
    if (crossDate) dirtyRecords.push(crossDate);
    
    const nameChanged = detectNameChanged(record, existingRecords);
    if (nameChanged) dirtyRecords.push(nameChanged);
    
    const amountConflict = detectAmountConflict(record);
    if (amountConflict) dirtyRecords.push(amountConflict);
    
    const quantityConflict = detectQuantityConflict(record, existingRecords);
    if (quantityConflict) dirtyRecords.push(quantityConflict);
  }
  
  return dirtyRecords;
}

export function getDirtyTypeName(type: DirtyType): string {
  const names: Record<DirtyType, string> = {
    [DirtyType.MISSING_FIELD]: '缺字段',
    [DirtyType.CROSS_DATE]: '跨日',
    [DirtyType.NAME_CHANGED]: '改名',
    [DirtyType.AMOUNT_CONFLICT]: '金额冲突',
    [DirtyType.QUANTITY_CONFLICT]: '数量冲突'
  };
  return names[type] ?? type;
}
