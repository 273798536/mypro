"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDatabase = loadDatabase;
exports.saveDatabase = saveDatabase;
exports.generateId = generateId;
exports.getCurrentTime = getCurrentTime;
exports.addRecord = addRecord;
exports.addDirtyRecord = addDirtyRecord;
exports.addStateChange = addStateChange;
exports.addUser = addUser;
exports.findUserByUsername = findUserByUsername;
exports.getRecordById = getRecordById;
exports.updateRecordStatus = updateRecordStatus;
exports.getDirtyRecordsByRecordId = getDirtyRecordsByRecordId;
exports.getStateChangesByRecordId = getStateChangesByRecordId;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const DB_PATH = path_1.default.join(process.cwd(), '.dmi', 'db.json');
function ensureDbDirectory() {
    const dbDir = path_1.default.dirname(DB_PATH);
    if (!fs_1.default.existsSync(dbDir)) {
        fs_1.default.mkdirSync(dbDir, { recursive: true });
    }
}
function loadDatabase() {
    ensureDbDirectory();
    if (!fs_1.default.existsSync(DB_PATH)) {
        return createEmptyDatabase();
    }
    const content = fs_1.default.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(content);
}
function saveDatabase(db) {
    ensureDbDirectory();
    fs_1.default.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}
function createEmptyDatabase() {
    return {
        users: [],
        records: [],
        dirtyRecords: [],
        stateChanges: [],
        settings: {
            initialized: false
        }
    };
}
function generateId() {
    return (0, uuid_1.v4)();
}
function getCurrentTime() {
    return new Date().toISOString();
}
function addRecord(db, record) {
    const existingIndex = db.records.findIndex(r => r.source === record.source &&
        r.sourceFile === record.sourceFile &&
        r.sourceLine === record.sourceLine);
    if (existingIndex >= 0) {
        db.records[existingIndex] = {
            ...record,
            id: db.records[existingIndex].id,
            createdAt: db.records[existingIndex].createdAt,
            updatedAt: getCurrentTime()
        };
    }
    else {
        db.records.push(record);
    }
}
function addDirtyRecord(db, dirty) {
    db.dirtyRecords.push(dirty);
}
function addStateChange(db, recordId, fromStatus, toStatus, changedBy, reason) {
    const stateChange = {
        id: generateId(),
        recordId,
        fromStatus,
        toStatus,
        changedBy,
        changedAt: getCurrentTime(),
        reason
    };
    db.stateChanges.push(stateChange);
    return stateChange;
}
function addUser(db, user) {
    const newUser = {
        ...user,
        id: generateId(),
        createdAt: getCurrentTime()
    };
    db.users.push(newUser);
    return newUser;
}
function findUserByUsername(db, username) {
    return db.users.find(u => u.username === username);
}
function getRecordById(db, id) {
    return db.records.find(r => r.id === id || r.id.startsWith(id));
}
function updateRecordStatus(db, recordId, newStatus, changedBy, reason) {
    const record = getRecordById(db, recordId);
    if (record) {
        const oldStatus = record.status;
        record.status = newStatus;
        record.updatedAt = getCurrentTime();
        addStateChange(db, recordId, oldStatus, newStatus, changedBy, reason);
    }
}
function getDirtyRecordsByRecordId(db, recordId) {
    const record = getRecordById(db, recordId);
    if (!record)
        return [];
    return db.dirtyRecords.filter(d => d.recordId === record.id);
}
function getStateChangesByRecordId(db, recordId) {
    const record = getRecordById(db, recordId);
    if (!record)
        return [];
    return db.stateChanges.filter(s => s.recordId === record.id);
}
//# sourceMappingURL=database.js.map