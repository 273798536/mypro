"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabase = exports.Database = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const DEFAULT_DATA_DIR = path_1.default.join(process.cwd(), 'data');
const DB_FILE = 'audit-db.json';
class Database {
    constructor(dataDir) {
        const directory = dataDir || DEFAULT_DATA_DIR;
        this.dbPath = path_1.default.join(directory, DB_FILE);
        this.data = this.loadOrCreate();
    }
    loadOrCreate() {
        if (fs_1.default.existsSync(this.dbPath)) {
            try {
                const content = fs_1.default.readFileSync(this.dbPath, 'utf-8');
                return JSON.parse(content);
            }
            catch (error) {
                console.error('读取数据库失败，创建新数据库:', error);
            }
        }
        return this.getDefaultSchema();
    }
    getDefaultSchema() {
        return {
            users: [],
            checkinRecords: [],
            depositRecords: [],
            roomChangeRecords: [],
            shiftRecords: [],
            supplementRecords: [],
            dirtyRecords: [],
            statusChanges: [],
            importBatches: [],
            auditReports: [],
            currentUser: null,
            config: {
                initialized: false,
                initializedAt: '',
                dataDirectory: DEFAULT_DATA_DIR
            }
        };
    }
    save() {
        const directory = path_1.default.dirname(this.dbPath);
        if (!fs_1.default.existsSync(directory)) {
            fs_1.default.mkdirSync(directory, { recursive: true });
        }
        fs_1.default.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    }
    isInitialized() {
        return this.data.config.initialized;
    }
    initialize() {
        if (this.data.config.initialized) {
            throw new Error('系统已初始化');
        }
        const defaultUsers = [
            {
                id: (0, uuid_1.v4)(),
                username: 'admin',
                role: 'supervisor',
                name: '系统管理员',
                createdAt: new Date().toISOString()
            },
            {
                id: (0, uuid_1.v4)(),
                username: 'reviewer',
                role: 'review',
                name: '复核员小张',
                createdAt: new Date().toISOString()
            },
            {
                id: (0, uuid_1.v4)(),
                username: 'clerk',
                role: 'entry',
                name: '录入员小李',
                createdAt: new Date().toISOString()
            },
            {
                id: (0, uuid_1.v4)(),
                username: 'viewer',
                role: 'readonly',
                name: '查看员小王',
                createdAt: new Date().toISOString()
            }
        ];
        this.data.users = defaultUsers;
        this.data.config.initialized = true;
        this.data.config.initializedAt = new Date().toISOString();
        this.save();
    }
    getUsers() {
        return [...this.data.users];
    }
    getUserById(id) {
        return this.data.users.find(u => u.id === id);
    }
    getUserByUsername(username) {
        return this.data.users.find(u => u.username === username);
    }
    setCurrentUser(userId) {
        this.data.currentUser = userId;
        this.save();
    }
    getCurrentUser() {
        if (!this.data.currentUser)
            return undefined;
        return this.getUserById(this.data.currentUser);
    }
    createBatch(source, fileName, createdBy) {
        const now = new Date();
        const batchDate = now.toISOString().split('T')[0];
        const count = this.data.importBatches.filter(b => b.batchDate === batchDate).length + 1;
        const batch = {
            id: (0, uuid_1.v4)(),
            batchNo: `BATCH-${batchDate}-${String(count).padStart(4, '0')}`,
            batchDate,
            source,
            fileName,
            totalRecords: 0,
            importedRecords: 0,
            dirtyRecords: 0,
            fixedRecords: 0,
            status: 'importing',
            createdBy,
            createdAt: now.toISOString()
        };
        this.data.importBatches.push(batch);
        this.save();
        return batch;
    }
    getBatch(batchId) {
        return this.data.importBatches.find(b => b.id === batchId);
    }
    getBatches() {
        return [...this.data.importBatches].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    updateBatch(batchId, updates) {
        const batch = this.data.importBatches.find(b => b.id === batchId);
        if (batch) {
            Object.assign(batch, updates);
            this.save();
        }
    }
    addCheckinRecord(record) {
        const newRecord = {
            ...record,
            id: (0, uuid_1.v4)()
        };
        this.data.checkinRecords.push(newRecord);
        this.save();
        return newRecord;
    }
    getCheckinRecords(batchId) {
        let records = [...this.data.checkinRecords];
        if (batchId) {
            records = records.filter(r => r.importBatch === batchId);
        }
        return records;
    }
    addDepositRecord(record) {
        const newRecord = {
            ...record,
            id: (0, uuid_1.v4)()
        };
        this.data.depositRecords.push(newRecord);
        this.save();
        return newRecord;
    }
    getDepositRecords(batchId) {
        let records = [...this.data.depositRecords];
        if (batchId) {
            records = records.filter(r => r.importBatch === batchId);
        }
        return records;
    }
    addRoomChangeRecord(record) {
        const newRecord = {
            ...record,
            id: (0, uuid_1.v4)()
        };
        this.data.roomChangeRecords.push(newRecord);
        this.save();
        return newRecord;
    }
    getRoomChangeRecords(batchId) {
        let records = [...this.data.roomChangeRecords];
        if (batchId) {
            records = records.filter(r => r.importBatch === batchId);
        }
        return records;
    }
    addShiftRecord(record) {
        const newRecord = {
            ...record,
            id: (0, uuid_1.v4)()
        };
        this.data.shiftRecords.push(newRecord);
        this.save();
        return newRecord;
    }
    getShiftRecords(batchId) {
        let records = [...this.data.shiftRecords];
        if (batchId) {
            records = records.filter(r => r.importBatch === batchId);
        }
        return records;
    }
    addSupplementRecord(record) {
        const newRecord = {
            ...record,
            id: (0, uuid_1.v4)()
        };
        this.data.supplementRecords.push(newRecord);
        this.save();
        return newRecord;
    }
    getSupplementRecords(batchId) {
        let records = [...this.data.supplementRecords];
        if (batchId) {
            records = records.filter(r => r.importBatch === batchId);
        }
        return records;
    }
    addDirtyRecord(record) {
        const newRecord = {
            ...record,
            id: (0, uuid_1.v4)()
        };
        this.data.dirtyRecords.push(newRecord);
        this.save();
        return newRecord;
    }
    getDirtyRecords(batchId, status) {
        let records = [...this.data.dirtyRecords];
        if (batchId) {
            records = records.filter(r => r.importBatch === batchId);
        }
        if (status) {
            records = records.filter(r => r.status === status);
        }
        return records;
    }
    updateDirtyRecord(dirtyId, updates) {
        const record = this.data.dirtyRecords.find(r => r.id === dirtyId);
        if (record) {
            Object.assign(record, updates);
            this.save();
        }
    }
    addStatusChange(recordId, recordType, fromStatus, toStatus, operator, operatorRole, reason, importBatch) {
        const change = {
            id: (0, uuid_1.v4)(),
            recordId,
            recordType,
            fromStatus,
            toStatus,
            operator,
            operatorRole,
            reason,
            timestamp: new Date().toISOString(),
            importBatch
        };
        this.data.statusChanges.push(change);
        this.save();
        return change;
    }
    getStatusChanges(recordId, batchId) {
        let changes = [...this.data.statusChanges];
        if (recordId) {
            changes = changes.filter(c => c.recordId === recordId);
        }
        if (batchId) {
            changes = changes.filter(c => c.importBatch === batchId);
        }
        return changes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    addAuditReport(report) {
        const newReport = {
            ...report,
            id: (0, uuid_1.v4)()
        };
        this.data.auditReports.push(newReport);
        this.save();
        return newReport;
    }
    getAuditReports(batchId) {
        let reports = [...this.data.auditReports];
        if (batchId) {
            reports = reports.filter(r => r.batchNo === batchId);
        }
        return reports.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    }
    getDbPath() {
        return this.dbPath;
    }
    exportData() {
        return JSON.parse(JSON.stringify(this.data));
    }
}
exports.Database = Database;
let dbInstance = null;
const getDatabase = (dataDir) => {
    if (!dbInstance) {
        dbInstance = new Database(dataDir);
    }
    return dbInstance;
};
exports.getDatabase = getDatabase;
