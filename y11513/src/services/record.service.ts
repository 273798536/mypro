import { v4 as uuidv4 } from 'uuid';
import { db } from '../models/database';
import {
  RecordType,
  DataRecord,
  BorrowApplication,
  ExpressOrder,
  CompensationRecord,
  ShiftRecord,
  ImportSource,
  ProcessingReason,
  QueryParams,
} from '../types';
import { deduplicationService } from './deduplication.service';
import { logger } from '../utils/logger';

export class RecordService {
  private getTableName(recordType: RecordType): string {
    switch (recordType) {
      case RecordType.BORROW_APPLICATION:
        return 'borrow_applications';
      case RecordType.EXPRESS_ORDER:
        return 'express_orders';
      case RecordType.COMPENSATION_RECORD:
        return 'compensation_records';
      case RecordType.SHIFT_RECORD:
        return 'shift_records';
      default:
        throw new Error(`Unknown record type: ${recordType}`);
    }
  }

  private getUniqueField(recordType: RecordType): string {
    switch (recordType) {
      case RecordType.BORROW_APPLICATION:
        return 'application_no';
      case RecordType.EXPRESS_ORDER:
        return 'express_no';
      case RecordType.COMPENSATION_RECORD:
        return 'compensation_no';
      case RecordType.SHIFT_RECORD:
        return 'shift_no';
      default:
        throw new Error(`Unknown record type: ${recordType}`);
    }
  }

  public async findByBusinessKey(
    recordType: RecordType,
    businessKey: string
  ): Promise<DataRecord | undefined> {
    const tableName = this.getTableName(recordType);
    const sql = `SELECT * FROM ${tableName} WHERE business_key = ? AND is_deleted = 0`;
    const row = await db.get(sql, [businessKey]);

    if (!row) return undefined;

    return this.mapRowToRecord(recordType, row);
  }

  public async createRecord(
    recordType: RecordType,
    data: any,
    importSource: ImportSource,
    processingReason: ProcessingReason = ProcessingReason.NORMAL
  ): Promise<DataRecord> {
    const businessKey = deduplicationService.generateBusinessKey(recordType, data);
    const existingRecord = await this.findByBusinessKey(recordType, businessKey);

    if (existingRecord) {
      return this.updateRecord(recordType, existingRecord.id, data, importSource, processingReason);
    }

    const record = this.buildRecord(recordType, data, importSource, processingReason, businessKey);
    await this.insertRecord(recordType, record);
    await this.createHistoryRecord(record, 'create', 'system', 'Import new record');

    logger.info('Created new record', {
      recordType,
      recordId: record.id,
      businessKey: record.businessKey,
      sourceFile: importSource.sourceFile,
      lineNumber: importSource.originalLineNumber,
    });

    return record;
  }

  public async updateRecord(
    recordType: RecordType,
    recordId: string,
    data: any,
    importSource: ImportSource,
    processingReason: ProcessingReason = ProcessingReason.DUPLICATE_RECORD
  ): Promise<DataRecord> {
    const existingRecord = await this.getRecordById(recordType, recordId);
    if (!existingRecord) {
      throw new Error(`Record not found: ${recordId}`);
    }

    const duplicateType = deduplicationService.detectDuplicateType(
      existingRecord,
      { ...data, importSource } as Partial<DataRecord>
    );

    if (duplicateType === 'exact') {
      logger.info('Skipping exact duplicate record', {
        recordId,
        sourceFile: importSource.sourceFile,
        lineNumber: importSource.originalLineNumber,
      });
      return existingRecord;
    }

    const mergedRecord = deduplicationService.mergeRecords(existingRecord, {
      ...data,
      importSource,
      processingReason: duplicateType === 'conflicting' 
        ? ProcessingReason.FEE_CALCULATION_ERROR 
        : processingReason,
    });

    await this.updateRecordInDb(recordType, mergedRecord);
    await this.createHistoryRecord(
      mergedRecord,
      'update',
      'system',
      `Update due to ${duplicateType} duplicate`,
      existingRecord,
      importSource
    );

    logger.info('Updated existing record', {
      recordType,
      recordId,
      duplicateType,
      oldVersion: existingRecord.version,
      newVersion: mergedRecord.version,
      sourceFile: importSource.sourceFile,
      lineNumber: importSource.originalLineNumber,
    });

    return mergedRecord;
  }

  private buildRecord(
    recordType: RecordType,
    data: any,
    importSource: ImportSource,
    processingReason: ProcessingReason,
    businessKey: string
  ): DataRecord {
    const now = Date.now();
    const baseRecord = {
      id: uuidv4(),
      recordType,
      businessKey,
      createdAt: now,
      updatedAt: now,
      importSource,
      processingReason,
      version: 1,
      isDeleted: false,
    };

    switch (recordType) {
      case RecordType.BORROW_APPLICATION:
        return {
          ...baseRecord,
          applicationNo: data.applicationNo,
          readerId: data.readerId,
          readerName: data.readerName,
          isbn: data.isbn,
          bookTitle: data.bookTitle,
          applicantLibrary: data.applicantLibrary,
          lendingLibrary: data.lendingLibrary,
          applicationDate: data.applicationDate,
          status: data.status,
          expectedReturnDate: data.expectedReturnDate,
          actualReturnDate: data.actualReturnDate,
        } as BorrowApplication;

      case RecordType.EXPRESS_ORDER:
        return {
          ...baseRecord,
          expressNo: data.expressNo,
          relatedApplicationNo: data.relatedApplicationNo,
          sender: data.sender,
          receiver: data.receiver,
          sendDate: data.sendDate,
          receiveDate: data.receiveDate,
          expressCompany: data.expressCompany,
          freight: data.freight,
          status: data.status,
        } as ExpressOrder;

      case RecordType.COMPENSATION_RECORD:
        return {
          ...baseRecord,
          compensationNo: data.compensationNo,
          relatedApplicationNo: data.relatedApplicationNo,
          readerId: data.readerId,
          compensationType: data.compensationType,
          amount: data.amount,
          compensationDate: data.compensationDate,
          status: data.status,
          remark: data.remark,
        } as CompensationRecord;

      case RecordType.SHIFT_RECORD:
        return {
          ...baseRecord,
          shiftNo: data.shiftNo,
          operatorId: data.operatorId,
          operatorName: data.operatorName,
          shiftDate: data.shiftDate,
          shiftType: data.shiftType,
          processedRecords: data.processedRecords,
          remark: data.remark,
        } as ShiftRecord;

      default:
        throw new Error(`Unknown record type: ${recordType}`);
    }
  }

  private async insertRecord(recordType: RecordType, record: DataRecord): Promise<void> {
    const tableName = this.getTableName(recordType);
    const r = record as any;

    switch (recordType) {
      case RecordType.BORROW_APPLICATION:
        await db.run(
          `INSERT INTO ${tableName} (
            id, application_no, business_key, reader_id, reader_name, isbn, book_title,
            applicant_library, lending_library, application_date, status,
            expected_return_date, actual_return_date, processing_reason, version, is_deleted,
            source_file, original_line_number, raw_value, parsed_value, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.id, r.applicationNo, r.businessKey, r.readerId, r.readerName, r.isbn, r.bookTitle,
            r.applicantLibrary, r.lendingLibrary, r.applicationDate, r.status,
            r.expectedReturnDate, r.actualReturnDate, r.processingReason, r.version, 0,
            r.importSource.sourceFile, r.importSource.originalLineNumber,
            r.importSource.rawValue, r.importSource.parsedValue, r.createdAt, r.updatedAt
          ]
        );
        break;

      case RecordType.EXPRESS_ORDER:
        await db.run(
          `INSERT INTO ${tableName} (
            id, express_no, business_key, related_application_no, sender, receiver,
            send_date, receive_date, express_company, freight, status, processing_reason,
            version, is_deleted, source_file, original_line_number, raw_value, parsed_value,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.id, r.expressNo, r.businessKey, r.relatedApplicationNo, r.sender, r.receiver,
            r.sendDate, r.receiveDate, r.expressCompany, r.freight, r.status, r.processingReason,
            r.version, 0, r.importSource.sourceFile, r.importSource.originalLineNumber,
            r.importSource.rawValue, r.importSource.parsedValue, r.createdAt, r.updatedAt
          ]
        );
        break;

      case RecordType.COMPENSATION_RECORD:
        await db.run(
          `INSERT INTO ${tableName} (
            id, compensation_no, business_key, related_application_no, reader_id,
            compensation_type, amount, compensation_date, status, remark, processing_reason,
            version, is_deleted, source_file, original_line_number, raw_value, parsed_value,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.id, r.compensationNo, r.businessKey, r.relatedApplicationNo, r.readerId,
            r.compensationType, r.amount, r.compensationDate, r.status, r.remark, r.processingReason,
            r.version, 0, r.importSource.sourceFile, r.importSource.originalLineNumber,
            r.importSource.rawValue, r.importSource.parsedValue, r.createdAt, r.updatedAt
          ]
        );
        break;

      case RecordType.SHIFT_RECORD:
        await db.run(
          `INSERT INTO ${tableName} (
            id, shift_no, business_key, operator_id, operator_name, shift_date, shift_type,
            processed_records, remark, processing_reason, version, is_deleted,
            source_file, original_line_number, raw_value, parsed_value, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.id, r.shiftNo, r.businessKey, r.operatorId, r.operatorName, r.shiftDate, r.shiftType,
            r.processedRecords, r.remark, r.processingReason, r.version, 0,
            r.importSource.sourceFile, r.importSource.originalLineNumber,
            r.importSource.rawValue, r.importSource.parsedValue, r.createdAt, r.updatedAt
          ]
        );
        break;
    }
  }

  private async updateRecordInDb(recordType: RecordType, record: DataRecord): Promise<void> {
    const tableName = this.getTableName(recordType);
    const r = record as any;

    switch (recordType) {
      case RecordType.BORROW_APPLICATION:
        await db.run(
          `UPDATE ${tableName} SET
            reader_name = ?, isbn = ?, book_title = ?, applicant_library = ?,
            lending_library = ?, application_date = ?, status = ?,
            expected_return_date = ?, actual_return_date = ?, processing_reason = ?,
            version = ?, source_file = ?, original_line_number = ?,
            raw_value = ?, parsed_value = ?, updated_at = ?
          WHERE id = ?`,
          [
            r.readerName, r.isbn, r.bookTitle, r.applicantLibrary,
            r.lendingLibrary, r.applicationDate, r.status,
            r.expectedReturnDate, r.actualReturnDate, r.processingReason,
            r.version, r.importSource.sourceFile, r.importSource.originalLineNumber,
            r.importSource.rawValue, r.importSource.parsedValue, r.updatedAt, r.id
          ]
        );
        break;

      case RecordType.EXPRESS_ORDER:
        await db.run(
          `UPDATE ${tableName} SET
            related_application_no = ?, sender = ?, receiver = ?, send_date = ?,
            receive_date = ?, express_company = ?, freight = ?, status = ?,
            processing_reason = ?, version = ?, source_file = ?, original_line_number = ?,
            raw_value = ?, parsed_value = ?, updated_at = ?
          WHERE id = ?`,
          [
            r.relatedApplicationNo, r.sender, r.receiver, r.sendDate,
            r.receiveDate, r.expressCompany, r.freight, r.status,
            r.processingReason, r.version, r.importSource.sourceFile, r.importSource.originalLineNumber,
            r.importSource.rawValue, r.importSource.parsedValue, r.updatedAt, r.id
          ]
        );
        break;

      case RecordType.COMPENSATION_RECORD:
        await db.run(
          `UPDATE ${tableName} SET
            related_application_no = ?, reader_id = ?, compensation_type = ?,
            amount = ?, compensation_date = ?, status = ?, remark = ?,
            processing_reason = ?, version = ?, source_file = ?, original_line_number = ?,
            raw_value = ?, parsed_value = ?, updated_at = ?
          WHERE id = ?`,
          [
            r.relatedApplicationNo, r.readerId, r.compensationType,
            r.amount, r.compensationDate, r.status, r.remark,
            r.processingReason, r.version, r.importSource.sourceFile, r.importSource.originalLineNumber,
            r.importSource.rawValue, r.importSource.parsedValue, r.updatedAt, r.id
          ]
        );
        break;

      case RecordType.SHIFT_RECORD:
        await db.run(
          `UPDATE ${tableName} SET
            operator_id = ?, operator_name = ?, shift_date = ?, shift_type = ?,
            processed_records = ?, remark = ?, processing_reason = ?, version = ?,
            source_file = ?, original_line_number = ?, raw_value = ?, parsed_value = ?,
            updated_at = ?
          WHERE id = ?`,
          [
            r.operatorId, r.operatorName, r.shiftDate, r.shiftType,
            r.processedRecords, r.remark, r.processingReason, r.version,
            r.importSource.sourceFile, r.importSource.originalLineNumber,
            r.importSource.rawValue, r.importSource.parsedValue, r.updatedAt, r.id
          ]
        );
        break;
    }
  }

  public async getRecordById(
    recordType: RecordType,
    id: string
  ): Promise<DataRecord | undefined> {
    const tableName = this.getTableName(recordType);
    const sql = `SELECT * FROM ${tableName} WHERE id = ? AND is_deleted = 0`;
    const row = await db.get(sql, [id]);

    if (!row) return undefined;

    return this.mapRowToRecord(recordType, row);
  }

  private mapRowToRecord(recordType: RecordType, row: any): DataRecord {
    const baseRecord = {
      id: row.id,
      recordType,
      businessKey: row.business_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      importSource: {
        sourceFile: row.source_file,
        originalLineNumber: row.original_line_number,
        rawValue: row.raw_value,
        parsedValue: row.parsed_value,
      },
      processingReason: row.processing_reason,
      version: row.version,
      isDeleted: row.is_deleted === 1,
    };

    switch (recordType) {
      case RecordType.BORROW_APPLICATION:
        return {
          ...baseRecord,
          applicationNo: row.application_no,
          readerId: row.reader_id,
          readerName: row.reader_name,
          isbn: row.isbn,
          bookTitle: row.book_title,
          applicantLibrary: row.applicant_library,
          lendingLibrary: row.lending_library,
          applicationDate: row.application_date,
          status: row.status,
          expectedReturnDate: row.expected_return_date,
          actualReturnDate: row.actual_return_date,
        } as BorrowApplication;

      case RecordType.EXPRESS_ORDER:
        return {
          ...baseRecord,
          expressNo: row.express_no,
          relatedApplicationNo: row.related_application_no,
          sender: row.sender,
          receiver: row.receiver,
          sendDate: row.send_date,
          receiveDate: row.receive_date,
          expressCompany: row.express_company,
          freight: row.freight,
          status: row.status,
        } as ExpressOrder;

      case RecordType.COMPENSATION_RECORD:
        return {
          ...baseRecord,
          compensationNo: row.compensation_no,
          relatedApplicationNo: row.related_application_no,
          readerId: row.reader_id,
          compensationType: row.compensation_type,
          amount: row.amount,
          compensationDate: row.compensation_date,
          status: row.status,
          remark: row.remark,
        } as CompensationRecord;

      case RecordType.SHIFT_RECORD:
        return {
          ...baseRecord,
          shiftNo: row.shift_no,
          operatorId: row.operator_id,
          operatorName: row.operator_name,
          shiftDate: row.shift_date,
          shiftType: row.shift_type,
          processedRecords: row.processed_records,
          remark: row.remark,
        } as ShiftRecord;

      default:
        throw new Error(`Unknown record type: ${recordType}`);
    }
  }

  public async getRecords(
    recordType: RecordType,
    params: QueryParams = {}
  ): Promise<{ records: DataRecord[]; total: number }> {
    const tableName = this.getTableName(recordType);
    const { page = 1, pageSize = 20, status, startDate, endDate, keyword } = params;

    let whereConditions = ['is_deleted = 0'];
    let queryParams: any[] = [];

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    if (startDate) {
      whereConditions.push('created_at >= ?');
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push('created_at <= ?');
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const countSql = `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`;
    const countResult = await db.get(countSql, queryParams);
    const total = (countResult as any).count;

    const offset = (page - 1) * pageSize;
    const recordsSql = `SELECT * FROM ${tableName} ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const rows = await db.all(recordsSql, [...queryParams, pageSize, offset]);

    const records = rows.map(row => this.mapRowToRecord(recordType, row));

    return { records, total };
  }

  private async createHistoryRecord(
    record: DataRecord,
    operation: 'create' | 'update' | 'delete' | 'import' | 'replay',
    operator: string,
    changeReason: string,
    beforeChange?: DataRecord,
    importSource?: ImportSource
  ): Promise<void> {
    const historyId = uuidv4();
    const timestamp = Date.now();

    await db.run(
      `INSERT INTO history_records (
        id, record_id, record_type, operation, operator, before_change,
        after_change, change_reason, source_file, original_line_number,
        raw_value, parsed_value, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        historyId,
        record.id,
        record.recordType,
        operation,
        operator,
        beforeChange ? JSON.stringify(beforeChange) : null,
        JSON.stringify(record),
        changeReason,
        importSource?.sourceFile || record.importSource.sourceFile,
        importSource?.originalLineNumber || record.importSource.originalLineNumber,
        importSource?.rawValue || record.importSource.rawValue,
        importSource?.parsedValue || record.importSource.parsedValue,
        timestamp
      ]
    );
  }

  public async getRecordHistory(
    recordType: RecordType,
    recordId: string
  ): Promise<any[]> {
    const sql = `
      SELECT * FROM history_records
      WHERE record_id = ? AND record_type = ?
      ORDER BY timestamp DESC
    `;
    const rows = await db.all(sql, [recordId, recordType]);

    return rows.map(row => ({
      id: row.id,
      operation: row.operation,
      operator: row.operator,
      changeReason: row.change_reason,
      beforeChange: row.before_change ? JSON.parse(row.before_change) : null,
      afterChange: row.after_change ? JSON.parse(row.after_change) : null,
      importSource: {
        sourceFile: row.source_file,
        originalLineNumber: row.original_line_number,
        rawValue: row.raw_value,
        parsedValue: row.parsed_value,
      },
      timestamp: row.timestamp,
    }));
  }
}

export const recordService = new RecordService();
