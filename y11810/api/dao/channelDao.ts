import db from '../db/index.js';
import type { Channel } from '../../shared/types/index.js';

export const channelDAO = {
  findById(id: string): Channel | undefined {
    const row = db.prepare('SELECT * FROM channel WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      account: row.account,
      rate: row.rate,
      status: row.status as Channel['status'],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  findByAccount(account: string): Channel | undefined {
    const row = db.prepare('SELECT * FROM channel WHERE account = ?').get(account) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      account: row.account,
      rate: row.rate,
      status: row.status as Channel['status'],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  findAll(): Channel[] {
    const rows = db.prepare('SELECT * FROM channel ORDER BY created_at DESC').all() as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      account: row.account,
      rate: row.rate,
      status: row.status as Channel['status'],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  findAllActive(): Channel[] {
    const rows = db.prepare("SELECT * FROM channel WHERE status = 'active' ORDER BY created_at DESC").all() as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      account: row.account,
      rate: row.rate,
      status: row.status as Channel['status'],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },
};
