import { createHash } from 'crypto';
import { RecordType, DataRecord, BorrowApplication, ExpressOrder, CompensationRecord, ShiftRecord } from '../types';
import { logger } from '../utils/logger';

export class DeduplicationService {
  public generateBusinessKey(recordType: RecordType, data: any): string {
    let keyComponents: string[] = [];

    switch (recordType) {
      case RecordType.BORROW_APPLICATION:
        keyComponents = [
          data.applicationNo || data.application_no,
          data.readerId || data.reader_id,
          data.isbn
        ];
        break;
      case RecordType.EXPRESS_ORDER:
        keyComponents = [
          data.expressNo || data.express_no,
          data.relatedApplicationNo || data.related_application_no
        ];
        break;
      case RecordType.COMPENSATION_RECORD:
        keyComponents = [
          data.compensationNo || data.compensation_no,
          data.relatedApplicationNo || data.related_application_no,
          data.compensationType || data.compensation_type
        ];
        break;
      case RecordType.SHIFT_RECORD:
        keyComponents = [
          data.shiftNo || data.shift_no,
          data.operatorId || data.operator_id,
          String(data.shiftDate || data.shift_date)
        ];
        break;
      default:
        throw new Error(`Unknown record type: ${recordType}`);
    }

    const rawKey = keyComponents.filter(Boolean).join('|');
    const hash = createHash('md5').update(rawKey).digest('hex');

    logger.info('Generated business key', {
      recordType,
      rawKey,
      businessKey: hash
    });

    return hash;
  }

  public calculateRecordHash(record: DataRecord): string {
    const recordData = {
      ...record,
      id: undefined,
      businessKey: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      version: undefined,
      importSource: undefined
    };
    return createHash('sha256')
      .update(JSON.stringify(recordData))
      .digest('hex');
  }

  public detectDuplicateType(
    existingRecord: DataRecord,
    newRecord: Partial<DataRecord>
  ): 'exact' | 'partial' | 'conflicting' | 'none' {
    const existingHash = this.calculateRecordHash(existingRecord);
    const newHash = this.calculateRecordHash({
      ...existingRecord,
      ...newRecord,
      id: existingRecord.id,
      businessKey: existingRecord.businessKey,
      createdAt: existingRecord.createdAt,
      updatedAt: Date.now(),
      version: existingRecord.version + 1,
      importSource: newRecord.importSource || existingRecord.importSource,
    } as DataRecord);

    if (existingHash === newHash) {
      return 'exact';
    }

    const hasConflicts = this.checkForConflicts(existingRecord, newRecord);
    if (hasConflicts) {
      return 'conflicting';
    }

    return 'partial';
  }

  private checkForConflicts(
    existingRecord: DataRecord,
    newRecord: Partial<DataRecord>
  ): boolean {
    const criticalFields = this.getCriticalFields(existingRecord.recordType);
    
    for (const field of criticalFields) {
      const existingValue = (existingRecord as any)[field];
      const newValue = (newRecord as any)[field];
      
      if (newValue !== undefined && 
          existingValue !== undefined && 
          newValue !== existingValue) {
        logger.warn('Detected field conflict', {
          field,
          existingValue,
          newValue,
          recordId: existingRecord.id
        });
        return true;
      }
    }
    
    return false;
  }

  private getCriticalFields(recordType: RecordType): string[] {
    switch (recordType) {
      case RecordType.BORROW_APPLICATION:
        return ['applicationDate', 'expectedReturnDate', 'status'];
      case RecordType.EXPRESS_ORDER:
        return ['sendDate', 'freight', 'status'];
      case RecordType.COMPENSATION_RECORD:
        return ['amount', 'compensationDate', 'status', 'compensationType'];
      case RecordType.SHIFT_RECORD:
        return ['shiftDate', 'shiftType', 'processedRecords'];
      default:
        return [];
    }
  }

  public mergeRecords(
    existingRecord: DataRecord,
    newRecord: Partial<DataRecord>
  ): DataRecord {
    const merged = {
      ...existingRecord,
      ...newRecord,
      id: existingRecord.id,
      businessKey: existingRecord.businessKey,
      createdAt: existingRecord.createdAt,
      updatedAt: Date.now(),
      version: existingRecord.version + 1,
    };

    logger.info('Merged records', {
      recordId: existingRecord.id,
      oldVersion: existingRecord.version,
      newVersion: merged.version
    });

    return merged as DataRecord;
  }
}

export const deduplicationService = new DeduplicationService();
