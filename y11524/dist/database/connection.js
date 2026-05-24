"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
exports.resetDatabase = resetDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const schema_1 = require("./schema");
let dbInstance = null;
function getDatabase(dbPath) {
    if (dbInstance) {
        return dbInstance;
    }
    const databasePath = dbPath || path_1.default.join(process.cwd(), 'data', 'ledger.db');
    dbInstance = new better_sqlite3_1.default(databasePath);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    dbInstance.exec(schema_1.CREATE_TABLES_SQL);
    return dbInstance;
}
function closeDatabase() {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}
function resetDatabase() {
    if (dbInstance) {
        dbInstance.exec(`
      DELETE FROM second_confirmations;
      DELETE FROM user_reviews;
      DELETE FROM technician_locations;
      DELETE FROM appointment_orders;
      DELETE FROM status_change_logs;
      DELETE FROM failed_records;
      DELETE FROM ledgers;
    `);
    }
}
//# sourceMappingURL=connection.js.map