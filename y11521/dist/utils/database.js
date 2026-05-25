"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDbDir = ensureDbDir;
exports.isInitialized = isInitialized;
exports.loadDb = loadDb;
exports.saveDb = saveDb;
exports.initDb = initDb;
exports.login = login;
exports.getCurrentUser = getCurrentUser;
exports.logout = logout;
exports.addOperationLog = addOperationLog;
exports.addAppointment = addAppointment;
exports.addLocation = addLocation;
exports.addReview = addReview;
exports.addPriceAdjustment = addPriceAdjustment;
exports.addDirtyRecord = addDirtyRecord;
exports.updateDirtyRecord = updateDirtyRecord;
exports.addImportHistory = addImportHistory;
exports.getAppointments = getAppointments;
exports.getLocations = getLocations;
exports.getReviews = getReviews;
exports.getPriceAdjustments = getPriceAdjustments;
exports.getDirtyRecords = getDirtyRecords;
exports.getImportHistory = getImportHistory;
exports.getOperationLogs = getOperationLogs;
exports.getDbPath = getDbPath;
exports.getAppointmentById = getAppointmentById;
exports.getLocationById = getLocationById;
exports.getReviewById = getReviewById;
exports.getPriceAdjustmentById = getPriceAdjustmentById;
exports.getAppointmentsByOrderNo = getAppointmentsByOrderNo;
exports.getLocationsByOrderNo = getLocationsByOrderNo;
exports.getReviewsByOrderNo = getReviewsByOrderNo;
exports.getPriceAdjustmentsByOrderNo = getPriceAdjustmentsByOrderNo;
exports.updateAppointment = updateAppointment;
exports.updateLocation = updateLocation;
exports.updateReview = updateReview;
exports.updatePriceAdjustment = updatePriceAdjustment;
exports.deleteAppointment = deleteAppointment;
exports.deleteLocation = deleteLocation;
exports.deleteReview = deleteReview;
exports.deletePriceAdjustment = deletePriceAdjustment;
exports.mergeAppointments = mergeAppointments;
exports.cleanDirtyRecordsByOrderNo = cleanDirtyRecordsByOrderNo;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const dayjs_1 = __importDefault(require("dayjs"));
const DB_DIR = path_1.default.join(process.cwd(), '.hai-cli');
const DB_FILE = path_1.default.join(DB_DIR, 'db.json');
function ensureDbDir() {
    if (!fs_1.default.existsSync(DB_DIR)) {
        fs_1.default.mkdirSync(DB_DIR, { recursive: true });
    }
}
function isInitialized() {
    return fs_1.default.existsSync(DB_FILE);
}
function loadDb() {
    if (!fs_1.default.existsSync(DB_FILE)) {
        throw new Error('数据库未初始化，请先运行 hai init');
    }
    const data = fs_1.default.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
}
function saveDb(db) {
    ensureDbDir();
    fs_1.default.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}
function initDb() {
    const defaultUsers = [
        {
            id: (0, uuid_1.v4)(),
            username: 'admin',
            password: 'admin123',
            role: 'supervisor',
            name: '系统管理员',
            department: '售后部',
            createdAt: (0, dayjs_1.default)().toISOString(),
        },
        {
            id: (0, uuid_1.v4)(),
            username: 'entry01',
            password: 'entry123',
            role: 'entry',
            name: '录入员小张',
            department: '售后部',
            createdAt: (0, dayjs_1.default)().toISOString(),
        },
        {
            id: (0, uuid_1.v4)(),
            username: 'review01',
            password: 'review123',
            role: 'review',
            name: '复核员小李',
            department: '售后部',
            createdAt: (0, dayjs_1.default)().toISOString(),
        },
        {
            id: (0, uuid_1.v4)(),
            username: 'viewer01',
            password: 'viewer123',
            role: 'readonly',
            name: '查看员小王',
            department: '售后部',
            createdAt: (0, dayjs_1.default)().toISOString(),
        },
    ];
    const db = {
        users: defaultUsers,
        appointments: [],
        locations: [],
        reviews: [],
        priceAdjustments: [],
        dirtyRecords: [],
        importHistory: [],
        operationLogs: [],
        initialized: true,
        initializedAt: (0, dayjs_1.default)().toISOString(),
    };
    saveDb(db);
    return db;
}
function login(username, password) {
    const db = loadDb();
    const user = db.users.find((u) => u.username === username && u.password === password);
    if (user) {
        db.currentUser = user;
        saveDb(db);
        return user;
    }
    return null;
}
function getCurrentUser() {
    const db = loadDb();
    return db.currentUser;
}
function logout() {
    const db = loadDb();
    delete db.currentUser;
    saveDb(db);
}
function addOperationLog(operation, user, options = {}) {
    const db = loadDb();
    const log = {
        id: (0, uuid_1.v4)(),
        operation,
        recordId: options.recordId,
        userId: user.id,
        userName: user.name,
        role: user.role,
        beforeData: options.beforeData,
        afterData: options.afterData,
        timestamp: (0, dayjs_1.default)().toISOString(),
        batchId: options.batchId,
    };
    db.operationLogs.unshift(log);
    saveDb(db);
}
function addAppointment(record) {
    const db = loadDb();
    const newRecord = {
        ...record,
        id: (0, uuid_1.v4)(),
        source: 'appointment',
    };
    db.appointments.push(newRecord);
    saveDb(db);
    return newRecord;
}
function addLocation(record) {
    const db = loadDb();
    const newRecord = {
        ...record,
        id: (0, uuid_1.v4)(),
        source: 'location',
    };
    db.locations.push(newRecord);
    saveDb(db);
    return newRecord;
}
function addReview(record) {
    const db = loadDb();
    const newRecord = {
        ...record,
        id: (0, uuid_1.v4)(),
        source: 'review',
    };
    db.reviews.push(newRecord);
    saveDb(db);
    return newRecord;
}
function addPriceAdjustment(record) {
    const db = loadDb();
    const newRecord = {
        ...record,
        id: (0, uuid_1.v4)(),
        source: 'price_adjustment',
    };
    db.priceAdjustments.push(newRecord);
    saveDb(db);
    return newRecord;
}
function addDirtyRecord(record) {
    const db = loadDb();
    const newRecord = {
        ...record,
        id: (0, uuid_1.v4)(),
        status: 'dirty',
        createdAt: (0, dayjs_1.default)().toISOString(),
    };
    db.dirtyRecords.push(newRecord);
    saveDb(db);
    return newRecord;
}
function updateDirtyRecord(id, updates) {
    const db = loadDb();
    const index = db.dirtyRecords.findIndex((r) => r.id === id);
    if (index === -1)
        return null;
    db.dirtyRecords[index] = { ...db.dirtyRecords[index], ...updates };
    saveDb(db);
    return db.dirtyRecords[index];
}
function addImportHistory(record) {
    const db = loadDb();
    const newRecord = {
        ...record,
        id: (0, uuid_1.v4)(),
        importedAt: (0, dayjs_1.default)().toISOString(),
    };
    db.importHistory.push(newRecord);
    saveDb(db);
    return newRecord;
}
function getAppointments() {
    return loadDb().appointments;
}
function getLocations() {
    return loadDb().locations;
}
function getReviews() {
    return loadDb().reviews;
}
function getPriceAdjustments() {
    return loadDb().priceAdjustments;
}
function getDirtyRecords() {
    return loadDb().dirtyRecords;
}
function getImportHistory() {
    return loadDb().importHistory;
}
function getOperationLogs() {
    return loadDb().operationLogs;
}
function getDbPath() {
    return DB_FILE;
}
function getAppointmentById(id) {
    return loadDb().appointments.find((r) => r.id === id);
}
function getLocationById(id) {
    return loadDb().locations.find((r) => r.id === id);
}
function getReviewById(id) {
    return loadDb().reviews.find((r) => r.id === id);
}
function getPriceAdjustmentById(id) {
    return loadDb().priceAdjustments.find((r) => r.id === id);
}
function getAppointmentsByOrderNo(orderNo) {
    return loadDb().appointments.filter((r) => r.orderNo === orderNo);
}
function getLocationsByOrderNo(orderNo) {
    return loadDb().locations.filter((r) => r.orderNo === orderNo);
}
function getReviewsByOrderNo(orderNo) {
    return loadDb().reviews.filter((r) => r.orderNo === orderNo);
}
function getPriceAdjustmentsByOrderNo(orderNo) {
    return loadDb().priceAdjustments.filter((r) => r.orderNo === orderNo);
}
function updateAppointment(id, updates) {
    const db = loadDb();
    const index = db.appointments.findIndex((r) => r.id === id);
    if (index === -1)
        return null;
    db.appointments[index] = { ...db.appointments[index], ...updates };
    saveDb(db);
    return db.appointments[index];
}
function updateLocation(id, updates) {
    const db = loadDb();
    const index = db.locations.findIndex((r) => r.id === id);
    if (index === -1)
        return null;
    db.locations[index] = { ...db.locations[index], ...updates };
    saveDb(db);
    return db.locations[index];
}
function updateReview(id, updates) {
    const db = loadDb();
    const index = db.reviews.findIndex((r) => r.id === id);
    if (index === -1)
        return null;
    db.reviews[index] = { ...db.reviews[index], ...updates };
    saveDb(db);
    return db.reviews[index];
}
function updatePriceAdjustment(id, updates) {
    const db = loadDb();
    const index = db.priceAdjustments.findIndex((r) => r.id === id);
    if (index === -1)
        return null;
    db.priceAdjustments[index] = { ...db.priceAdjustments[index], ...updates };
    saveDb(db);
    return db.priceAdjustments[index];
}
function deleteAppointment(id) {
    const db = loadDb();
    const initialLength = db.appointments.length;
    db.appointments = db.appointments.filter((r) => r.id !== id);
    saveDb(db);
    return db.appointments.length < initialLength;
}
function deleteLocation(id) {
    const db = loadDb();
    const initialLength = db.locations.length;
    db.locations = db.locations.filter((r) => r.id !== id);
    saveDb(db);
    return db.locations.length < initialLength;
}
function deleteReview(id) {
    const db = loadDb();
    const initialLength = db.reviews.length;
    db.reviews = db.reviews.filter((r) => r.id !== id);
    saveDb(db);
    return db.reviews.length < initialLength;
}
function deletePriceAdjustment(id) {
    const db = loadDb();
    const initialLength = db.priceAdjustments.length;
    db.priceAdjustments = db.priceAdjustments.filter((r) => r.id !== id);
    saveDb(db);
    return db.priceAdjustments.length < initialLength;
}
function mergeAppointments(orderNo, keepId, removeIds, mergeData) {
    const db = loadDb();
    const keepRecord = db.appointments.find((r) => r.id === keepId);
    if (!keepRecord)
        return null;
    const mergedRecord = { ...keepRecord, ...mergeData };
    const keepIndex = db.appointments.findIndex((r) => r.id === keepId);
    db.appointments[keepIndex] = mergedRecord;
    db.appointments = db.appointments.filter((r) => !removeIds.includes(r.id));
    saveDb(db);
    return mergedRecord;
}
function cleanDirtyRecordsByOrderNo(orderNo, dirtyType) {
    const db = loadDb();
    const initialLength = db.dirtyRecords.length;
    db.dirtyRecords = db.dirtyRecords.filter((r) => !(r.originalData?.orderNo === orderNo && r.dirtyType === dirtyType));
    saveDb(db);
    return initialLength - db.dirtyRecords.length;
}
//# sourceMappingURL=database.js.map