"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleType = exports.RecordType = exports.RecordStatus = void 0;
exports.initDatabase = initDatabase;
const index_1 = __importDefault(require("./index"));
var RecordStatus;
(function (RecordStatus) {
    RecordStatus["DRAFT"] = "draft";
    RecordStatus["SUBMITTED"] = "submitted";
    RecordStatus["REJECTED"] = "rejected";
    RecordStatus["CONFIRMED"] = "confirmed";
    RecordStatus["AUDITED"] = "audited";
})(RecordStatus || (exports.RecordStatus = RecordStatus = {}));
var RecordType;
(function (RecordType) {
    RecordType["RECHARGE"] = "recharge";
    RecordType["REFUND"] = "refund";
    RecordType["HANDOVER"] = "handover";
    RecordType["RECEIPT"] = "receipt";
})(RecordType || (exports.RecordType = RecordType = {}));
var RoleType;
(function (RoleType) {
    RoleType["STORE_STAFF"] = "store_staff";
    RoleType["STORE_MANAGER"] = "store_manager";
    RoleType["FINANCE"] = "finance";
    RoleType["AUDITOR"] = "auditor";
})(RoleType || (exports.RoleType = RoleType = {}));
function initDatabase() {
    return new Promise((resolve, reject) => {
        index_1.default.serialize(() => {
            index_1.default.run(`
        CREATE TABLE IF NOT EXISTS recharge_records (
          id TEXT PRIMARY KEY,
          order_no TEXT UNIQUE NOT NULL,
          store_id TEXT NOT NULL,
          store_name TEXT NOT NULL,
          member_id TEXT NOT NULL,
          member_phone TEXT NOT NULL,
          amount REAL NOT NULL,
          before_balance REAL NOT NULL,
          after_balance REAL NOT NULL,
          operator_id TEXT NOT NULL,
          operator_name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'draft',
          source TEXT,
          remark TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          version INTEGER NOT NULL DEFAULT 1
        )
      `);
            index_1.default.run(`
        CREATE TABLE IF NOT EXISTS refund_applications (
          id TEXT PRIMARY KEY,
          apply_no TEXT UNIQUE NOT NULL,
          store_id TEXT NOT NULL,
          store_name TEXT NOT NULL,
          recharge_order_no TEXT NOT NULL,
          member_id TEXT NOT NULL,
          member_phone TEXT NOT NULL,
          refund_amount REAL NOT NULL,
          refund_reason TEXT NOT NULL,
          applicant_id TEXT NOT NULL,
          applicant_name TEXT NOT NULL,
          reviewer_id TEXT,
          reviewer_name TEXT,
          review_remark TEXT,
          status TEXT NOT NULL DEFAULT 'draft',
          inventory_rollback INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          version INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY (recharge_order_no) REFERENCES recharge_records(order_no)
        )
      `);
            index_1.default.run(`
        CREATE TABLE IF NOT EXISTS store_handover_records (
          id TEXT PRIMARY KEY,
          handover_no TEXT UNIQUE NOT NULL,
          store_id TEXT NOT NULL,
          store_name TEXT NOT NULL,
          previous_manager_id TEXT NOT NULL,
          previous_manager_name TEXT NOT NULL,
          new_manager_id TEXT NOT NULL,
          new_manager_name TEXT NOT NULL,
          handover_date INTEGER NOT NULL,
          total_balance REAL NOT NULL,
          cash_amount REAL NOT NULL,
          pending_refund_count INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'draft',
          witness_id TEXT,
          witness_name TEXT,
          remark TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          version INTEGER NOT NULL DEFAULT 1
        )
      `);
            index_1.default.run(`
        CREATE TABLE IF NOT EXISTS external_receipts (
          id TEXT PRIMARY KEY,
          receipt_no TEXT UNIQUE NOT NULL,
          related_record_id TEXT NOT NULL,
          related_record_type TEXT NOT NULL,
          store_id TEXT NOT NULL,
          store_name TEXT NOT NULL,
          receipt_type TEXT NOT NULL,
          amount REAL NOT NULL,
          channel TEXT NOT NULL,
          channel_transaction_id TEXT,
          operator_id TEXT NOT NULL,
          operator_name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'draft',
          remark TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          version INTEGER NOT NULL DEFAULT 1
        )
      `);
            index_1.default.run(`
        CREATE TABLE IF NOT EXISTS audit_trails (
          id TEXT PRIMARY KEY,
          record_id TEXT NOT NULL,
          record_type TEXT NOT NULL,
          action TEXT NOT NULL,
          old_status TEXT,
          new_status TEXT NOT NULL,
          operator_id TEXT NOT NULL,
          operator_name TEXT NOT NULL,
          operator_role TEXT NOT NULL,
          change_reason TEXT,
          changed_fields TEXT,
          created_at INTEGER NOT NULL
        )
      `);
            index_1.default.run(`
        CREATE TABLE IF NOT EXISTS failed_records (
          id TEXT PRIMARY KEY,
          record_type TEXT NOT NULL,
          raw_data TEXT NOT NULL,
          error_message TEXT NOT NULL,
          error_type TEXT NOT NULL,
          received_at INTEGER NOT NULL
        )
      `);
            index_1.default.run(`CREATE INDEX IF NOT EXISTS idx_recharge_store ON recharge_records(store_id)`);
            index_1.default.run(`CREATE INDEX IF NOT EXISTS idx_recharge_member ON recharge_records(member_id)`);
            index_1.default.run(`CREATE INDEX IF NOT EXISTS idx_recharge_status ON recharge_records(status)`);
            index_1.default.run(`CREATE INDEX IF NOT EXISTS idx_refund_store ON refund_applications(store_id)`);
            index_1.default.run(`CREATE INDEX IF NOT EXISTS idx_refund_status ON refund_applications(status)`);
            index_1.default.run(`CREATE INDEX IF NOT EXISTS idx_audit_record ON audit_trails(record_id, record_type)`);
            index_1.default.run(`CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_trails(created_at)`);
            resolve();
        });
    });
}
