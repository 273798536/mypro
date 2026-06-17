import { getDb } from '../db/connection';
import { nanoid } from 'nanoid';
import type { PromptVersion } from '../../shared/types';

interface PromptVersionRow {
  id: string;
  version: string;
  content: string;
  description: string;
  effective_from: string;
  effective_to: string | null;
  is_active: number;
  created_by: string;
  created_at: string;
}

function mapRowToPromptVersion(row: PromptVersionRow): PromptVersion {
  return {
    id: row.id,
    version: row.version,
    content: row.content,
    description: row.description,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to || undefined,
    isActive: row.is_active === 1,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

export class PromptRepository {
  private db = getDb();

  findAll(): PromptVersion[] {
    const stmt = this.db.prepare(`
      SELECT * FROM prompt_versions 
      ORDER BY effective_from DESC
    `);
    const rows = stmt.all() as PromptVersionRow[];
    return rows.map(mapRowToPromptVersion);
  }

  findById(id: string): PromptVersion | null {
    const stmt = this.db.prepare('SELECT * FROM prompt_versions WHERE id = ?');
    const row = stmt.get(id) as PromptVersionRow | undefined;
    return row ? mapRowToPromptVersion(row) : null;
  }

  findActive(): PromptVersion | null {
    const stmt = this.db.prepare('SELECT * FROM prompt_versions WHERE is_active = 1 LIMIT 1');
    const row = stmt.get() as PromptVersionRow | undefined;
    return row ? mapRowToPromptVersion(row) : null;
  }

  create(data: Omit<PromptVersion, 'id' | 'createdAt'>): PromptVersion {
    const id = 'pv_' + nanoid(6);
    const stmt = this.db.prepare(`
      INSERT INTO prompt_versions
      (id, version, content, description, effective_from, effective_to, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.version,
      data.content,
      data.description,
      data.effectiveFrom,
      data.effectiveTo || null,
      data.isActive ? 1 : 0,
      data.createdBy
    );
    return this.findById(id)!;
  }

  activate(id: string): void {
    const db = getDb();
    
    db.transaction(() => {
      db.prepare('UPDATE prompt_versions SET is_active = 0, effective_to = CURRENT_TIMESTAMP WHERE is_active = 1').run();
      db.prepare('UPDATE prompt_versions SET is_active = 1, effective_from = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    })();
  }
}
