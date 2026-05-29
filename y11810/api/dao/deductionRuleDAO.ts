import db from '../db/index.js';
import type { DeductionRule } from '../../shared/types/index.js';

export const deductionRuleDAO = {
  findById(id: string): DeductionRule | undefined {
    const row = db.prepare('SELECT * FROM deduction_rule WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      type: row.type as DeductionRule['type'],
      condition: row.condition,
      deductionRate: row.deduction_rate,
      version: row.version,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  findAllActive(): DeductionRule[] {
    const rows = db.prepare('SELECT * FROM deduction_rule WHERE is_active = 1 ORDER BY type ASC, version DESC').all() as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type as DeductionRule['type'],
      condition: row.condition,
      deductionRate: row.deduction_rate,
      version: row.version,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  findByType(type: DeductionRule['type']): DeductionRule[] {
    const rows = db.prepare(`
      SELECT * FROM deduction_rule 
      WHERE type = ? AND is_active = 1 
      ORDER BY version DESC
    `).all(type) as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type as DeductionRule['type'],
      condition: row.condition,
      deductionRate: row.deduction_rate,
      version: row.version,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  getLatestVersion(): number {
    const result = db.prepare('SELECT COALESCE(MAX(version), 0) as version FROM deduction_rule').get() as { version: number };
    return result.version;
  },

  findAll(): DeductionRule[] {
    const rows = db.prepare('SELECT * FROM deduction_rule ORDER BY version DESC, type ASC').all() as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type as DeductionRule['type'],
      condition: row.condition,
      deductionRate: row.deduction_rate,
      version: row.version,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },
};
