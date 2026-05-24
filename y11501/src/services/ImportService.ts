import { Repository, EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { ImportBatch } from '../entities/ImportBatch';
import { RepairOrder } from '../entities/RepairOrder';
import { SparePartScan, PartActionType } from '../entities/SparePartScan';
import { CustomerReceipt } from '../entities/CustomerReceipt';
import { ManualPriceAdjust } from '../entities/ManualPriceAdjust';
import { ShiftRecord, ShiftType } from '../entities/ShiftRecord';
import { AppDataSource } from '../config/database';
import { DataSourceType, RecordStatus } from '../types';
import { FileParserService, ParsedRow } from './FileParserService';
import { OperationLogService } from './OperationLogService';
import { OperationType } from '../entities/OperationLog';

export interface ImportResult {
  batchId: string;
  batchNumber: string;
  totalRecords: number;
  successCount: number;
  failedCount: number;
  failedRecords: Array<{ rowNumber: number; error: string }>;
}

export class ImportService {
  private batchRepository: Repository<ImportBatch>;
  private fileParser: FileParserService;
  private logService: OperationLogService;

  constructor() {
    this.batchRepository = AppDataSource.getRepository(ImportBatch);
    this.fileParser = new FileParserService();
    this.logService = new OperationLogService();
  }

  async importFile(
    filePath: string,
    sourceType: DataSourceType,
    importedBy: string
  ): Promise<ImportResult> {
    const parsedRows = await this.fileParser.parseFile(filePath, sourceType);
    const batchNumber = this.generateBatchNumber(sourceType);

    const batch = this.batchRepository.create({
      id: uuidv4(),
      batchNumber,
      sourceType,
      sourceFileName: filePath.split('/').pop() || 'unknown',
      importedBy,
      totalRecords: parsedRows.length,
      isProcessed: false
    });

    const failedRecords: Array<{ rowNumber: number; error: string }> = [];

    await AppDataSource.transaction(async (manager) => {
      await manager.save(batch);

      for (const row of parsedRows) {
        try {
          await this.importRow(manager, row, sourceType, batch.id, importedBy);
        } catch (error: any) {
          failedRecords.push({
            rowNumber: row.rowNumber,
            error: error.message || '未知错误'
          });
        }
      }

      batch.validRecords = parsedRows.length - failedRecords.length;
      batch.dirtyRecords = 0;
      batch.isProcessed = true;
      await manager.save(batch);
    });

    await this.logService.log(
      OperationType.IMPORT,
      importedBy,
      `导入${this.getSourceTypeName(sourceType)}数据: ${batch.batchNumber}`,
      {
        batchId: batch.id,
        details: {
          filePath,
          totalRecords: parsedRows.length,
          successCount: parsedRows.length - failedRecords.length,
          failedCount: failedRecords.length
        }
      }
    );

    return {
      batchId: batch.id,
      batchNumber,
      totalRecords: parsedRows.length,
      successCount: parsedRows.length - failedRecords.length,
      failedCount: failedRecords.length,
      failedRecords
    };
  }

  private async importRow(
    manager: EntityManager,
    parsedRow: ParsedRow,
    sourceType: DataSourceType,
    batchId: string,
    importedBy: string
  ): Promise<void> {
    const { rowNumber, data } = parsedRow;
    const originalRowData = JSON.stringify(data);

    switch (sourceType) {
      case DataSourceType.REPAIR_ORDER:
        await this.importRepairOrder(manager, data, rowNumber, originalRowData, batchId, importedBy);
        break;
      case DataSourceType.SPARE_PART_SCAN:
        await this.importSparePartScan(manager, data, rowNumber, originalRowData, batchId, importedBy);
        break;
      case DataSourceType.CUSTOMER_RECEIPT:
        await this.importCustomerReceipt(manager, data, rowNumber, originalRowData, batchId, importedBy);
        break;
      case DataSourceType.MANUAL_PRICE_ADJUST:
        await this.importManualPriceAdjust(manager, data, rowNumber, originalRowData, batchId, importedBy);
        break;
      case DataSourceType.SHIFT_RECORD:
        await this.importShiftRecord(manager, data, rowNumber, originalRowData, batchId, importedBy);
        break;
    }
  }

  private async importRepairOrder(
    manager: EntityManager,
    data: Record<string, any>,
    rowNumber: number,
    originalRowData: string,
    batchId: string,
    importedBy: string
  ): Promise<void> {
    const orderNo = this.getValue(data, ['工单号', '订单号', 'order_no', 'orderno', 'id']);
    if (!orderNo) {
      throw new Error('缺少工单号');
    }

    const repairOrder = new RepairOrder();
    repairOrder.orderNo = String(orderNo);
    repairOrder.engineerName = this.getValue(data, ['工程师', '工程师姓名', 'engineer_name', 'engineer']);
    repairOrder.engineerId = this.getValue(data, ['工程师编号', 'engineer_id']);
    repairOrder.orderDate = this.parseDate(this.getValue(data, ['工单日期', '下单时间', 'order_date', 'date']));
    repairOrder.customerName = this.getValue(data, ['客户姓名', '客户', 'customer_name', 'customer']);
    repairOrder.customerPhone = this.getValue(data, ['客户电话', '联系电话', 'phone', 'telephone']);
    repairOrder.faultDescription = this.getValue(data, ['故障描述', '故障', 'fault', 'description']);
    repairOrder.totalAmount = this.parseNumber(this.getValue(data, ['总金额', '金额', 'amount', 'total']));
    repairOrder.status = RecordStatus.PENDING;
    repairOrder.originalRowNumber = rowNumber;
    repairOrder.originalRowData = originalRowData;
    repairOrder.importBatchId = batchId;
    repairOrder.createdBy = importedBy;

    await manager.save(repairOrder);
  }

  private async importSparePartScan(
    manager: EntityManager,
    data: Record<string, any>,
    rowNumber: number,
    originalRowData: string,
    batchId: string,
    importedBy: string
  ): Promise<void> {
    const scanNo = this.getValue(data, ['扫码单号', '扫码编号', 'scan_no', 'scanno', 'id']);
    if (!scanNo) {
      throw new Error('缺少扫码单号');
    }

    const actionTypeStr = this.getValue(data, ['操作类型', '类型', 'action', 'type']);
    let actionType: PartActionType | undefined;
    if (actionTypeStr) {
      const lower = String(actionTypeStr).toLowerCase();
      if (lower.includes('领') || lower.includes('pick')) actionType = PartActionType.PICKUP;
      else if (lower.includes('退') || lower.includes('return')) actionType = PartActionType.RETURN;
      else if (lower.includes('废') || lower.includes('scrap')) actionType = PartActionType.SCRAP;
    }

    const sparePartScan = new SparePartScan();
    sparePartScan.scanNo = String(scanNo);
    sparePartScan.repairOrderNo = this.getValue(data, ['工单号', '关联工单', 'repair_order_no', 'orderno']);
    sparePartScan.partCode = this.getValue(data, ['备件编码', '零件号', 'part_code', 'partcode']);
    sparePartScan.partName = this.getValue(data, ['备件名称', '零件名', 'part_name', 'partname']);
    sparePartScan.quantity = this.parseInteger(this.getValue(data, ['数量', 'quantity', 'qty', 'count']));
    sparePartScan.actionType = actionType ?? null;
    sparePartScan.engineerName = this.getValue(data, ['工程师', '领用人', 'engineer_name', 'engineer']);
    sparePartScan.scanTime = this.parseDate(this.getValue(data, ['扫码时间', '时间', 'scan_time', 'time']));
    sparePartScan.unitPrice = this.parseNumber(this.getValue(data, ['单价', '价格', 'unit_price', 'price']));
    sparePartScan.status = RecordStatus.PENDING;
    sparePartScan.originalRowNumber = rowNumber;
    sparePartScan.originalRowData = originalRowData;
    sparePartScan.importBatchId = batchId;
    sparePartScan.createdBy = importedBy;

    await manager.save(sparePartScan);
  }

  private async importCustomerReceipt(
    manager: EntityManager,
    data: Record<string, any>,
    rowNumber: number,
    originalRowData: string,
    batchId: string,
    importedBy: string
  ): Promise<void> {
    const receiptNo = this.getValue(data, ['签收单号', '签收编号', 'receipt_no', 'receiptno', 'id']);
    if (!receiptNo) {
      throw new Error('缺少签收单号');
    }

    const customerReceipt = new CustomerReceipt();
    customerReceipt.receiptNo = String(receiptNo);
    customerReceipt.repairOrderNo = this.getValue(data, ['工单号', '关联工单', 'repair_order_no', 'orderno']);
    customerReceipt.customerName = this.getValue(data, ['客户姓名', '签收人', 'customer_name', 'customer']);
    customerReceipt.receiptTime = this.parseDate(this.getValue(data, ['签收时间', '时间', 'receipt_time', 'time']));
    customerReceipt.photoUrl = this.getValue(data, ['照片地址', '照片', 'photo_url', 'photo', 'image']);
    customerReceipt.photoHash = this.getValue(data, ['照片哈希', 'photo_hash', 'hash']);
    customerReceipt.remark = this.getValue(data, ['备注', 'remark', 'note']);
    customerReceipt.status = RecordStatus.PENDING;
    customerReceipt.originalRowNumber = rowNumber;
    customerReceipt.originalRowData = originalRowData;
    customerReceipt.importBatchId = batchId;
    customerReceipt.createdBy = importedBy;

    await manager.save(customerReceipt);
  }

  private async importManualPriceAdjust(
    manager: EntityManager,
    data: Record<string, any>,
    rowNumber: number,
    originalRowData: string,
    batchId: string,
    importedBy: string
  ): Promise<void> {
    const adjustNo = this.getValue(data, ['改价单号', '调价单号', 'adjust_no', 'adjustno', 'id']);
    if (!adjustNo) {
      throw new Error('缺少改价单号');
    }

    const manualPriceAdjust = new ManualPriceAdjust();
    manualPriceAdjust.adjustNo = String(adjustNo);
    manualPriceAdjust.repairOrderNo = this.getValue(data, ['工单号', '关联工单', 'repair_order_no', 'orderno']);
    manualPriceAdjust.partCode = this.getValue(data, ['备件编码', '零件号', 'part_code', 'partcode']);
    manualPriceAdjust.originalPrice = this.parseNumber(this.getValue(data, ['原价', '原始价格', 'original_price', 'original']));
    manualPriceAdjust.adjustedPrice = this.parseNumber(this.getValue(data, ['调整后价格', '改价', 'adjusted_price', 'newprice']));
    manualPriceAdjust.adjustReason = this.getValue(data, ['改价原因', '原因', 'reason', 'description']);
    manualPriceAdjust.approvedBy = this.getValue(data, ['审批人', '批准人', 'approved_by', 'approver']);
    manualPriceAdjust.adjustDate = this.parseDate(this.getValue(data, ['改价日期', '日期', 'adjust_date', 'date']));
    manualPriceAdjust.status = RecordStatus.PENDING;
    manualPriceAdjust.originalRowNumber = rowNumber;
    manualPriceAdjust.originalRowData = originalRowData;
    manualPriceAdjust.importBatchId = batchId;
    manualPriceAdjust.createdBy = importedBy;

    await manager.save(manualPriceAdjust);
  }

  private async importShiftRecord(
    manager: EntityManager,
    data: Record<string, any>,
    rowNumber: number,
    originalRowData: string,
    batchId: string,
    importedBy: string
  ): Promise<void> {
    const shiftNo = this.getValue(data, ['班次编号', '考勤编号', 'shift_no', 'shiftno', 'id']);
    if (!shiftNo) {
      throw new Error('缺少班次编号');
    }

    const shiftTypeStr = this.getValue(data, ['班次类型', '班次', 'shift_type', 'shift']);
    let shiftType: ShiftType | undefined;
    if (shiftTypeStr) {
      const lower = String(shiftTypeStr).toLowerCase();
      if (lower.includes('早') || lower.includes('morning')) shiftType = ShiftType.MORNING;
      else if (lower.includes('中') || lower.includes('下') || lower.includes('afternoon')) shiftType = ShiftType.AFTERNOON;
      else if (lower.includes('夜') || lower.includes('night')) shiftType = ShiftType.NIGHT;
      else if (lower.includes('加') || lower.includes('overtime')) shiftType = ShiftType.OVERTIME;
    }

    const shiftRecord = new ShiftRecord();
    shiftRecord.shiftNo = String(shiftNo);
    shiftRecord.engineerName = this.getValue(data, ['工程师', '员工', 'engineer_name', 'engineer', 'employee']);
    shiftRecord.shiftType = shiftType ?? null;
    shiftRecord.shiftDate = this.parseDate(this.getValue(data, ['班次日期', '日期', 'shift_date', 'date']));
    shiftRecord.checkInTime = this.parseDate(this.getValue(data, ['签到时间', '上班时间', 'check_in', 'checkin']));
    shiftRecord.checkOutTime = this.parseDate(this.getValue(data, ['签退时间', '下班时间', 'check_out', 'checkout']));
    shiftRecord.remark = this.getValue(data, ['备注', 'remark', 'note']);
    shiftRecord.status = RecordStatus.PENDING;
    shiftRecord.originalRowNumber = rowNumber;
    shiftRecord.originalRowData = originalRowData;
    shiftRecord.importBatchId = batchId;
    shiftRecord.createdBy = importedBy;

    await manager.save(shiftRecord);
  }

  private getValue(data: Record<string, any>, keys: string[]): any {
    for (const key of keys) {
      const lowerKey = key.toLowerCase().replace(/\s+/g, '_');
      if (data[key] !== undefined && data[key] !== null) return data[key];
      if (data[lowerKey] !== undefined && data[lowerKey] !== null) return data[lowerKey];
    }
    return null;
  }

  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(String(value).replace(/[^\d.-]/g, ''));
    return isNaN(num) ? null : num;
  }

  private parseInteger(value: any): number | null {
    const num = this.parseNumber(value);
    return num !== null ? Math.floor(num) : null;
  }

  private parseDate(value: any): Date | null {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return value;
    
    const parsed = dayjs(String(value));
    return parsed.isValid() ? parsed.toDate() : null;
  }

  private generateBatchNumber(sourceType: DataSourceType): string {
    const prefixMap: Record<DataSourceType, string> = {
      [DataSourceType.REPAIR_ORDER]: 'RO',
      [DataSourceType.SPARE_PART_SCAN]: 'SPS',
      [DataSourceType.CUSTOMER_RECEIPT]: 'CR',
      [DataSourceType.MANUAL_PRICE_ADJUST]: 'MPA',
      [DataSourceType.SHIFT_RECORD]: 'SR'
    };

    const prefix = prefixMap[sourceType] || 'IMP';
    const date = dayjs().format('YYYYMMDD');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `${prefix}-${date}-${random}`;
  }

  private getSourceTypeName(sourceType: DataSourceType): string {
    const nameMap: Record<DataSourceType, string> = {
      [DataSourceType.REPAIR_ORDER]: '维修单',
      [DataSourceType.SPARE_PART_SCAN]: '备件扫码',
      [DataSourceType.CUSTOMER_RECEIPT]: '客户签收',
      [DataSourceType.MANUAL_PRICE_ADJUST]: '手工改价',
      [DataSourceType.SHIFT_RECORD]: '班次记录'
    };
    return nameMap[sourceType] || sourceType;
  }

  async getBatchList(page: number = 1, pageSize: number = 20): Promise<{ batches: ImportBatch[]; total: number }> {
    const [batches, total] = await this.batchRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    return { batches, total };
  }

  async getBatchDetail(batchId: string): Promise<ImportBatch | null> {
    return await this.batchRepository.findOne({
      where: { id: batchId },
      relations: ['repairOrders', 'sparePartScans', 'customerReceipts', 'manualPriceAdjusts', 'shiftRecords']
    });
  }
}
