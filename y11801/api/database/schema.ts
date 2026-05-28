import { getDb } from './index.js';

const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS import_log (
    id TEXT PRIMARY KEY,
    batch_id TEXT UNIQUE NOT NULL,
    data_type TEXT NOT NULL CHECK (data_type IN ('vehicle', 'contract', 'residual')),
    file_name TEXT NOT NULL,
    record_count INTEGER NOT NULL DEFAULT 0,
    import_order INTEGER NOT NULL,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    imported_by TEXT NOT NULL DEFAULT 'system',
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'partial')),
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS vehicle_record (
    id TEXT PRIMARY KEY,
    vin TEXT UNIQUE NOT NULL,
    plate_number TEXT,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    purchase_price DECIMAL(12,2) NOT NULL,
    store_price DECIMAL(12,2) NOT NULL,
    store_price_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    store_id TEXT NOT NULL,
    store_name TEXT NOT NULL,
    import_batch_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (import_batch_id) REFERENCES import_log(batch_id)
);

CREATE TABLE IF NOT EXISTS loan_contract (
    id TEXT PRIMARY KEY,
    contract_no TEXT UNIQUE NOT NULL,
    vin TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    loan_amount DECIMAL(12,2) NOT NULL,
    loan_term INTEGER NOT NULL,
    interest_rate DECIMAL(6,4) NOT NULL,
    monthly_payment DECIMAL(12,2) NOT NULL,
    remaining_principal DECIMAL(12,2) NOT NULL,
    remaining_interest DECIMAL(12,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_vehicle_replaced BOOLEAN DEFAULT 0,
    replacement_reason TEXT,
    subsidy_amount DECIMAL(12,2) DEFAULT 0,
    subsidy_type TEXT CHECK (subsidy_type IN ('national', 'local', 'dealer')),
    subsidy_clawback_required BOOLEAN DEFAULT 0,
    clawback_amount DECIMAL(12,2) DEFAULT 0,
    import_batch_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (import_batch_id) REFERENCES import_log(batch_id)
);

CREATE TABLE IF NOT EXISTS residual_table (
    id TEXT PRIMARY KEY,
    vin TEXT NOT NULL,
    residual_value DECIMAL(12,2) NOT NULL,
    residual_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    valuation_company TEXT NOT NULL,
    is_expired BOOLEAN DEFAULT 0,
    import_batch_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (import_batch_id) REFERENCES import_log(batch_id)
);

CREATE TABLE IF NOT EXISTS pending_item (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('residual_expired', 'contract_replaced', 'subsidy_clawback')),
    related_record_id TEXT NOT NULL,
    related_record_type TEXT NOT NULL CHECK (related_record_type IN ('vehicle', 'contract', 'residual')),
    title TEXT NOT NULL,
    description TEXT,
    level TEXT NOT NULL CHECK (level IN ('high', 'medium', 'low')),
    remaining_days INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'ignored')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    confirmed_by TEXT,
    note TEXT
);

CREATE TABLE IF NOT EXISTS calculation_result (
    id TEXT PRIMARY KEY,
    vin TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    contract_id TEXT NOT NULL,
    residual_id TEXT,
    store_price DECIMAL(12,2) NOT NULL,
    remaining_balance DECIMAL(12,2) NOT NULL,
    residual_value DECIMAL(12,2) DEFAULT 0,
    subsidy_deduction DECIMAL(12,2) DEFAULT 0,
    subsidy_clawback DECIMAL(12,2) DEFAULT 0,
    final_payable DECIMAL(12,2) DEFAULT 0,
    final_receivable DECIMAL(12,2) DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('ready', 'need_confirm', 'cannot_calculate')),
    status_reason TEXT,
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recalculated_count INTEGER DEFAULT 0,
    last_recalculated_at DATETIME,
    last_recalculated_by TEXT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicle_record(id),
    FOREIGN KEY (contract_id) REFERENCES loan_contract(id),
    FOREIGN KEY (residual_id) REFERENCES residual_table(id)
);

CREATE TABLE IF NOT EXISTS audit_history (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    record_type TEXT NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by TEXT NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    change_reason TEXT
);

CREATE TABLE IF NOT EXISTS export_task (
    id TEXT PRIMARY KEY,
    task_name TEXT NOT NULL,
    export_type TEXT NOT NULL CHECK (export_type IN ('excel', 'pdf')),
    record_ids TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    download_url TEXT,
    file_size INTEGER,
    created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vehicle_vin ON vehicle_record(vin);
CREATE INDEX IF NOT EXISTS idx_vehicle_store ON vehicle_record(store_id);
CREATE INDEX IF NOT EXISTS idx_contract_vin ON loan_contract(vin);
CREATE INDEX IF NOT EXISTS idx_contract_no ON loan_contract(contract_no);
CREATE INDEX IF NOT EXISTS idx_residual_vin ON residual_table(vin);
CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_item(status);
CREATE INDEX IF NOT EXISTS idx_pending_type ON pending_item(type);
CREATE INDEX IF NOT EXISTS idx_calc_status ON calculation_result(status);
CREATE INDEX IF NOT EXISTS idx_calc_vin ON calculation_result(vin);
CREATE INDEX IF NOT EXISTS idx_audit_record ON audit_history(record_id, record_type);
CREATE INDEX IF NOT EXISTS idx_import_order ON import_log(import_order DESC);
`;

export function initSchema(): void {
  const db = getDb();
  db.exec(SCHEMA_SQL);
}

export default { initSchema };
