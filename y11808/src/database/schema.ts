import { run } from './connection';

export const createTables = async (): Promise<void> => {
  await run(`
    CREATE TABLE IF NOT EXISTS prepayment_flows (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      contract_no TEXT NOT NULL,
      prepayment_amount DECIMAL(12,2) NOT NULL,
      paid_date TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      remark TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      prepayment_flow_id TEXT NOT NULL,
      invoice_no TEXT NOT NULL,
      invoice_date TEXT NOT NULL,
      invoice_amount DECIMAL(12,2) NOT NULL,
      tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'normal',
      original_invoice_id TEXT,
      red_flush_date TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      remark TEXT,
      FOREIGN KEY (prepayment_flow_id) REFERENCES prepayment_flows(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS warehouse_receipts (
      id TEXT PRIMARY KEY,
      prepayment_flow_id TEXT NOT NULL,
      receipt_no TEXT NOT NULL,
      receipt_date TEXT NOT NULL,
      total_amount DECIMAL(12,2) NOT NULL,
      total_quantity DECIMAL(12,4) NOT NULL,
      status TEXT NOT NULL DEFAULT 'normal',
      parent_receipt_id TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      remark TEXT,
      FOREIGN KEY (prepayment_flow_id) REFERENCES prepayment_flows(id),
      FOREIGN KEY (parent_receipt_id) REFERENCES warehouse_receipts(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS warehouse_receipt_items (
      id TEXT PRIMARY KEY,
      receipt_id TEXT NOT NULL,
      material_code TEXT NOT NULL,
      material_name TEXT NOT NULL,
      quantity DECIMAL(12,4) NOT NULL,
      unit_price DECIMAL(12,4) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      FOREIGN KEY (receipt_id) REFERENCES warehouse_receipts(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS penalty_records (
      id TEXT PRIMARY KEY,
      prepayment_flow_id TEXT NOT NULL,
      penalty_type TEXT NOT NULL,
      penalty_amount DECIMAL(12,2) NOT NULL,
      penalty_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (prepayment_flow_id) REFERENCES prepayment_flows(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS verification_records (
      id TEXT PRIMARY KEY,
      prepayment_flow_id TEXT NOT NULL,
      invoice_id TEXT NOT NULL,
      warehouse_receipt_id TEXT,
      verified_amount DECIMAL(12,2) NOT NULL,
      verification_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      reversed_by_id TEXT,
      reversed_at TEXT,
      reverse_reason TEXT,
      FOREIGN KEY (prepayment_flow_id) REFERENCES prepayment_flows(id),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (warehouse_receipt_id) REFERENCES warehouse_receipts(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS prepayment_ledgers (
      id TEXT PRIMARY KEY,
      prepayment_flow_id TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      transaction_date TEXT NOT NULL,
      debit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      credit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      balance DECIMAL(12,2) NOT NULL,
      reference_id TEXT NOT NULL,
      reference_type TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      remark TEXT,
      FOREIGN KEY (prepayment_flow_id) REFERENCES prepayment_flows(id)
    )
  `);

  await run(`
    CREATE INDEX IF NOT EXISTS idx_prepayment_flow_id ON invoices(prepayment_flow_id)
  `);
  await run(`
    CREATE INDEX IF NOT EXISTS idx_verification_flow_id ON verification_records(prepayment_flow_id)
  `);
  await run(`
    CREATE INDEX IF NOT EXISTS idx_ledger_flow_id ON prepayment_ledgers(prepayment_flow_id)
  `);
};
