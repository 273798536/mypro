"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStore = getStore;
exports.saveStore = saveStore;
exports.resetStoreForTest = resetStoreForTest;
exports.closeDb = closeDb;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DATA_DIR = path_1.default.join(process.cwd(), '.index-coverage-data');
const DB_FILE = path_1.default.join(DATA_DIR, 'datastore.json');
let storeInstance = null;
function ensureDir() {
    if (!fs_1.default.existsSync(DATA_DIR)) {
        fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
    }
}
function emptyStore() {
    return {
        runs: [],
        suggestions: [],
        anomalies: [],
        schemas: [],
        supplements: [],
        auditLogs: [],
    };
}
function getStore() {
    if (storeInstance)
        return storeInstance;
    ensureDir();
    if (fs_1.default.existsSync(DB_FILE)) {
        try {
            storeInstance = JSON.parse(fs_1.default.readFileSync(DB_FILE, 'utf-8'));
        }
        catch {
            storeInstance = emptyStore();
        }
    }
    else {
        storeInstance = emptyStore();
    }
    if (!storeInstance.runs)
        storeInstance = emptyStore();
    return storeInstance;
}
function saveStore() {
    ensureDir();
    const data = getStore();
    fs_1.default.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
function resetStoreForTest() {
    storeInstance = emptyStore();
    saveStore();
}
function closeDb() {
    storeInstance = null;
}
//# sourceMappingURL=database.js.map