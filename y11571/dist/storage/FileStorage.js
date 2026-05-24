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
exports.storage = exports.FileStorage = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
class FileStorage {
    constructor(baseDir = process.cwd()) {
        this.baseDir = path.join(baseDir, '.ticket-inspection');
        this.dataDir = path.join(this.baseDir, 'data');
        this.historyDir = path.join(this.baseDir, 'history');
        this.exportDir = path.join(this.baseDir, 'exports');
        this.photosDir = path.join(this.baseDir, 'photos');
    }
    init() {
        const dirs = [this.baseDir, this.dataDir, this.historyDir, this.exportDir, this.photosDir];
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
        const dataFiles = [
            'tickets.json',
            'session-summaries.json',
            'sla-rules.json',
            'compensation-approvals.json',
            'customer-service-notes.json',
            'exception-photos.json',
            'assignment-histories.json',
            'import-records.json',
            'import-errors.json',
        ];
        for (const file of dataFiles) {
            const filePath = path.join(this.dataDir, file);
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, JSON.stringify([], null, 2));
            }
        }
        const historyPath = path.join(this.historyDir, 'history.json');
        if (!fs.existsSync(historyPath)) {
            fs.writeFileSync(historyPath, JSON.stringify([], null, 2));
        }
    }
    isInitialized() {
        return fs.existsSync(this.baseDir);
    }
    readJsonFile(filename) {
        const filePath = path.join(this.dataDir, filename);
        if (!fs.existsSync(filePath)) {
            return [];
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    }
    writeJsonFile(filename, data) {
        const filePath = path.join(this.dataDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
    getTickets() {
        return this.readJsonFile('tickets.json');
    }
    saveTickets(tickets) {
        this.writeJsonFile('tickets.json', tickets);
    }
    getSessionSummaries() {
        return this.readJsonFile('session-summaries.json');
    }
    saveSessionSummaries(summaries) {
        this.writeJsonFile('session-summaries.json', summaries);
    }
    getSLARules() {
        return this.readJsonFile('sla-rules.json');
    }
    saveSLARules(rules) {
        this.writeJsonFile('sla-rules.json', rules);
    }
    getCompensationApprovals() {
        return this.readJsonFile('compensation-approvals.json');
    }
    saveCompensationApprovals(approvals) {
        this.writeJsonFile('compensation-approvals.json', approvals);
    }
    getCustomerServiceNotes() {
        return this.readJsonFile('customer-service-notes.json');
    }
    saveCustomerServiceNotes(notes) {
        this.writeJsonFile('customer-service-notes.json', notes);
    }
    getExceptionPhotos() {
        return this.readJsonFile('exception-photos.json');
    }
    saveExceptionPhotos(photos) {
        this.writeJsonFile('exception-photos.json', photos);
    }
    getAssignmentHistories() {
        return this.readJsonFile('assignment-histories.json');
    }
    saveAssignmentHistories(histories) {
        this.writeJsonFile('assignment-histories.json', histories);
    }
    getImportRecords() {
        return this.readJsonFile('import-records.json');
    }
    saveImportRecords(records) {
        this.writeJsonFile('import-records.json', records);
    }
    getImportErrors() {
        return this.readJsonFile('import-errors.json');
    }
    saveImportErrors(errors) {
        this.writeJsonFile('import-errors.json', errors);
    }
    getHistory() {
        const historyPath = path.join(this.historyDir, 'history.json');
        if (!fs.existsSync(historyPath)) {
            return [];
        }
        const content = fs.readFileSync(historyPath, 'utf-8');
        return JSON.parse(content);
    }
    saveHistory(history) {
        const historyPath = path.join(this.historyDir, 'history.json');
        fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    }
    addHistoryRecord(record) {
        const history = this.getHistory();
        const newRecord = {
            ...record,
            id: (0, uuid_1.v4)(),
            performedAt: new Date().toISOString(),
        };
        history.push(newRecord);
        this.saveHistory(history);
        return newRecord;
    }
    getExportDir() {
        return this.exportDir;
    }
    getPhotosDir() {
        return this.photosDir;
    }
    getBaseDir() {
        return this.baseDir;
    }
    getEntityById(entityType, id) {
        switch (entityType) {
            case 'ticket':
                return this.getTickets().find(t => t.id === id);
            case 'sessionSummary':
                return this.getSessionSummaries().find(s => s.id === id);
            case 'slaRule':
                return this.getSLARules().find(r => r.id === id);
            case 'compensationApproval':
                return this.getCompensationApprovals().find(a => a.id === id);
            case 'customerServiceNote':
                return this.getCustomerServiceNotes().find(n => n.id === id);
            case 'exceptionPhoto':
                return this.getExceptionPhotos().find(p => p.id === id);
            case 'assignmentHistory':
                return this.getAssignmentHistories().find(h => h.id === id);
            default:
                return null;
        }
    }
    clearAll() {
        if (fs.existsSync(this.baseDir)) {
            fs.rmSync(this.baseDir, { recursive: true, force: true });
        }
    }
}
exports.FileStorage = FileStorage;
exports.storage = new FileStorage();
//# sourceMappingURL=FileStorage.js.map