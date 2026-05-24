import Database from 'better-sqlite3';

const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db: Database.Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version INTEGER NOT NULL UNIQUE,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS import_records (
          id TEXT PRIMARY KEY,
          batch_id TEXT NOT NULL UNIQUE,
          source_type TEXT NOT NULL,
          file_name TEXT NOT NULL,
          total_rows INTEGER NOT NULL DEFAULT 0,
          success_rows INTEGER NOT NULL DEFAULT 0,
          failed_rows INTEGER NOT NULL DEFAULT 0,
          skipped_rows INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'pending',
          conflict_strategy TEXT NOT NULL DEFAULT 'ignore',
          created_by TEXT NOT NULL,
          updated_by TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_import_batch_id ON import_records(batch_id);
        CREATE INDEX IF NOT EXISTS idx_import_source_type ON import_records(source_type);
        CREATE INDEX IF NOT EXISTS idx_import_status ON import_records(status);

        CREATE TABLE IF NOT EXISTS sample_flow_records (
          id TEXT PRIMARY KEY,
          sample_no TEXT NOT NULL,
          style_no TEXT NOT NULL,
          style_name TEXT,
          brand TEXT,
          season TEXT,
          sample_type TEXT NOT NULL,
          status TEXT NOT NULL,
          deposit_amount REAL NOT NULL DEFAULT 0,
          deposit_currency TEXT NOT NULL DEFAULT 'CNY',
          deposit_paid_at TEXT,
          deposit_refunded_at TEXT,
          deposit_refund_amount REAL,
          assigned_to TEXT,
          pattern_maker TEXT,
          cutter TEXT,
          sewer TEXT,
          received_at TEXT,
          sent_at TEXT,
          completed_at TEXT,
          import_source TEXT NOT NULL,
          source_row_number INTEGER NOT NULL,
          version INTEGER NOT NULL DEFAULT 1,
          is_latest INTEGER NOT NULL DEFAULT 1,
          created_by TEXT NOT NULL,
          updated_by TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_sample_no ON sample_flow_records(sample_no);
        CREATE INDEX IF NOT EXISTS idx_sample_style_no ON sample_flow_records(style_no);
        CREATE INDEX IF NOT EXISTS idx_sample_latest ON sample_flow_records(is_latest);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_sample_version ON sample_flow_records(sample_no, version);

        CREATE TABLE IF NOT EXISTS size_modification_records (
          id TEXT PRIMARY KEY,
          modification_no TEXT NOT NULL,
          sample_no TEXT NOT NULL,
          style_no TEXT NOT NULL,
          original_measurements TEXT,
          modified_measurements TEXT,
          modification_reason TEXT,
          requested_by TEXT NOT NULL,
          requested_at TEXT NOT NULL,
          approved_by TEXT,
          approved_at TEXT,
          status TEXT NOT NULL,
          priority TEXT NOT NULL DEFAULT 'medium',
          affected_fabrics TEXT,
          estimated_impact TEXT,
          import_source TEXT NOT NULL,
          source_row_number INTEGER NOT NULL,
          version INTEGER NOT NULL DEFAULT 1,
          is_latest INTEGER NOT NULL DEFAULT 1,
          created_by TEXT NOT NULL,
          updated_by TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_modification_no ON size_modification_records(modification_no);
        CREATE INDEX IF NOT EXISTS idx_modification_sample ON size_modification_records(sample_no);
        CREATE INDEX IF NOT EXISTS idx_modification_latest ON size_modification_records(is_latest);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_modification_version ON size_modification_records(modification_no, version);
      `);
    }
  },
  {
    version: 2,
    name: 'fabric_and_refund_tables',
    up: (db: Database.Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS fabric_records (
          id TEXT PRIMARY KEY,
          fabric_code TEXT NOT NULL UNIQUE,
          fabric_name TEXT NOT NULL,
          color TEXT NOT NULL,
          width REAL,
          weight REAL,
          unit TEXT NOT NULL,
          supplier TEXT,
          purchase_order_no TEXT,
          import_source TEXT NOT NULL,
          source_row_number INTEGER NOT NULL,
          created_by TEXT NOT NULL,
          updated_by TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_fabric_code ON fabric_records(fabric_code);

        CREATE TABLE IF NOT EXISTS fabric_transactions (
          id TEXT PRIMARY KEY,
          transaction_no TEXT NOT NULL,
          fabric_code TEXT NOT NULL,
          type TEXT NOT NULL,
          quantity REAL NOT NULL,
          unit TEXT NOT NULL,
          unit_price REAL,
          total_amount REAL,
          related_sample_no TEXT,
          related_style_no TEXT,
          related_department TEXT,
          operator TEXT NOT NULL,
          transaction_time TEXT NOT NULL,
          warehouse TEXT NOT NULL,
          location TEXT,
          remarks TEXT,
          reference_no TEXT,
          import_source TEXT NOT NULL,
          source_row_number INTEGER NOT NULL,
          version INTEGER NOT NULL DEFAULT 1,
          is_latest INTEGER NOT NULL DEFAULT 1,
          created_by TEXT NOT NULL,
          updated_by TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_transaction_no ON fabric_transactions(transaction_no);
        CREATE INDEX IF NOT EXISTS idx_transaction_fabric ON fabric_transactions(fabric_code);
        CREATE INDEX IF NOT EXISTS idx_transaction_sample ON fabric_transactions(related_sample_no);
        CREATE INDEX IF NOT EXISTS idx_transaction_latest ON fabric_transactions(is_latest);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_transaction_version ON fabric_transactions(transaction_no, version);

        CREATE TABLE IF NOT EXISTS fabric_inventory (
          id TEXT PRIMARY KEY,
          fabric_code TEXT NOT NULL,
          warehouse TEXT NOT NULL,
          location TEXT,
          opening_quantity REAL NOT NULL DEFAULT 0,
          in_quantity REAL NOT NULL DEFAULT 0,
          out_quantity REAL NOT NULL DEFAULT 0,
          closing_quantity REAL NOT NULL DEFAULT 0,
          reserved_quantity REAL NOT NULL DEFAULT 0,
          available_quantity REAL NOT NULL DEFAULT 0,
          unit TEXT NOT NULL,
          inventory_date TEXT NOT NULL,
          checked_by TEXT,
          checked_at TEXT,
          remarks TEXT,
          created_by TEXT NOT NULL,
          updated_by TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(fabric_code, warehouse, inventory_date)
        );

        CREATE TABLE IF NOT EXISTS refund_records (
          id TEXT PRIMARY KEY,
          refund_no TEXT NOT NULL,
          related_sample_no TEXT,
          related_style_no TEXT,
          related_contract_no TEXT,
          type TEXT NOT NULL,
          status TEXT NOT NULL,
          original_amount REAL NOT NULL,
          refund_amount REAL NOT NULL,
          currency TEXT NOT NULL,
          applicant TEXT NOT NULL,
          applicant_department TEXT NOT NULL,
          applied_at TEXT NOT NULL,
          approved_by TEXT,
          approved_at TEXT,
          paid_by TEXT,
          paid_at TEXT,
          payment_method TEXT,
          payment_reference TEXT,
          reason TEXT NOT NULL,
          remarks TEXT,
          import_source TEXT NOT NULL,
          source_row_number INTEGER NOT NULL,
          version INTEGER NOT NULL DEFAULT 1,
          is_latest INTEGER NOT NULL DEFAULT 1,
          created_by TEXT NOT NULL,
          updated_by TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_refund_no ON refund_records(refund_no);
        CREATE INDEX IF NOT EXISTS idx_refund_sample ON refund_records(related_sample_no);
        CREATE INDEX IF NOT EXISTS idx_refund_latest ON refund_records(is_latest);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_refund_version ON refund_records(refund_no, version);
      `);
    }
  },
  {
    version: 3,
    name: 'task_and_audit_tables',
    up: (db: Database.Database) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL UNIQUE,
          type TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          priority TEXT NOT NULL DEFAULT 'medium',
          payload TEXT,
          result TEXT,
          attempts INTEGER NOT NULL DEFAULT 0,
          max_attempts INTEGER NOT NULL DEFAULT 3,
          started_at TEXT,
          completed_at TEXT,
          failed_at TEXT,
          error_message TEXT,
          error_stack TEXT,
          error_code TEXT,
          retry_after TEXT,
          assigned_to TEXT,
          parent_task_id TEXT,
          depends_on TEXT,
          created_by TEXT NOT NULL,
          updated_by TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_task_status ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_task_type ON tasks(type);
        CREATE INDEX IF NOT EXISTS idx_task_priority ON tasks(priority);
        CREATE INDEX IF NOT EXISTS idx_task_parent ON tasks(parent_task_id);

        CREATE TABLE IF NOT EXISTS task_logs (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL,
          timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          level TEXT NOT NULL DEFAULT 'info',
          message TEXT NOT NULL,
          details TEXT,
          FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_task_log_task ON task_logs(task_id);
        CREATE INDEX IF NOT EXISTS idx_task_log_level ON task_logs(level);

        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          actor TEXT NOT NULL,
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          changes TEXT,
          metadata TEXT,
          ip_address TEXT,
          user_agent TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor);
        CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
        CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);

        CREATE TABLE IF NOT EXISTS check_results (
          id TEXT PRIMARY KEY,
          check_id TEXT NOT NULL UNIQUE,
          type TEXT NOT NULL,
          severity TEXT NOT NULL,
          message TEXT NOT NULL,
          details TEXT,
          related_entities TEXT,
          fixed INTEGER NOT NULL DEFAULT 0,
          fixed_at TEXT,
          fixed_by TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_check_type ON check_results(type);
        CREATE INDEX IF NOT EXISTS idx_check_severity ON check_results(severity);
        CREATE INDEX IF NOT EXISTS idx_check_fixed ON check_results(fixed);
      `);
    }
  }
];

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const currentVersionRow = db.prepare(
    'SELECT MAX(version) as version FROM migrations'
  ).get() as { version: number } | undefined;
  
  const currentVersion = currentVersionRow?.version || 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      console.log(`Applying migration ${migration.version}: ${migration.name}`);
      
      const migrate = db.transaction(() => {
        migration.up(db);
        db.prepare(
          'INSERT INTO migrations (version, name) VALUES (?, ?)'
        ).run(migration.version, migration.name);
      });
      
      migrate();
    }
  }
}

export function getCurrentSchemaVersion(db: Database.Database): number {
  const row = db.prepare(
    'SELECT MAX(version) as version FROM migrations'
  ).get() as { version: number } | undefined;
  return row?.version || 0;
}
