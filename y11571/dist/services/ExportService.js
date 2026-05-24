"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportService = exports.ExportService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const FileStorage_1 = require("../storage/FileStorage");
class ExportService {
    exportAllData(options = {}) {
        const data = {
            exportMetadata: {
                exportedAt: new Date().toISOString(),
                version: '1.0',
            },
            tickets: FileStorage_1.storage.getTickets(),
            sessionSummaries: FileStorage_1.storage.getSessionSummaries(),
            slaRules: FileStorage_1.storage.getSLARules(),
            compensationApprovals: FileStorage_1.storage.getCompensationApprovals(),
            customerServiceNotes: FileStorage_1.storage.getCustomerServiceNotes(),
            exceptionPhotos: FileStorage_1.storage.getExceptionPhotos(),
            assignmentHistories: FileStorage_1.storage.getAssignmentHistories(),
            importRecords: FileStorage_1.storage.getImportRecords(),
            ...(options.includeErrors && { importErrors: FileStorage_1.storage.getImportErrors() }),
            ...(options.includeHistory && { history: FileStorage_1.storage.getHistory() }),
        };
        const fileName = `export_${Date.now()}.json`;
        const filePath = path.join(FileStorage_1.storage.getExportDir(), fileName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return filePath;
    }
    exportTickets() {
        const tickets = FileStorage_1.storage.getTickets();
        const fileName = `tickets_${Date.now()}.json`;
        const filePath = path.join(FileStorage_1.storage.getExportDir(), fileName);
        fs.writeFileSync(filePath, JSON.stringify(tickets, null, 2), 'utf-8');
        return filePath;
    }
    exportFailedRecords(batchId) {
        let errors = FileStorage_1.storage.getImportErrors();
        if (batchId) {
            errors = errors.filter((e) => e.batchId === batchId);
        }
        const fileName = `failed_records_${Date.now()}.json`;
        const filePath = path.join(FileStorage_1.storage.getExportDir(), fileName);
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
    exportTicketDetail(ticketId) {
        const ticket = FileStorage_1.storage.getTickets().find((t) => t.id === ticketId);
        if (!ticket) {
            return null;
        }
        const detail = {
            ticket,
            sessionSummaries: FileStorage_1.storage.getSessionSummaries().filter((s) => s.ticketId === ticketId),
            slaRules: FileStorage_1.storage.getSLARules().filter((s) => s.ticketId === ticketId),
            compensationApprovals: FileStorage_1.storage.getCompensationApprovals().filter((c) => c.ticketId === ticketId),
            customerServiceNotes: FileStorage_1.storage.getCustomerServiceNotes().filter((n) => n.ticketId === ticketId),
            exceptionPhotos: FileStorage_1.storage.getExceptionPhotos().filter((p) => p.ticketId === ticketId),
            assignmentHistories: FileStorage_1.storage.getAssignmentHistories()
                .filter((h) => h.ticketId === ticketId)
                .sort((a, b) => new Date(a.transferredAt).getTime() - new Date(b.transferredAt).getTime()),
        };
        const fileName = `ticket_${ticket.ticketNo}_${Date.now()}.json`;
        const filePath = path.join(FileStorage_1.storage.getExportDir(), fileName);
        fs.writeFileSync(filePath, JSON.stringify(detail, null, 2), 'utf-8');
        return filePath;
    }
    generateFailedRecordsTemplate(batchId) {
        let errors = FileStorage_1.storage.getImportErrors();
        if (batchId) {
            errors = errors.filter((e) => e.batchId === batchId);
        }
        const templateData = errors.map((e) => ({
            ...e.rawData,
            _originalRowNumber: e.originalRowNumber,
            _errorType: e.errorType,
            _errorMessage: e.errorMessage,
        }));
        const fileName = `fix_template_${Date.now()}.json`;
        const filePath = path.join(FileStorage_1.storage.getExportDir(), fileName);
        fs.writeFileSync(filePath, JSON.stringify(templateData, null, 2), 'utf-8');
        return filePath;
    }
    checkExportConsistency(exportFilePath) {
        const result = {
            isConsistent: true,
            mismatches: [],
        };
        if (!fs.existsSync(exportFilePath)) {
            result.isConsistent = false;
            return result;
        }
        const exportContent = fs.readFileSync(exportFilePath, 'utf-8');
        const exportData = JSON.parse(exportContent);
        const history = FileStorage_1.storage.getHistory();
        const checkField = (type, entityId, field, exportValue, currentValue) => {
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
            const currentTickets = FileStorage_1.storage.getTickets();
            for (const exportedTicket of exportData.tickets) {
                const currentTicket = currentTickets.find((t) => t.id === exportedTicket.id);
                if (currentTicket) {
                    checkField('ticket', exportedTicket.id, 'status', exportedTicket.status, currentTicket.status);
                    checkField('ticket', exportedTicket.id, 'assignee', exportedTicket.assignee, currentTicket.assignee);
                }
            }
        }
        if (exportData.compensationApprovals) {
            const currentApprovals = FileStorage_1.storage.getCompensationApprovals();
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
exports.ExportService = ExportService;
exports.exportService = new ExportService();
//# sourceMappingURL=ExportService.js.map