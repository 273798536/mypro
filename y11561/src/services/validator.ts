import { 
  CheckinRecord, 
  DepositRecord, 
  RoomChangeRecord, 
  ShiftRecord,
  DirtyRecord,
  DirtyType,
  RecordSource
} from '../types';
import { getDatabase } from '../db/database';

export interface ValidationResult {
  isValid: boolean;
  dirtyRecords: Omit<DirtyRecord, 'id'>[];
}

export class DataValidator {
  private db = getDatabase();
  
  validateCheckinRecord(
    record: CheckinRecord, 
    sourceRowNumber: number,
    detectedBy: string,
    importBatch: string
  ): ValidationResult {
    const dirtyRecords: Omit<DirtyRecord, 'id'>[] = [];
    
    const requiredFields = ['orderNo', 'guestName', 'roomNo', 'checkinDate', 'checkoutDate', 'roomRate', 'depositAmount'];
    for (const field of requiredFields) {
      const value = (record as unknown as Record<string, unknown>)[field];
      if (value === undefined || value === null || value === '') {
        dirtyRecords.push({
          recordId: record.id,
          recordType: 'checkin',
          dirtyType: 'missing_field',
          fieldName: field,
          description: `入住单缺少必填字段: ${field}`,
          originalContent: { ...record, sourceRowNumber },
          suggestion: `请补充${field}字段的值`,
          status: 'pending',
          detectedAt: new Date().toISOString(),
          detectedBy,
          importBatch
        });
      }
    }
    
    if (record.checkinDate && record.checkoutDate) {
      const checkin = new Date(record.checkinDate);
      const checkout = new Date(record.checkoutDate);
      
      if (checkin >= checkout) {
        dirtyRecords.push({
          recordId: record.id,
          recordType: 'checkin',
          dirtyType: 'invalid_data',
          fieldName: 'checkoutDate',
          expectedValue: '晚于入住日期',
          actualValue: record.checkoutDate,
          description: '退房日期不晚于入住日期',
          originalContent: { ...record, sourceRowNumber },
          suggestion: '请修正退房日期，确保晚于入住日期',
          status: 'pending',
          detectedAt: new Date().toISOString(),
          detectedBy,
          importBatch
        });
      }
      
      const diffDays = Math.ceil((checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 30) {
        dirtyRecords.push({
          recordId: record.id,
          recordType: 'checkin',
          dirtyType: 'cross_day',
          fieldName: 'checkoutDate',
          description: `入住天数异常: ${diffDays}天`,
          originalContent: { ...record, sourceRowNumber },
          suggestion: '请确认是否为长住客，如不是请修正日期',
          status: 'pending',
          detectedAt: new Date().toISOString(),
          detectedBy,
          importBatch
        });
      }
    }
    
    if (record.roomRate !== undefined && record.roomRate <= 0) {
      dirtyRecords.push({
        recordId: record.id,
        recordType: 'checkin',
        dirtyType: 'invalid_data',
        fieldName: 'roomRate',
        description: `房价异常: ${record.roomRate}`,
        originalContent: { ...record, sourceRowNumber },
        suggestion: '请修正房价，确保为正数',
        status: 'pending',
        detectedAt: new Date().toISOString(),
        detectedBy,
        importBatch
      });
    }
    
    if (record.depositAmount !== undefined && record.depositAmount < 0) {
      dirtyRecords.push({
        recordId: record.id,
        recordType: 'checkin',
        dirtyType: 'amount_conflict',
        fieldName: 'depositAmount',
        description: `押金金额为负数: ${record.depositAmount}`,
        originalContent: { ...record, sourceRowNumber },
        suggestion: '请确认押金金额是否正确',
        status: 'pending',
        detectedAt: new Date().toISOString(),
        detectedBy,
        importBatch
      });
    }
    
    return {
      isValid: dirtyRecords.length === 0,
      dirtyRecords
    };
  }
  
  validateDepositRecord(
    record: DepositRecord,
    sourceRowNumber: number,
    detectedBy: string,
    importBatch: string
  ): ValidationResult {
    const dirtyRecords: Omit<DirtyRecord, 'id'>[] = [];
    
    const requiredFields = ['transactionNo', 'orderNo', 'guestName', 'amount', 'paymentMethod', 'transactionType', 'transactionTime'];
    for (const field of requiredFields) {
      const value = (record as unknown as Record<string, unknown>)[field];
      if (value === undefined || value === null || value === '') {
        dirtyRecords.push({
          recordId: record.id,
          recordType: 'deposit',
          dirtyType: 'missing_field',
          fieldName: field,
          description: `押金流水缺少必填字段: ${field}`,
          originalContent: { ...record, sourceRowNumber },
          suggestion: `请补充${field}字段的值`,
          status: 'pending',
          detectedAt: new Date().toISOString(),
          detectedBy,
          importBatch
        });
      }
    }
    
    if (record.amount !== undefined) {
      if (record.transactionType === 'deposit' && record.amount <= 0) {
        dirtyRecords.push({
          recordId: record.id,
          recordType: 'deposit',
          dirtyType: 'amount_conflict',
          fieldName: 'amount',
          description: `押金缴纳金额应为正数: ${record.amount}`,
          originalContent: { ...record, sourceRowNumber },
          suggestion: '请修正押金金额',
          status: 'pending',
          detectedAt: new Date().toISOString(),
          detectedBy,
          importBatch
        });
      }
      if (record.transactionType === 'refund' && record.amount >= 0) {
        dirtyRecords.push({
          recordId: record.id,
          recordType: 'deposit',
          dirtyType: 'amount_conflict',
          fieldName: 'amount',
          description: `退款金额应为负数: ${record.amount}`,
          originalContent: { ...record, sourceRowNumber },
          suggestion: '请修正退款金额，应为负数',
          status: 'pending',
          detectedAt: new Date().toISOString(),
          detectedBy,
          importBatch
        });
      }
    }
    
    return {
      isValid: dirtyRecords.length === 0,
      dirtyRecords
    };
  }
  
  validateRoomChangeRecord(
    record: RoomChangeRecord,
    sourceRowNumber: number,
    detectedBy: string,
    importBatch: string
  ): ValidationResult {
    const dirtyRecords: Omit<DirtyRecord, 'id'>[] = [];
    
    const requiredFields = ['changeNo', 'orderNo', 'guestName', 'oldRoomNo', 'newRoomNo', 'changeTime'];
    for (const field of requiredFields) {
      const value = (record as unknown as Record<string, unknown>)[field];
      if (value === undefined || value === null || value === '') {
        dirtyRecords.push({
          recordId: record.id,
          recordType: 'roomChange',
          dirtyType: 'missing_field',
          fieldName: field,
          description: `换房记录缺少必填字段: ${field}`,
          originalContent: { ...record, sourceRowNumber },
          suggestion: `请补充${field}字段的值`,
          status: 'pending',
          detectedAt: new Date().toISOString(),
          detectedBy,
          importBatch
        });
      }
    }
    
    if (record.oldRoomNo && record.newRoomNo && record.oldRoomNo === record.newRoomNo) {
      dirtyRecords.push({
        recordId: record.id,
        recordType: 'roomChange',
        dirtyType: 'invalid_data',
        fieldName: 'newRoomNo',
        description: '换房前后房号相同',
        originalContent: { ...record, sourceRowNumber },
        suggestion: '请确认是否真的需要换房，或修正新房号',
        status: 'pending',
        detectedAt: new Date().toISOString(),
        detectedBy,
        importBatch
      });
    }
    
    if (record.oldRoomRate !== undefined && record.newRoomRate !== undefined) {
      if (record.oldRoomRate < 0 || record.newRoomRate < 0) {
        dirtyRecords.push({
          recordId: record.id,
          recordType: 'roomChange',
          dirtyType: 'amount_conflict',
          fieldName: 'roomRate',
          description: '房价不能为负数',
          originalContent: { ...record, sourceRowNumber },
          suggestion: '请修正房价',
          status: 'pending',
          detectedAt: new Date().toISOString(),
          detectedBy,
          importBatch
        });
      }
    }
    
    return {
      isValid: dirtyRecords.length === 0,
      dirtyRecords
    };
  }
  
  validateShiftRecord(
    record: ShiftRecord,
    sourceRowNumber: number,
    detectedBy: string,
    importBatch: string
  ): ValidationResult {
    const dirtyRecords: Omit<DirtyRecord, 'id'>[] = [];
    
    const requiredFields = ['shiftNo', 'shiftDate', 'shiftType', 'operator', 'handoverTime'];
    for (const field of requiredFields) {
      const value = (record as unknown as Record<string, unknown>)[field];
      if (value === undefined || value === null || value === '') {
        dirtyRecords.push({
          recordId: record.id,
          recordType: 'shift',
          dirtyType: 'missing_field',
          fieldName: field,
          description: `班次记录缺少必填字段: ${field}`,
          originalContent: { ...record, sourceRowNumber },
          suggestion: `请补充${field}字段的值`,
          status: 'pending',
          detectedAt: new Date().toISOString(),
          detectedBy,
          importBatch
        });
      }
    }
    
    const numericFields = ['checkinCount', 'checkoutCount', 'totalDeposit', 'totalRefund', 'totalRevenue'];
    for (const field of numericFields) {
      const value = (record as unknown as Record<string, number>)[field];
      if (value !== undefined && value < 0) {
        dirtyRecords.push({
          recordId: record.id,
          recordType: 'shift',
          dirtyType: 'quantity_conflict',
          fieldName: field,
          description: `${field}不能为负数: ${value}`,
          originalContent: { ...record, sourceRowNumber },
          suggestion: `请修正${field}的值`,
          status: 'pending',
          detectedAt: new Date().toISOString(),
          detectedBy,
          importBatch
        });
      }
    }
    
    return {
      isValid: dirtyRecords.length === 0,
      dirtyRecords
    };
  }
  
  checkCrossSourceConsistency(batchId: string, detectedBy: string): Omit<DirtyRecord, 'id'>[] {
    const dirtyRecords: Omit<DirtyRecord, 'id'>[] = [];
    
    const checkinRecords = this.db.getCheckinRecords(batchId);
    const depositRecords = this.db.getDepositRecords(batchId);
    const roomChangeRecords = this.db.getRoomChangeRecords(batchId);
    
    const orderMap = new Map<string, CheckinRecord>();
    for (const record of checkinRecords) {
      orderMap.set(record.orderNo, record);
    }
    
    for (const deposit of depositRecords) {
      const checkin = orderMap.get(deposit.orderNo);
      if (checkin) {
        if (deposit.guestName !== checkin.guestName) {
          dirtyRecords.push({
            recordId: deposit.id,
            recordType: 'deposit',
            dirtyType: 'name_changed',
            fieldName: 'guestName',
            expectedValue: checkin.guestName,
            actualValue: deposit.guestName,
            description: `押金流水客人姓名与入住单不一致: 订单号${deposit.orderNo}`,
            originalContent: { deposit: { ...deposit }, checkin: { ...checkin } },
            suggestion: '请确认客人姓名是否正确，是否存在改名情况',
            status: 'pending',
            detectedAt: new Date().toISOString(),
            detectedBy,
            importBatch: batchId
          });
        }
      }
    }
    
    for (const roomChange of roomChangeRecords) {
      const checkin = orderMap.get(roomChange.orderNo);
      if (checkin) {
        if (roomChange.guestName !== checkin.guestName) {
          dirtyRecords.push({
            recordId: roomChange.id,
            recordType: 'roomChange',
            dirtyType: 'name_changed',
            fieldName: 'guestName',
            expectedValue: checkin.guestName,
            actualValue: roomChange.guestName,
            description: `换房记录客人姓名与入住单不一致: 订单号${roomChange.orderNo}`,
            originalContent: { roomChange: { ...roomChange }, checkin: { ...checkin } },
            suggestion: '请确认客人姓名是否正确',
            status: 'pending',
            detectedAt: new Date().toISOString(),
            detectedBy,
            importBatch: batchId
          });
        }
        
        if (roomChange.oldRoomNo !== checkin.roomNo) {
          dirtyRecords.push({
            recordId: roomChange.id,
            recordType: 'roomChange',
            dirtyType: 'invalid_data',
            fieldName: 'oldRoomNo',
            expectedValue: checkin.roomNo,
            actualValue: roomChange.oldRoomNo,
            description: `换房记录原房号与入住单不一致: 订单号${roomChange.orderNo}`,
            originalContent: { roomChange: { ...roomChange }, checkin: { ...checkin } },
            suggestion: '请确认原房号是否正确',
            status: 'pending',
            detectedAt: new Date().toISOString(),
            detectedBy,
            importBatch: batchId
          });
        }
      }
    }
    
    for (const checkin of checkinRecords) {
      const orderDeposits = depositRecords.filter(d => d.orderNo === checkin.orderNo);
      const totalDeposit = orderDeposits
        .filter(d => d.transactionType === 'deposit')
        .reduce((sum, d) => sum + d.amount, 0);
      const totalRefund = orderDeposits
        .filter(d => d.transactionType === 'refund')
        .reduce((sum, d) => sum + Math.abs(d.amount), 0);
      const netDeposit = totalDeposit - totalRefund;
      
      if (Math.abs(netDeposit - checkin.depositAmount) > 0.01) {
        dirtyRecords.push({
          recordId: checkin.id,
          recordType: 'checkin',
          dirtyType: 'amount_conflict',
          fieldName: 'depositAmount',
          expectedValue: String(netDeposit),
          actualValue: String(checkin.depositAmount),
          description: `入住单押金金额(${checkin.depositAmount})与押金流水合计(${netDeposit})不一致: 订单号${checkin.orderNo}`,
          originalContent: { 
            checkinDeposit: checkin.depositAmount, 
            depositRecords: orderDeposits.map(d => ({ type: d.transactionType, amount: d.amount })) 
          },
          suggestion: '请核入住单押金金额与押金流水',
          status: 'pending',
          detectedAt: new Date().toISOString(),
          detectedBy,
          importBatch: batchId
        });
      }
    }
    
    return dirtyRecords;
  }
  
  checkDuplicates(batchId: string, source: RecordSource, detectedBy: string): Omit<DirtyRecord, 'id'>[] {
    const dirtyRecords: Omit<DirtyRecord, 'id'>[] = [];
    let records: Array<{ id: string; [key: string]: unknown }> = [];
    let keyField = '';
    
    switch (source) {
      case 'checkin':
        records = this.db.getCheckinRecords(batchId).filter(r => r.importBatch === batchId) as any;
        keyField = 'orderNo';
        break;
      case 'deposit':
        records = this.db.getDepositRecords(batchId).filter(r => r.importBatch === batchId) as any;
        keyField = 'transactionNo';
        break;
      case 'roomChange':
        records = this.db.getRoomChangeRecords(batchId).filter(r => r.importBatch === batchId) as any;
        keyField = 'changeNo';
        break;
      case 'shift':
        records = this.db.getShiftRecords(batchId).filter(r => r.importBatch === batchId) as any;
        keyField = 'shiftNo';
        break;
    }
    
    const seen = new Map<string, typeof records>();
    for (const record of records) {
      const key = String(record[keyField] || '');
      if (key) {
        if (seen.has(key)) {
          seen.get(key)!.push(record);
        } else {
          seen.set(key, [record]);
        }
      }
    }
    
    for (const [key, duplicates] of seen) {
      if (duplicates.length > 1) {
        for (const record of duplicates) {
          dirtyRecords.push({
            recordId: record.id,
            recordType: source,
            dirtyType: 'duplicate',
            fieldName: keyField,
            actualValue: key,
            description: `发现重复记录: ${keyField}=${key}, 共${duplicates.length}条`,
            originalContent: { duplicates: duplicates.map(r => ({ ...r })) },
            suggestion: '请删除重复记录，保留正确的一条',
            status: 'pending',
            detectedAt: new Date().toISOString(),
            detectedBy,
            importBatch: batchId
          });
        }
      }
    }
    
    return dirtyRecords;
  }
}
