import { getDb } from '../index.js';
import type { ContractRow } from '../types.js';

export function insertContract(record: Omit<ContractRow, 'id' | 'created_at'> & { id?: string }): string {
  const db = getDb();
  const id = record.id || crypto.randomUUID();
  db.prepare(`
    INSERT INTO contract_rate (id, vessel_name, port, free_hours, currency, rate_tier1, rate_tier1_max_days, rate_tier2, rate_tier2_max_days, rate_tier3, valid_from, valid_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, record.vessel_name, record.port, record.free_hours, record.currency || 'USD', record.rate_tier1, record.rate_tier1_max_days, record.rate_tier2, record.rate_tier2_max_days, record.rate_tier3, record.valid_from, record.valid_to);
  return id;
}

export function getAllContracts(): ContractRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM contract_rate ORDER BY created_at DESC').all() as ContractRow[];
}

export function getContractByVesselAndPort(vesselName: string, port: string): ContractRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM contract_rate WHERE vessel_name = ? AND port = ? ORDER BY valid_from DESC LIMIT 1').get(vesselName, port) as ContractRow | undefined;
}

export function updateContract(id: string, updates: Partial<ContractRow>): boolean {
  const db = getDb();
  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
  if (fields.length === 0) return false;
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (updates as Record<string, unknown>)[f]);
  const result = db.prepare(`UPDATE contract_rate SET ${setClause} WHERE id = ?`).run(...values, id);
  return result.changes > 0;
}

export function deleteAllContracts(): void {
  const db = getDb();
  db.prepare('DELETE FROM contract_rate').run();
}
