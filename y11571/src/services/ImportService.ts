import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  Ticket,
  SessionSummary,
  SLARule,
  CompensationApproval,
  CustomerServiceNote,
  ExceptionPhoto,
  AssignmentHistory,
  ImportRecord,
  ImportError,
  EntityType,
} from '../types';
import { storage } from '../storage/FileStorage';
import { validationService } from './ValidationService';
import { calculateDiff } from '../utils/diff';

interface ImportResult {
  batchId: string;
  successCount: number;
  failedCount: number;
  errors: ImportError[];
}

export class ImportService {
  private generateBatchId(): string {
    return `batch_${Date.now()}_${uuidv4().slice(0, 8)}`;
  }

  private createImportError(
    batchId: string,
    recordType: string,
    rowNumber: number,
    errorType: string,
    errorMessage: string,
    rawData: Record<string, unknown>
  ): ImportError {
    return {
      id: uuidv4(),
      batchId,
      recordType,
      originalRowNumber: rowNumber,
      errorType,
      errorMessage,
      rawData,
      createdAt: new Date().toISOString(),
    };
  }

  private isDuplicateRecord(
    recordType: EntityType,
    data: Record<string, unknown>,
    existingRecords: unknown[]
  ): boolean {
    switch (recordType) {
      case 'ticket':
        return existingRecords.some(
          (r) => (r as Ticket).ticketNo === data.ticketNo
        );
      case 'sessionSummary':
        return existingRecords.some(
          (r) =>
            (r as SessionSummary).ticketId === data.ticketId &&
            (r as SessionSummary).summary === data.summary
        );
      case 'slaRule':
        return existingRecords.some(
          (r) =>
            (r as SLARule).ticketId === data.ticketId &&
            (r as SLARule).ruleName === data.ruleName
        );
      case 'compensationApproval':
        return existingRecords.some(
          (r) =>
            (r as CompensationApproval).ticketId === data.ticketId &&
            (r as CompensationApproval).amount === data.amount
        );
      case 'customerServiceNote':
        return existingRecords.some(
          (r) =>
            (r as CustomerServiceNote).ticketId === data.ticketId &&
            (r as CustomerServiceNote).content === data.content
        );
      case 'exceptionPhoto':
        return existingRecords.some(
          (r) =>
            (r as ExceptionPhoto).ticketId === data.ticketId &&
            (r as ExceptionPhoto).fileName === data.fileName
        );
      case 'assignmentHistory':
        return existingRecords.some(
          (r) =>
            (r as AssignmentHistory).ticketId === data.ticketId &&
            (r as AssignmentHistory).transferredAt === data.transferredAt
        );
      default:
        return false;
    }
  }

  importFromJsonFile(
    filePath: string,
    recordType: EntityType,
    importedBy: string = 'system',
    skipDuplicates: boolean = true
  ): ImportResult {
    const batchId = this.generateBatchId();
    const errors: ImportError[] = [];
    let successCount = 0;

    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    let records: Record<string, unknown>[];

    try {
      records = JSON.parse(content);
      if (!Array.isArray(records)) {
        records = [records];
      }
    } catch (e) {
      throw new Error(`JSON 解析失败: ${(e as Error).message}`);
    }

    const existingRecords = this.getExistingRecords(recordType);

    for (let i = 0; i < records.length; i++) {
      const rowNumber = i + 1;
      const data = records[i];

      try {
        const validationResult = this.validateRecord(recordType, data);
        if (!validationResult.isValid) {
          errors.push(
            this.createImportError(
              batchId,
              recordType,
              rowNumber,
              'validation_error',
              validationResult.errors.join('; '),
              data
            )
          );
          continue;
        }

        if (skipDuplicates && this.isDuplicateRecord(recordType, data, existingRecords)) {
          errors.push(
            this.createImportError(
              batchId,
              recordType,
              rowNumber,
              'duplicate_record',
              '检测到重复记录，已跳过',
              data
            )
          );
          continue;
        }

        const entity = this.createEntity(recordType, data, batchId, rowNumber);
        this.saveEntity(recordType, entity, existingRecords);

        const before = null;
        const after = entity as Record<string, unknown>;
        storage.addHistoryRecord({
          entityType: recordType,
          entityId: (entity as { id: string }).id,
          action: 'import',
          before,
          after,
          diff: calculateDiff(before, after),
          performedBy: importedBy,
          batchId,
        });

        successCount++;
      } catch (e) {
        errors.push(
          this.createImportError(
            batchId,
            recordType,
            rowNumber,
            'import_error',
            (e as Error).message,
            data
          )
        );
      }
    }

    this.saveAllRecords(recordType, existingRecords);

    const importErrors = storage.getImportErrors();
    importErrors.push(...errors);
    storage.saveImportErrors(importErrors);

    const importRecord: ImportRecord = {
      id: uuidv4(),
      batchId,
      sourceType: recordType,
      sourceFile: path.basename(filePath),
      importedAt: new Date().toISOString(),
      importedBy,
      totalRecords: records.length,
      successCount,
      failedCount: errors.length,
      status:
        errors.length === 0
          ? 'completed'
          : successCount > 0
          ? 'partial'
          : 'failed',
    };

    const importRecords = storage.getImportRecords();
    importRecords.push(importRecord);
    storage.saveImportRecords(importRecords);

    return {
      batchId,
      successCount,
      failedCount: errors.length,
      errors,
    };
  }

  private getExistingRecords(recordType: EntityType): unknown[] {
    switch (recordType) {
      case 'ticket':
        return storage.getTickets();
      case 'sessionSummary':
        return storage.getSessionSummaries();
      case 'slaRule':
        return storage.getSLARules();
      case 'compensationApproval':
        return storage.getCompensationApprovals();
      case 'customerServiceNote':
        return storage.getCustomerServiceNotes();
      case 'exceptionPhoto':
        return storage.getExceptionPhotos();
      case 'assignmentHistory':
        return storage.getAssignmentHistories();
      default:
        return [];
    }
  }

  private validateRecord(
    recordType: EntityType,
    data: Record<string, unknown>
  ): { isValid: boolean; errors: string[] } {
    switch (recordType) {
      case 'ticket':
        return validationService.validateTicket(data);
      case 'sessionSummary':
        return validationService.validateSessionSummary(data);
      case 'slaRule':
        return validationService.validateSLARule(data);
      case 'compensationApproval':
        return validationService.validateCompensationApproval(data);
      case 'customerServiceNote':
        return validationService.validateCustomerServiceNote(data);
      case 'exceptionPhoto':
        return validationService.validateExceptionPhoto(data);
      case 'assignmentHistory':
        return validationService.validateAssignmentHistory(data);
      default:
        return { isValid: true, errors: [] };
    }
  }

  private createEntity(
    recordType: EntityType,
    data: Record<string, unknown>,
    batchId: string,
    rowNumber: number
  ): unknown {
    const now = new Date().toISOString();
    const baseEntity = {
      id: uuidv4(),
      importBatchId: batchId,
      originalRowNumber: rowNumber,
    };

    switch (recordType) {
      case 'ticket':
        return {
          ...baseEntity,
          ticketNo: data.ticketNo,
          title: data.title,
          status: data.status || 'open',
          priority: data.priority || 'medium',
          createdAt: (data.createdAt as string) || now,
          updatedAt: (data.updatedAt as string) || now,
          assignee: (data.assignee as string) || '',
          department: (data.department as string) || '',
          source: (data.source as string) || 'import',
        } as Ticket;

      case 'sessionSummary':
        return {
          ...baseEntity,
          ticketId: data.ticketId,
          summary: data.summary,
          keyPoints: (data.keyPoints as string[]) || [],
          createdAt: (data.createdAt as string) || now,
          createdBy: (data.createdBy as string) || 'import',
        } as SessionSummary;

      case 'slaRule':
        return {
          ...baseEntity,
          ticketId: data.ticketId,
          ruleName: data.ruleName,
          responseTime: (data.responseTime as number) || 0,
          resolutionTime: (data.resolutionTime as number) || 0,
          warningTime: (data.warningTime as number) || 0,
          startTime: (data.startTime as string) || now,
          deadline: (data.deadline as string) || now,
          isViolated: (data.isViolated as boolean) || false,
          actualResponseTime: data.actualResponseTime as number,
          actualResolutionTime: data.actualResolutionTime as number,
        } as SLARule;

      case 'compensationApproval':
        return {
          ...baseEntity,
          ticketId: data.ticketId,
          amount: data.amount,
          reason: data.reason,
          status: (data.status as string) || 'pending',
          approver: data.approver as string,
          approvedAt: data.approvedAt as string,
          createdAt: (data.createdAt as string) || now,
          createdBy: (data.createdBy as string) || 'import',
        } as CompensationApproval;

      case 'customerServiceNote':
        return {
          ...baseEntity,
          ticketId: data.ticketId,
          content: data.content,
          createdAt: (data.createdAt as string) || now,
          createdBy: (data.createdBy as string) || 'import',
          type: (data.type as string) || 'internal',
        } as CustomerServiceNote;

      case 'exceptionPhoto':
        return {
          ...baseEntity,
          ticketId: data.ticketId,
          fileName: data.fileName,
          filePath: data.filePath,
          uploadedAt: (data.uploadedAt as string) || now,
          uploadedBy: (data.uploadedBy as string) || 'import',
          description: data.description as string,
        } as ExceptionPhoto;

      case 'assignmentHistory':
        return {
          ...baseEntity,
          ticketId: data.ticketId,
          fromAssignee: (data.fromAssignee as string) || '',
          toAssignee: data.toAssignee,
          fromDepartment: (data.fromDepartment as string) || '',
          toDepartment: (data.toDepartment as string) || '',
          transferredAt: data.transferredAt,
          reason: (data.reason as string) || '',
        } as AssignmentHistory;

      default:
        return null;
    }
  }

  private saveEntity(
    recordType: EntityType,
    entity: unknown,
    existingRecords: unknown[]
  ): void {
    (existingRecords as unknown[]).push(entity);
  }

  private saveAllRecords(recordType: EntityType, records: unknown[]): void {
    switch (recordType) {
      case 'ticket':
        storage.saveTickets(records as Ticket[]);
        break;
      case 'sessionSummary':
        storage.saveSessionSummaries(records as SessionSummary[]);
        break;
      case 'slaRule':
        storage.saveSLARules(records as SLARule[]);
        break;
      case 'compensationApproval':
        storage.saveCompensationApprovals(records as CompensationApproval[]);
        break;
      case 'customerServiceNote':
        storage.saveCustomerServiceNotes(records as CustomerServiceNote[]);
        break;
      case 'exceptionPhoto':
        storage.saveExceptionPhotos(records as ExceptionPhoto[]);
        break;
      case 'assignmentHistory':
        storage.saveAssignmentHistories(records as AssignmentHistory[]);
        break;
    }
  }

  getImportBatches(): ImportRecord[] {
    return storage.getImportRecords();
  }

  getBatchErrors(batchId: string): ImportError[] {
    return storage.getImportErrors().filter((e) => e.batchId === batchId);
  }
}

export const importService = new ImportService();
