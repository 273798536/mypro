import db from './index';

export enum RecordStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  REJECTED = 'rejected',
  CONFIRMED = 'confirmed',
  AUDITED = 'audited'
}

export enum RecordType {
  RECHARGE = 'recharge',
  REFUND = 'refund',
  HANDOVER = 'handover',
  RECEIPT = 'receipt'
}

export enum RoleType {
  STORE_STAFF = 'store_staff',
  STORE_MANAGER = 'store_manager',
  FINANCE = 'finance',
  AUDITOR = 'auditor'
}

export function initDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
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

      db.run(`
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

      db.run(`
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

      db.run(`
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

      db.run(`
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

      db.run(`
        CREATE TABLE IF NOT EXISTS failed_records (
          id TEXT PRIMARY KEY,
          record_type TEXT NOT NULL,
          raw_data TEXT NOT NULL,
          error_message TEXT NOT NULL,
          error_type TEXT NOT NULL,
          received_at INTEGER NOT NULL
        )
      `);

      db.run(`CREATE INDEX IF NOT EXISTS idx_recharge_store ON recharge_records(store_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_recharge_member ON recharge_records(member_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_recharge_status ON recharge_records(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_refund_store ON refund_applications(store_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_refund_status ON refund_applications(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_audit_record ON audit_trails(record_id, record_type)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_trails(created_at)`);

      resolve();
    });
  });
}
