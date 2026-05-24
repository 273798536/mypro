import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Parser } from 'json2csv';
import { v4 as uuidv4 } from 'uuid';
import { RecordType, ImportSource, ProcessingReason } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { recordService } from './record.service';
import { taskService } from './task.service';

export class ImportExportService {
  public async importFromCsv(
    filePath: string,
    recordType: RecordType,
    sourceFileName?: string
  ): Promise<{
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: Array<{ line: number; error: string }>;
  }> {
    const results: any[] = [];
    const errors: Array<{ line: number; error: string }> = [];
    const sourceFile = sourceFileName || path.basename(filePath);

    return new Promise((resolve, reject) => {
      let lineNumber = 0;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          lineNumber++;
          results.push({ data, lineNumber });
        })
        .on('end', async () => {
          logger.info('CSV file parsed', {
            filePath,
            recordType,
            totalRecords: results.length
          });

          const importResult = await this.processImportRecords(
            results,
            recordType,
            sourceFile
          );

          resolve({ ...importResult, errors });
        })
        .on('error', (error) => {
          logger.error('Failed to parse CSV', error);
          reject(error);
        });
    });
  }

  private async processImportRecords(
    records: Array<{ data: any; lineNumber: number }>,
    recordType: RecordType,
    sourceFile: string
  ): Promise<{ total: number; created: number; updated: number; skipped: number }> {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const { data, lineNumber } of records) {
      try {
        const importSource: ImportSource = {
          sourceFile,
          originalLineNumber: lineNumber,
          rawValue: JSON.stringify(data),
          parsedValue: JSON.stringify(this.parseRecordData(recordType, data)),
        };

        const parsedData = this.parseRecordData(recordType, data);
        const existingRecord = await this.findExistingRecord(recordType, parsedData);

        if (existingRecord) {
          const duplicateType = this.checkDuplicateType(existingRecord, parsedData);
          if (duplicateType === 'exact') {
            skipped++;
            logger.info('Skipping exact duplicate', {
              recordType,
              lineNumber,
              sourceFile
            });
            continue;
          }

          await recordService.updateRecord(
            recordType,
            existingRecord.id,
            parsedData,
            importSource,
            duplicateType === 'conflicting'
              ? ProcessingReason.FEE_CALCULATION_ERROR
              : ProcessingReason.DUPLICATE_RECORD
          );
          updated++;
        } else {
          await recordService.createRecord(
            recordType,
            parsedData,
            importSource,
            ProcessingReason.NORMAL
          );
          created++;
        }

      } catch (error) {
        logger.error('Failed to import record', {
          error: (error as Error).message,
          lineNumber,
          recordType,
          sourceFile
        });
        skipped++;
      }
    }

    logger.info('Import completed', {
      recordType,
      sourceFile,
      total: records.length,
      created,
      updated,
      skipped
    });

    return { total: records.length, created, updated, skipped };
  }

  private parseRecordData(recordType: RecordType, data: any): any {
    switch (recordType) {
      case RecordType.BORROW_APPLICATION:
        return {
          applicationNo: data.applicationNo || data.application_no,
          readerId: data.readerId || data.reader_id,
          readerName: data.readerName || data.reader_name,
          isbn: data.isbn,
          bookTitle: data.bookTitle || data.book_title,
          applicantLibrary: data.applicantLibrary || data.applicant_library,
          lendingLibrary: data.lendingLibrary || data.lending_library,
          applicationDate: parseInt(data.applicationDate || data.application_date) || Date.now(),
          status: data.status || 'pending',
          expectedReturnDate: parseInt(data.expectedReturnDate || data.expected_return_date) || Date.now() + 30 * 24 * 60 * 60 * 1000,
          actualReturnDate: data.actualReturnDate || data.actual_return_date
            ? parseInt(data.actualReturnDate || data.actual_return_date)
            : undefined,
        };

      case RecordType.EXPRESS_ORDER:
        return {
          expressNo: data.expressNo || data.express_no,
          relatedApplicationNo: data.relatedApplicationNo || data.related_application_no,
          sender: data.sender,
          receiver: data.receiver,
          sendDate: parseInt(data.sendDate || data.send_date) || Date.now(),
          receiveDate: data.receiveDate || data.receive_date
            ? parseInt(data.receiveDate || data.receive_date)
            : undefined,
          expressCompany: data.expressCompany || data.express_company || 'default',
          freight: parseFloat(data.freight) || 0,
          status: data.status || 'pending',
        };

      case RecordType.COMPENSATION_RECORD:
        return {
          compensationNo: data.compensationNo || data.compensation_no,
          relatedApplicationNo: data.relatedApplicationNo || data.related_application_no,
          readerId: data.readerId || data.reader_id,
          compensationType: data.compensationType || data.compensation_type || 'overdue',
          amount: parseFloat(data.amount) || 0,
          compensationDate: parseInt(data.compensationDate || data.compensation_date) || Date.now(),
          status: data.status || 'pending',
          remark: data.remark,
        };

      case RecordType.SHIFT_RECORD:
        return {
          shiftNo: data.shiftNo || data.shift_no,
          operatorId: data.operatorId || data.operator_id,
          operatorName: data.operatorName || data.operator_name,
          shiftDate: parseInt(data.shiftDate || data.shift_date) || Date.now(),
          shiftType: data.shiftType || data.shift_type || 'morning',
          processedRecords: parseInt(data.processedRecords || data.processed_records) || 0,
          remark: data.remark,
        };

      default:
        throw new Error(`Unknown record type: ${recordType}`);
    }
  }

  private async findExistingRecord(recordType: RecordType, data: any): Promise<any> {
    const businessKey = this.generateBusinessKey(recordType, data);
    return recordService.findByBusinessKey(recordType, businessKey);
  }

  private generateBusinessKey(recordType: RecordType, data: any): string {
    let keyComponents: string[] = [];

    switch (recordType) {
      case RecordType.BORROW_APPLICATION:
        keyComponents = [data.applicationNo, data.readerId, data.isbn];
        break;
      case RecordType.EXPRESS_ORDER:
        keyComponents = [data.expressNo, data.relatedApplicationNo];
        break;
      case RecordType.COMPENSATION_RECORD:
        keyComponents = [data.compensationNo, data.relatedApplicationNo, data.compensationType];
        break;
      case RecordType.SHIFT_RECORD:
        keyComponents = [data.shiftNo, data.operatorId, String(data.shiftDate)];
        break;
      default:
        throw new Error(`Unknown record type: ${recordType}`);
    }

    return keyComponents.filter(Boolean).join('|');
  }

  private checkDuplicateType(existing: any, newData: any): 'exact' | 'partial' | 'conflicting' {
    const existingStr = JSON.stringify({
      ...existing,
      id: undefined,
      businessKey: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      version: undefined,
      importSource: undefined
    });
    const newStr = JSON.stringify(newData);

    if (existingStr === newStr) {
      return 'exact';
    }

    const criticalFields = this.getCriticalFields(existing.recordType);
    for (const field of criticalFields) {
      if (newData[field] !== undefined &&
          existing[field] !== undefined &&
          newData[field] !== existing[field]) {
        return 'conflicting';
      }
    }

    return 'partial';
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

  public async exportToCsv(
    recordType: RecordType,
    outputFileName?: string
  ): Promise<string> {
    const { records } = await recordService.getRecords(recordType, { pageSize: 10000 });

    const exportRecords = records.map((record: any) => ({
      id: record.id,
      businessKey: record.businessKey,
      version: record.version,
      processingReason: record.processingReason,
      sourceFile: record.importSource?.sourceFile,
      originalLineNumber: record.importSource?.originalLineNumber,
      ...this.flattenRecord(recordType, record),
    }));

    const parser = new Parser();
    const csv = parser.parse(exportRecords);

    const fileName = outputFileName || `${recordType}_export_${Date.now()}.csv`;
    const outputPath = path.join(config.export.dir, fileName);

    if (!fs.existsSync(config.export.dir)) {
      fs.mkdirSync(config.export.dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, csv, 'utf-8');

    logger.info('Export completed', {
      recordType,
      fileName,
      recordCount: records.length,
      outputPath
    });

    return outputPath;
  }

  private flattenRecord(recordType: RecordType, record: any): any {
    switch (recordType) {
      case RecordType.BORROW_APPLICATION:
        return {
          applicationNo: record.applicationNo,
          readerId: record.readerId,
          readerName: record.readerName,
          isbn: record.isbn,
          bookTitle: record.bookTitle,
          applicantLibrary: record.applicantLibrary,
          lendingLibrary: record.lendingLibrary,
          applicationDate: record.applicationDate,
          status: record.status,
          expectedReturnDate: record.expectedReturnDate,
          actualReturnDate: record.actualReturnDate,
        };

      case RecordType.EXPRESS_ORDER:
        return {
          expressNo: record.expressNo,
          relatedApplicationNo: record.relatedApplicationNo,
          sender: record.sender,
          receiver: record.receiver,
          sendDate: record.sendDate,
          receiveDate: record.receiveDate,
          expressCompany: record.expressCompany,
          freight: record.freight,
          status: record.status,
        };

      case RecordType.COMPENSATION_RECORD:
        return {
          compensationNo: record.compensationNo,
          relatedApplicationNo: record.relatedApplicationNo,
          readerId: record.readerId,
          compensationType: record.compensationType,
          amount: record.amount,
          compensationDate: record.compensationDate,
          status: record.status,
          remark: record.remark,
        };

      case RecordType.SHIFT_RECORD:
        return {
          shiftNo: record.shiftNo,
          operatorId: record.operatorId,
          operatorName: record.operatorName,
          shiftDate: record.shiftDate,
          shiftType: record.shiftType,
          processedRecords: record.processedRecords,
          remark: record.remark,
        };

      default:
        return record;
    }
  }

  public async importFromJson(
    records: any[],
    recordType: RecordType,
    sourceFile: string
  ): Promise<{ total: number; created: number; updated: number; skipped: number }> {
    return this.processImportRecords(
      records.map((data, index) => ({ data, lineNumber: index + 1 })),
      recordType,
      sourceFile
    );
  }

  public async processImportWithTasks(
    records: any[],
    recordType: RecordType,
    sourceFile: string
  ): Promise<{
    total: number;
    created: number;
    updated: number;
    skipped: number;
    taskIds: string[];
  }> {
    const result = await this.importFromJson(records, recordType, sourceFile);
    const taskIds: string[] = [];

    const { records: importedRecords } = await recordService.getRecords(
      recordType,
      { pageSize: result.created + result.updated }
    );

    for (const record of importedRecords) {
      const task = await taskService.createTask(record.id, recordType);
      taskIds.push(task.id);
    }

    return { ...result, taskIds };
  }
}

export const importExportService = new ImportExportService();
