import { Repository, EntityManager, In } from 'typeorm';
import dayjs from 'dayjs';
import { DirtyRecord } from '../entities/DirtyRecord';
import { RepairOrder } from '../entities/RepairOrder';
import { SparePartScan } from '../entities/SparePartScan';
import { CustomerReceipt } from '../entities/CustomerReceipt';
import { ManualPriceAdjust } from '../entities/ManualPriceAdjust';
import { ShiftRecord } from '../entities/ShiftRecord';
import { AppDataSource } from '../config/database';
import { DirtyRecordType, DataSourceType, RecordStatus } from '../types';
import { OperationLogService } from './OperationLogService';
import { OperationType } from '../entities/OperationLog';

export interface CheckResult {
  totalChecked: number;
  dirtyCount: number;
  dirtyRecords: DirtyRecord[];
}

export interface FixResult {
  fixedCount: number;
  failedCount: number;
}

export class DirtyRecordService {
  private dirtyRecordRepository: Repository<DirtyRecord>;
  private logService: OperationLogService;

  constructor() {
    this.dirtyRecordRepository = AppDataSource.getRepository(DirtyRecord);
    this.logService = new OperationLogService();
  }

  async checkAll(operator: string, batchId?: string): Promise<CheckResult> {
    let totalChecked = 0;
    let totalDirty = 0;
    const allDirtyRecords: DirtyRecord[] = [];

    await AppDataSource.transaction(async (manager) => {
      await manager.clear(DirtyRecord);

      const sources: Array<{ type: DataSourceType; checkFn: (m: EntityManager, bid?: string) => Promise<DirtyRecord[]> }> = [
        { type: DataSourceType.REPAIR_ORDER, checkFn: this.checkRepairOrders.bind(this) },
        { type: DataSourceType.SPARE_PART_SCAN, checkFn: this.checkSparePartScans.bind(this) },
        { type: DataSourceType.CUSTOMER_RECEIPT, checkFn: this.checkCustomerReceipts.bind(this) },
        { type: DataSourceType.MANUAL_PRICE_ADJUST, checkFn: this.checkManualPriceAdjusts.bind(this) },
        { type: DataSourceType.SHIFT_RECORD, checkFn: this.checkShiftRecords.bind(this) }
      ];

      for (const source of sources) {
        const dirtyRecords = await source.checkFn(manager, batchId);
        for (const dr of dirtyRecords) {
          await manager.save(dr);
          allDirtyRecords.push(dr);
        }
        totalDirty += dirtyRecords.length;
      }

      totalChecked = await this.getTotalRecordsCount(manager, batchId);
    });

    await this.logService.log(
      OperationType.CHECK,
      operator,
      `数据完整性检查完成，发现 ${totalDirty} 条脏记录`,
      {
        details: { totalChecked, dirtyCount: totalDirty }
      }
    );

    return {
      totalChecked,
      dirtyCount: totalDirty,
      dirtyRecords: allDirtyRecords
    };
  }

  private async getTotalRecordsCount(manager: EntityManager, batchId?: string): Promise<number> {
    let count = 0;

    const roQuery = manager.createQueryBuilder(RepairOrder, 'ro');
    const spsQuery = manager.createQueryBuilder(SparePartScan, 'sps');
    const crQuery = manager.createQueryBuilder(CustomerReceipt, 'cr');
    const mpaQuery = manager.createQueryBuilder(ManualPriceAdjust, 'mpa');
    const srQuery = manager.createQueryBuilder(ShiftRecord, 'sr');

    if (batchId) {
      roQuery.where('ro.importBatchId = :batchId', { batchId });
      spsQuery.where('sps.importBatchId = :batchId', { batchId });
      crQuery.where('cr.importBatchId = :batchId', { batchId });
      mpaQuery.where('mpa.importBatchId = :batchId', { batchId });
      srQuery.where('sr.importBatchId = :batchId', { batchId });
    }

    count += await roQuery.getCount();
    count += await spsQuery.getCount();
    count += await crQuery.getCount();
    count += await mpaQuery.getCount();
    count += await srQuery.getCount();

    return count;
  }

  private async checkRepairOrders(manager: EntityManager, batchId?: string): Promise<DirtyRecord[]> {
    const query = manager.createQueryBuilder(RepairOrder, 'ro');
    if (batchId) {
      query.where('ro.importBatchId = :batchId', { batchId });
    }
    const orders = await query.getMany();
    const dirtyRecords: DirtyRecord[] = [];

    for (const order of orders) {
      const issues = this.checkRepairOrderRecord(order);
      for (const issue of issues) {
        dirtyRecords.push(this.createDirtyRecord(
          DataSourceType.REPAIR_ORDER,
          order.id,
          order.originalRowNumber,
          order.originalRowData,
          issue
        ));
      }
    }

    return dirtyRecords;
  }

  private checkRepairOrderRecord(order: RepairOrder): DirtyRecordDetail[] {
    const issues: DirtyRecordDetail[] = [];

    const requiredFields = [
      { field: 'orderNo', value: order.orderNo, name: '工单号' },
      { field: 'engineerName', value: order.engineerName, name: '工程师姓名' },
      { field: 'orderDate', value: order.orderDate, name: '工单日期' }
    ];

    for (const field of requiredFields) {
      if (!field.value) {
        issues.push({
          type: DirtyRecordType.MISSING_FIELD,
          field: field.field,
          description: `缺少必填字段: ${field.name}`,
          suggestion: `请补充${field.name}`
        });
      }
    }

    if (order.totalAmount !== null && order.totalAmount < 0) {
      issues.push({
        type: DirtyRecordType.AMOUNT_CONFLICT,
        field: 'totalAmount',
        actual: String(order.totalAmount),
        expected: '>= 0',
        description: '工单金额不能为负数',
        suggestion: '请检查并修正金额'
      });
    }

    return issues;
  }

  private async checkSparePartScans(manager: EntityManager, batchId?: string): Promise<DirtyRecord[]> {
    const query = manager.createQueryBuilder(SparePartScan, 'sps');
    if (batchId) {
      query.where('sps.importBatchId = :batchId', { batchId });
    }
    const scans = await query.getMany();
    const dirtyRecords: DirtyRecord[] = [];

    for (const scan of scans) {
      const issues = this.checkSparePartScanRecord(scan);
      for (const issue of issues) {
        dirtyRecords.push(this.createDirtyRecord(
          DataSourceType.SPARE_PART_SCAN,
          scan.id,
          scan.originalRowNumber,
          scan.originalRowData,
          issue
        ));
      }
    }

    const quantityConflicts = await this.checkSparePartQuantityConflicts(manager, scans, batchId);
    dirtyRecords.push(...quantityConflicts);

    return dirtyRecords;
  }

  private checkSparePartScanRecord(scan: SparePartScan): DirtyRecordDetail[] {
    const issues: DirtyRecordDetail[] = [];

    const requiredFields = [
      { field: 'scanNo', value: scan.scanNo, name: '扫码单号' },
      { field: 'partCode', value: scan.partCode, name: '备件编码' },
      { field: 'partName', value: scan.partName, name: '备件名称' }
    ];

    for (const field of requiredFields) {
      if (!field.value) {
        issues.push({
          type: DirtyRecordType.MISSING_FIELD,
          field: field.field,
          description: `缺少必填字段: ${field.name}`,
          suggestion: `请补充${field.name}`
        });
      }
    }

    if (scan.quantity !== null && scan.quantity <= 0) {
      issues.push({
        type: DirtyRecordType.QUANTITY_CONFLICT,
        field: 'quantity',
        actual: String(scan.quantity),
        expected: '> 0',
        description: '备件数量必须大于0',
        suggestion: '请检查并修正数量'
      });
    }

    return issues;
  }

  private async checkSparePartQuantityConflicts(
    manager: EntityManager,
    scans: SparePartScan[],
    batchId?: string
  ): Promise<DirtyRecord[]> {
    const conflicts: DirtyRecord[] = [];
    const partMap = new Map<string, SparePartScan[]>();

    for (const scan of scans) {
      if (scan.repairOrderNo && scan.partCode) {
        const key = `${scan.repairOrderNo}-${scan.partCode}`;
        if (!partMap.has(key)) {
          partMap.set(key, []);
        }
        partMap.get(key)!.push(scan);
      }
    }

    for (const [key, items] of partMap) {
      if (items.length > 1) {
        const quantities = items.map(i => i.quantity).join(', ');
        for (const item of items) {
          conflicts.push(this.createDirtyRecord(
            DataSourceType.SPARE_PART_SCAN,
            item.id,
            item.originalRowNumber,
            item.originalRowData,
            {
              type: DirtyRecordType.QUANTITY_CONFLICT,
              field: 'quantity',
              actual: String(item.quantity),
              description: `同一工单同一备件(${key})存在多条记录，数量分别为: ${quantities}`,
              suggestion: '请核实并合并重复记录'
            }
          ));
        }
      }
    }

    return conflicts;
  }

  private async checkCustomerReceipts(manager: EntityManager, batchId?: string): Promise<DirtyRecord[]> {
    const query = manager.createQueryBuilder(CustomerReceipt, 'cr');
    if (batchId) {
      query.where('cr.importBatchId = :batchId', { batchId });
    }
    const receipts = await query.getMany();
    const dirtyRecords: DirtyRecord[] = [];

    for (const receipt of receipts) {
      const issues = this.checkCustomerReceiptRecord(receipt);
      for (const issue of issues) {
        dirtyRecords.push(this.createDirtyRecord(
          DataSourceType.CUSTOMER_RECEIPT,
          receipt.id,
          receipt.originalRowNumber,
          receipt.originalRowData,
          issue
        ));
      }
    }

    return dirtyRecords;
  }

  private checkCustomerReceiptRecord(receipt: CustomerReceipt): DirtyRecordDetail[] {
    const issues: DirtyRecordDetail[] = [];

    const requiredFields = [
      { field: 'receiptNo', value: receipt.receiptNo, name: '签收单号' },
      { field: 'repairOrderNo', value: receipt.repairOrderNo, name: '关联工单号' },
      { field: 'customerName', value: receipt.customerName, name: '客户姓名' }
    ];

    for (const field of requiredFields) {
      if (!field.value) {
        issues.push({
          type: DirtyRecordType.MISSING_FIELD,
          field: field.field,
          description: `缺少必填字段: ${field.name}`,
          suggestion: `请补充${field.name}`
        });
      }
    }

    return issues;
  }

  private async checkManualPriceAdjusts(manager: EntityManager, batchId?: string): Promise<DirtyRecord[]> {
    const query = manager.createQueryBuilder(ManualPriceAdjust, 'mpa');
    if (batchId) {
      query.where('mpa.importBatchId = :batchId', { batchId });
    }
    const adjusts = await query.getMany();
    const dirtyRecords: DirtyRecord[] = [];

    for (const adjust of adjusts) {
      const issues = this.checkManualPriceAdjustRecord(adjust);
      for (const issue of issues) {
        dirtyRecords.push(this.createDirtyRecord(
          DataSourceType.MANUAL_PRICE_ADJUST,
          adjust.id,
          adjust.originalRowNumber,
          adjust.originalRowData,
          issue
        ));
      }
    }

    return dirtyRecords;
  }

  private checkManualPriceAdjustRecord(adjust: ManualPriceAdjust): DirtyRecordDetail[] {
    const issues: DirtyRecordDetail[] = [];

    const requiredFields = [
      { field: 'adjustNo', value: adjust.adjustNo, name: '改价单号' },
      { field: 'repairOrderNo', value: adjust.repairOrderNo, name: '关联工单号' },
      { field: 'partCode', value: adjust.partCode, name: '备件编码' }
    ];

    for (const field of requiredFields) {
      if (!field.value) {
        issues.push({
          type: DirtyRecordType.MISSING_FIELD,
          field: field.field,
          description: `缺少必填字段: ${field.name}`,
          suggestion: `请补充${field.name}`
        });
      }
    }

    if (adjust.originalPrice !== null && adjust.adjustedPrice !== null && adjust.originalPrice === adjust.adjustedPrice) {
      issues.push({
        type: DirtyRecordType.AMOUNT_CONFLICT,
        field: 'adjustedPrice',
        actual: String(adjust.adjustedPrice),
        description: '调整后价格与原价相同',
        suggestion: '请核实是否需要改价'
      });
    }

    return issues;
  }

  private async checkShiftRecords(manager: EntityManager, batchId?: string): Promise<DirtyRecord[]> {
    const query = manager.createQueryBuilder(ShiftRecord, 'sr');
    if (batchId) {
      query.where('sr.importBatchId = :batchId', { batchId });
    }
    const records = await query.getMany();
    const dirtyRecords: DirtyRecord[] = [];

    for (const record of records) {
      const issues = this.checkShiftRecord(record);
      for (const issue of issues) {
        dirtyRecords.push(this.createDirtyRecord(
          DataSourceType.SHIFT_RECORD,
          record.id,
          record.originalRowNumber,
          record.originalRowData,
          issue
        ));
      }
    }

    const crossDayIssues = await this.checkCrossDayRecords(manager, records, batchId);
    dirtyRecords.push(...crossDayIssues);

    return dirtyRecords;
  }

  private checkShiftRecord(record: ShiftRecord): DirtyRecordDetail[] {
    const issues: DirtyRecordDetail[] = [];

    const requiredFields = [
      { field: 'shiftNo', value: record.shiftNo, name: '班次编号' },
      { field: 'engineerName', value: record.engineerName, name: '工程师姓名' },
      { field: 'shiftDate', value: record.shiftDate, name: '班次日期' }
    ];

    for (const field of requiredFields) {
      if (!field.value) {
        issues.push({
          type: DirtyRecordType.MISSING_FIELD,
          field: field.field,
          description: `缺少必填字段: ${field.name}`,
          suggestion: `请补充${field.name}`
        });
      }
    }

    if (record.checkInTime && record.checkOutTime) {
      const checkIn = dayjs(record.checkInTime);
      const checkOut = dayjs(record.checkOutTime);
      if (checkOut.isBefore(checkIn)) {
        issues.push({
          type: DirtyRecordType.CROSS_DATE,
          field: 'checkOutTime',
          description: '签退时间早于签到时间',
          suggestion: '请检查签到签退时间'
        });
      }
    }

    return issues;
  }

  private async checkCrossDayRecords(
    manager: EntityManager,
    records: ShiftRecord[],
    batchId?: string
  ): Promise<DirtyRecord[]> {
    const issues: DirtyRecord[] = [];
    const engineerMap = new Map<string, ShiftRecord[]>();

    for (const record of records) {
      if (record.engineerName && record.shiftDate) {
        if (!engineerMap.has(record.engineerName)) {
          engineerMap.set(record.engineerName, []);
        }
        engineerMap.get(record.engineerName)!.push(record);
      }
    }

    for (const [engineer, engineerRecords] of engineerMap) {
      const sortedRecords = engineerRecords.sort((a, b) => 
        dayjs(a.shiftDate).valueOf() - dayjs(b.shiftDate).valueOf()
      );

      for (let i = 0; i < sortedRecords.length - 1; i++) {
        const current = sortedRecords[i];
        const next = sortedRecords[i + 1];
        
        if (current.checkOutTime && next.checkInTime) {
          const checkOutDate = dayjs(current.checkOutTime).format('YYYY-MM-DD');
          const checkInDate = dayjs(next.checkInTime).format('YYYY-MM-DD');
          
          if (checkOutDate !== checkInDate && dayjs(next.shiftDate).diff(dayjs(current.shiftDate), 'day') === 1) {
            issues.push(this.createDirtyRecord(
              DataSourceType.SHIFT_RECORD,
              current.id,
              current.originalRowNumber,
              current.originalRowData,
              {
                type: DirtyRecordType.CROSS_DATE,
                field: 'checkOutTime',
                description: `${engineer} 在 ${dayjs(current.shiftDate).format('MM-DD')} 的签退时间与次日签到时间跨天`,
                suggestion: '请核实是否为跨天加班或记录错误'
              }
            ));
          }
        }
      }
    }

    return issues;
  }

  private createDirtyRecord(
    sourceType: string,
    sourceRecordId: string,
    originalRowNumber: number | undefined,
    originalRowData: string | undefined,
    detail: DirtyRecordDetail
  ): DirtyRecord {
    return this.dirtyRecordRepository.create({
      sourceType,
      sourceRecordId,
      dirtyType: detail.type,
      fieldName: detail.field,
      description: detail.description,
      originalValue: detail.actual,
      expectedValue: detail.expected,
      suggestedFix: detail.suggestion,
      status: RecordStatus.DIRTY,
      originalRowNumber,
      originalRowData
    });
  }

  async getDirtyRecords(
    options: {
      sourceType?: string;
      dirtyType?: DirtyRecordType;
      status?: RecordStatus;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<{ records: DirtyRecord[]; total: number }> {
    const queryBuilder = this.dirtyRecordRepository.createQueryBuilder('dr')
      .orderBy('dr.createdAt', 'DESC');

    if (options.sourceType) {
      queryBuilder.andWhere('dr.sourceType = :sourceType', { sourceType: options.sourceType });
    }

    if (options.dirtyType) {
      queryBuilder.andWhere('dr.dirtyType = :dirtyType', { dirtyType: options.dirtyType });
    }

    if (options.status) {
      queryBuilder.andWhere('dr.status = :status', { status: options.status });
    }

    const total = await queryBuilder.getCount();

    if (options.page && options.pageSize) {
      queryBuilder.skip((options.page - 1) * options.pageSize).take(options.pageSize);
    }

    const records = await queryBuilder.getMany();

    return { records, total };
  }

  async fixDirtyRecord(
    dirtyRecordId: string,
    fixedValue: string,
    operator: string
  ): Promise<DirtyRecord | null> {
    const dirtyRecord = await this.dirtyRecordRepository.findOne({ where: { id: dirtyRecordId } });
    if (!dirtyRecord) {
      return null;
    }

    dirtyRecord.fixedValue = fixedValue;
    dirtyRecord.fixedBy = operator;
    dirtyRecord.fixedAt = new Date();
    dirtyRecord.status = RecordStatus.FIXED;

    await this.dirtyRecordRepository.save(dirtyRecord);

    await this.updateSourceRecord(dirtyRecord, fixedValue);

    await this.logService.log(
      OperationType.FIX,
      operator,
      `修复脏记录: ${dirtyRecordId}`,
      {
        recordId: dirtyRecordId,
        details: { field: dirtyRecord.fieldName, fixedValue }
      }
    );

    return dirtyRecord;
  }

  private async updateSourceRecord(dirtyRecord: DirtyRecord, fixedValue: string): Promise<void> {
    const { sourceType, sourceRecordId, fieldName } = dirtyRecord;
    if (!fieldName) return;

    await AppDataSource.transaction(async (manager) => {
      switch (sourceType) {
        case DataSourceType.REPAIR_ORDER:
          await manager.update(RepairOrder, { id: sourceRecordId }, { [fieldName]: this.parseValue(fieldName, fixedValue) });
          break;
        case DataSourceType.SPARE_PART_SCAN:
          await manager.update(SparePartScan, { id: sourceRecordId }, { [fieldName]: this.parseValue(fieldName, fixedValue) });
          break;
        case DataSourceType.CUSTOMER_RECEIPT:
          await manager.update(CustomerReceipt, { id: sourceRecordId }, { [fieldName]: this.parseValue(fieldName, fixedValue) });
          break;
        case DataSourceType.MANUAL_PRICE_ADJUST:
          await manager.update(ManualPriceAdjust, { id: sourceRecordId }, { [fieldName]: this.parseValue(fieldName, fixedValue) });
          break;
        case DataSourceType.SHIFT_RECORD:
          await manager.update(ShiftRecord, { id: sourceRecordId }, { [fieldName]: this.parseValue(fieldName, fixedValue) });
          break;
      }
    });
  }

  private parseValue(fieldName: string, value: string): any {
    if (['quantity'].includes(fieldName)) {
      return parseInt(value, 10);
    }
    if (['totalAmount', 'originalPrice', 'adjustedPrice', 'unitPrice'].includes(fieldName)) {
      return parseFloat(value);
    }
    if (fieldName.includes('Date') || fieldName.includes('Time')) {
      const date = dayjs(value);
      return date.isValid() ? date.toDate() : null;
    }
    return value;
  }

  async batchFix(dirtyRecordIds: string[], operator: string): Promise<FixResult> {
    let fixedCount = 0;
    let failedCount = 0;

    for (const id of dirtyRecordIds) {
      try {
        const dirtyRecord = await this.dirtyRecordRepository.findOne({ where: { id } });
        if (dirtyRecord && dirtyRecord.suggestedFix) {
          await this.fixDirtyRecord(id, dirtyRecord.suggestedFix, operator);
          fixedCount++;
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    }

    return { fixedCount, failedCount };
  }

  async getDirtyStats(): Promise<Record<string, any>> {
    const byType = await this.dirtyRecordRepository
      .createQueryBuilder('dr')
      .select('dr.dirtyType, COUNT(*) as count')
      .groupBy('dr.dirtyType')
      .getRawMany();

    const bySource = await this.dirtyRecordRepository
      .createQueryBuilder('dr')
      .select('dr.sourceType, COUNT(*) as count')
      .groupBy('dr.sourceType')
      .getRawMany();

    const byStatus = await this.dirtyRecordRepository
      .createQueryBuilder('dr')
      .select('dr.status, COUNT(*) as count')
      .groupBy('dr.status')
      .getRawMany();

    return {
      byType: byType.reduce((acc, item) => ({ ...acc, [item.dr_dirtyType]: Number(item.count) }), {}),
      bySource: bySource.reduce((acc, item) => ({ ...acc, [item.dr_sourceType]: Number(item.count) }), {}),
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item.dr_status]: Number(item.count) }), {})
    };
  }
}

interface DirtyRecordDetail {
  type: DirtyRecordType;
  field?: string;
  expected?: string;
  actual?: string;
  suggestion?: string;
  description: string;
}
