import * as fs from 'fs';
import * as path from 'path';
import {
  Ticket,
  SessionSummary,
  SLARule,
  CompensationApproval,
  CustomerServiceNote,
  ExceptionPhoto,
  AssignmentHistory,
  ImportError,
  HistoryRecord,
  EntityType,
  ConsistencyCheckResult,
} from '../types';
import { storage } from '../storage/FileStorage';

export interface ExportOptions {
  includeHistory?: boolean;
  includeErrors?: boolean;
  format?: 'json' | 'csv';
}

export class ExportService {
  exportAllData(options: ExportOptions = {}): string {
    const data = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
      },
      tickets: storage.getTickets(),
      sessionSummaries: storage.getSessionSummaries(),
      slaRules: storage.getSLARules(),
      compensationApprovals: storage.getCompensationApprovals(),
      customerServiceNotes: storage.getCustomerServiceNotes(),
      exceptionPhotos: storage.getExceptionPhotos(),
      assignmentHistories: storage.getAssignmentHistories(),
      importRecords: storage.getImportRecords(),
      ...(options.includeErrors && { importErrors: storage.getImportErrors() }),
      ...(options.includeHistory && { history: storage.getHistory() }),
    };

    const fileName = `export_${Date.now()}.json`;
    const filePath = path.join(storage.getExportDir(), fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return filePath;
  }

  exportTickets(): string {
    const tickets = storage.getTickets();
    const fileName = `tickets_${Date.now()}.json`;
    const filePath = path.join(storage.getExportDir(), fileName);
    fs.writeFileSync(filePath, JSON.stringify(tickets, null, 2), 'utf-8');
    return filePath;
  }

  exportFailedRecords(batchId?: string): string {
    let errors = storage.getImportErrors();
    if (batchId) {
      errors = errors.filter((e) => e.batchId === batchId);
    }

    const fileName = `failed_records_${Date.now()}.json`;
    const filePath = path.join(storage.getExportDir(), fileName);

    const data = errors.map((e) => ({
      originalRowNumber: e.originalRowNumber,
      recordType: e.recordType,
      errorType: e.errorType,
      errorMessage: e.errorMessage,
      rawData: e.rawData,
    }));

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return filePath;
  }

  exportTicketDetail(ticketId: string): string | null {
    const ticket = storage.getTickets().find((t) => t.id === ticketId);
    if (!ticket) {
      return null;
    }

    const detail = {
      ticket,
      sessionSummaries: storage.getSessionSummaries().filter((s) => s.ticketId === ticketId),
      slaRules: storage.getSLARules().filter((s) => s.ticketId === ticketId),
      compensationApprovals: storage.getCompensationApprovals().filter((c) => c.ticketId === ticketId),
      customerServiceNotes: storage.getCustomerServiceNotes().filter((n) => n.ticketId === ticketId),
      exceptionPhotos: storage.getExceptionPhotos().filter((p) => p.ticketId === ticketId),
      assignmentHistories: storage.getAssignmentHistories()
        .filter((h) => h.ticketId === ticketId)
        .sort((a, b) => new Date(a.transferredAt).getTime() - new Date(b.transferredAt).getTime()),
    };

    const fileName = `ticket_${ticket.ticketNo}_${Date.now()}.json`;
    const filePath = path.join(storage.getExportDir(), fileName);
    fs.writeFileSync(filePath, JSON.stringify(detail, null, 2), 'utf-8');
    return filePath;
  }

  generateFailedRecordsTemplate(batchId?: string): string {
    let errors = storage.getImportErrors();
    if (batchId) {
      errors = errors.filter((e) => e.batchId === batchId);
    }

    const templateData = errors.map((e) => ({
      ...(e.rawData as Record<string, unknown>),
      _originalRowNumber: e.originalRowNumber,
      _errorType: e.errorType,
      _errorMessage: e.errorMessage,
    }));

    const fileName = `fix_template_${Date.now()}.json`;
    const filePath = path.join(storage.getExportDir(), fileName);
    fs.writeFileSync(filePath, JSON.stringify(templateData, null, 2), 'utf-8');
    return filePath;
  }

  checkExportConsistency(exportFilePath: string): ConsistencyCheckResult {
    const result: ConsistencyCheckResult = {
      isConsistent: true,
      mismatches: [],
    };

    if (!fs.existsSync(exportFilePath)) {
      result.isConsistent = false;
      return result;
    }

    const exportContent = fs.readFileSync(exportFilePath, 'utf-8');
    const exportData = JSON.parse(exportContent);
    const history = storage.getHistory();

    const checkField = (
      type: string,
      entityId: string,
      field: string,
      exportValue: unknown,
      currentValue: unknown
    ) => {
      if (JSON.stringify(exportValue) !== JSON.stringify(currentValue)) {
        result.isConsistent = false;
        result.mismatches.push({
          type,
          entityId,
          field,
          exportValue,
          historyValue: currentValue,
        });
      }
    };

    if (exportData.tickets) {
      const currentTickets = storage.getTickets();
      for (const exportedTicket of exportData.tickets) {
        const currentTicket = currentTickets.find((t) => t.id === exportedTicket.id);
        if (currentTicket) {
          checkField('ticket', exportedTicket.id, 'status', exportedTicket.status, currentTicket.status);
          checkField('ticket', exportedTicket.id, 'assignee', exportedTicket.assignee, currentTicket.assignee);
        }
      }
    }

    if (exportData.compensationApprovals) {
      const currentApprovals = storage.getCompensationApprovals();
      for (const exported of exportData.compensationApprovals) {
        const current = currentApprovals.find((a) => a.id === exported.id);
        if (current) {
          checkField('compensation', exported.id, 'status', exported.status, current.status);
          checkField('compensation', exported.id, 'amount', exported.amount, current.amount);
        }
      }
    }

    return result;
  }
}

export const exportService = new ExportService();
