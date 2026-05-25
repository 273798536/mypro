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
exports.importService = exports.ImportService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const FileStorage_1 = require("../storage/FileStorage");
const ValidationService_1 = require("./ValidationService");
const diff_1 = require("../utils/diff");
class ImportService {
    generateBatchId() {
        return `batch_${Date.now()}_${(0, uuid_1.v4)().slice(0, 8)}`;
    }
    isUUID(str) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
    }
    resolveTicketId(ticketRef) {
        if (this.isUUID(ticketRef)) {
            return ticketRef;
        }
        const tickets = FileStorage_1.storage.getTickets();
        const ticket = tickets.find((t) => t.id === ticketRef || t.ticketNo === ticketRef);
        return ticket ? ticket.id : null;
    }
    createImportError(batchId, recordType, rowNumber, errorType, errorMessage, rawData) {
        return {
            id: (0, uuid_1.v4)(),
            batchId,
            recordType,
            originalRowNumber: rowNumber,
            errorType,
            errorMessage,
            rawData,
            createdAt: new Date().toISOString(),
        };
    }
    isDuplicateRecord(recordType, data, existingRecords) {
        switch (recordType) {
            case 'ticket':
                return existingRecords.some((r) => r.ticketNo === data.ticketNo);
            case 'sessionSummary':
                return existingRecords.some((r) => r.ticketId === data.ticketId &&
                    r.summary === data.summary);
            case 'slaRule':
                return existingRecords.some((r) => r.ticketId === data.ticketId &&
                    r.ruleName === data.ruleName);
            case 'compensationApproval':
                return existingRecords.some((r) => r.ticketId === data.ticketId &&
                    r.amount === data.amount);
            case 'customerServiceNote':
                return existingRecords.some((r) => r.ticketId === data.ticketId &&
                    r.content === data.content);
            case 'exceptionPhoto':
                return existingRecords.some((r) => r.ticketId === data.ticketId &&
                    r.fileName === data.fileName);
            case 'assignmentHistory':
                return existingRecords.some((r) => r.ticketId === data.ticketId &&
                    r.transferredAt === data.transferredAt);
            default:
                return false;
        }
    }
    importFromJsonFile(filePath, recordType, importedBy = 'system', skipDuplicates = true) {
        const batchId = this.generateBatchId();
        const errors = [];
        let successCount = 0;
        if (!fs.existsSync(filePath)) {
            throw new Error(`文件不存在: ${filePath}`);
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        let records;
        try {
            records = JSON.parse(content);
            if (!Array.isArray(records)) {
                records = [records];
            }
        }
        catch (e) {
            throw new Error(`JSON 解析失败: ${e.message}`);
        }
        const existingRecords = this.getExistingRecords(recordType);
        for (let i = 0; i < records.length; i++) {
            const rowNumber = i + 1;
            const data = records[i];
            try {
                const validationResult = this.validateRecord(recordType, data);
                if (!validationResult.isValid) {
                    errors.push(this.createImportError(batchId, recordType, rowNumber, 'validation_error', validationResult.errors.join('; '), data));
                    continue;
                }
                if (skipDuplicates && this.isDuplicateRecord(recordType, data, existingRecords)) {
                    errors.push(this.createImportError(batchId, recordType, rowNumber, 'duplicate_record', '检测到重复记录，已跳过', data));
                    continue;
                }
                const entity = this.createEntity(recordType, data, batchId, rowNumber);
                this.saveEntity(recordType, entity, existingRecords);
                const before = null;
                const after = entity;
                FileStorage_1.storage.addHistoryRecord({
                    entityType: recordType,
                    entityId: entity.id,
                    action: 'import',
                    before,
                    after,
                    diff: (0, diff_1.calculateDiff)(before, after),
                    performedBy: importedBy,
                    batchId,
                });
                successCount++;
            }
            catch (e) {
                errors.push(this.createImportError(batchId, recordType, rowNumber, 'import_error', e.message, data));
            }
        }
        this.saveAllRecords(recordType, existingRecords);
        const importErrors = FileStorage_1.storage.getImportErrors();
        importErrors.push(...errors);
        FileStorage_1.storage.saveImportErrors(importErrors);
        const importRecord = {
            id: (0, uuid_1.v4)(),
            batchId,
            sourceType: recordType,
            sourceFile: path.basename(filePath),
            importedAt: new Date().toISOString(),
            importedBy,
            totalRecords: records.length,
            successCount,
            failedCount: errors.length,
            status: errors.length === 0
                ? 'completed'
                : successCount > 0
                    ? 'partial'
                    : 'failed',
        };
        const importRecords = FileStorage_1.storage.getImportRecords();
        importRecords.push(importRecord);
        FileStorage_1.storage.saveImportRecords(importRecords);
        return {
            batchId,
            successCount,
            failedCount: errors.length,
            errors,
        };
    }
    getExistingRecords(recordType) {
        switch (recordType) {
            case 'ticket':
                return FileStorage_1.storage.getTickets();
            case 'sessionSummary':
                return FileStorage_1.storage.getSessionSummaries();
            case 'slaRule':
                return FileStorage_1.storage.getSLARules();
            case 'compensationApproval':
                return FileStorage_1.storage.getCompensationApprovals();
            case 'customerServiceNote':
                return FileStorage_1.storage.getCustomerServiceNotes();
            case 'exceptionPhoto':
                return FileStorage_1.storage.getExceptionPhotos();
            case 'assignmentHistory':
                return FileStorage_1.storage.getAssignmentHistories();
            default:
                return [];
        }
    }
    validateRecord(recordType, data) {
        switch (recordType) {
            case 'ticket':
                return ValidationService_1.validationService.validateTicket(data);
            case 'sessionSummary':
                return ValidationService_1.validationService.validateSessionSummary(data);
            case 'slaRule':
                return ValidationService_1.validationService.validateSLARule(data);
            case 'compensationApproval':
                return ValidationService_1.validationService.validateCompensationApproval(data);
            case 'customerServiceNote':
                return ValidationService_1.validationService.validateCustomerServiceNote(data);
            case 'exceptionPhoto':
                return ValidationService_1.validationService.validateExceptionPhoto(data);
            case 'assignmentHistory':
                return ValidationService_1.validationService.validateAssignmentHistory(data);
            default:
                return { isValid: true, errors: [] };
        }
    }
    createEntity(recordType, data, batchId, rowNumber) {
        const now = new Date().toISOString();
        const baseEntity = {
            id: (0, uuid_1.v4)(),
            importBatchId: batchId,
            originalRowNumber: rowNumber,
        };
        const resolveTicketId = (ticketRef) => {
            if (typeof ticketRef !== 'string') {
                return String(ticketRef || '');
            }
            if (this.isUUID(ticketRef)) {
                return ticketRef;
            }
            const resolvedId = this.resolveTicketId(ticketRef);
            if (resolvedId) {
                return resolvedId;
            }
            return ticketRef;
        };
        switch (recordType) {
            case 'ticket':
                return {
                    ...baseEntity,
                    id: data.id && this.isUUID(data.id) ? data.id : baseEntity.id,
                    ticketNo: data.ticketNo,
                    title: data.title,
                    status: data.status || 'open',
                    priority: data.priority || 'medium',
                    createdAt: data.createdAt || now,
                    updatedAt: data.updatedAt || now,
                    assignee: data.assignee || '',
                    department: data.department || '',
                    source: data.source || 'import',
                };
            case 'sessionSummary':
                return {
                    ...baseEntity,
                    ticketId: resolveTicketId(data.ticketId),
                    summary: data.summary,
                    keyPoints: data.keyPoints || [],
                    createdAt: data.createdAt || now,
                    createdBy: data.createdBy || 'import',
                };
            case 'slaRule':
                return {
                    ...baseEntity,
                    ticketId: resolveTicketId(data.ticketId),
                    ruleName: data.ruleName,
                    responseTime: data.responseTime || 0,
                    resolutionTime: data.resolutionTime || 0,
                    warningTime: data.warningTime || 0,
                    startTime: data.startTime || now,
                    deadline: data.deadline || now,
                    isViolated: data.isViolated || false,
                    actualResponseTime: data.actualResponseTime,
                    actualResolutionTime: data.actualResolutionTime,
                };
            case 'compensationApproval':
                return {
                    ...baseEntity,
                    ticketId: resolveTicketId(data.ticketId),
                    amount: data.amount,
                    reason: data.reason,
                    status: data.status || 'pending',
                    approver: data.approver,
                    approvedAt: data.approvedAt,
                    createdAt: data.createdAt || now,
                    createdBy: data.createdBy || 'import',
                };
            case 'customerServiceNote':
                return {
                    ...baseEntity,
                    ticketId: resolveTicketId(data.ticketId),
                    content: data.content,
                    createdAt: data.createdAt || now,
                    createdBy: data.createdBy || 'import',
                    type: data.type || 'internal',
                };
            case 'exceptionPhoto':
                return {
                    ...baseEntity,
                    ticketId: resolveTicketId(data.ticketId),
                    fileName: data.fileName,
                    filePath: data.filePath,
                    uploadedAt: data.uploadedAt || now,
                    uploadedBy: data.uploadedBy || 'import',
                    description: data.description,
                };
            case 'assignmentHistory':
                return {
                    ...baseEntity,
                    ticketId: resolveTicketId(data.ticketId),
                    fromAssignee: data.fromAssignee || '',
                    toAssignee: data.toAssignee,
                    fromDepartment: data.fromDepartment || '',
                    toDepartment: data.toDepartment || '',
                    transferredAt: data.transferredAt,
                    reason: data.reason || '',
                };
            default:
                return null;
        }
    }
    saveEntity(recordType, entity, existingRecords) {
        existingRecords.push(entity);
    }
    saveAllRecords(recordType, records) {
        switch (recordType) {
            case 'ticket':
                FileStorage_1.storage.saveTickets(records);
                break;
            case 'sessionSummary':
                FileStorage_1.storage.saveSessionSummaries(records);
                break;
            case 'slaRule':
                FileStorage_1.storage.saveSLARules(records);
                break;
            case 'compensationApproval':
                FileStorage_1.storage.saveCompensationApprovals(records);
                break;
            case 'customerServiceNote':
                FileStorage_1.storage.saveCustomerServiceNotes(records);
                break;
            case 'exceptionPhoto':
                FileStorage_1.storage.saveExceptionPhotos(records);
                break;
            case 'assignmentHistory':
                FileStorage_1.storage.saveAssignmentHistories(records);
                break;
        }
    }
    getImportBatches() {
        return FileStorage_1.storage.getImportRecords();
    }
    getBatchErrors(batchId) {
        return FileStorage_1.storage.getImportErrors().filter((e) => e.batchId === batchId);
    }
}
exports.ImportService = ImportService;
exports.importService = new ImportService();
//# sourceMappingURL=ImportService.js.map