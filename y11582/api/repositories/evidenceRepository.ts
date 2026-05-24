
import { getDatabase } from '../db/database';
import type { OriginalEvidence } from '../../shared/types';
import { randomUUID, createHash } from 'crypto';

function rowToEvidence(row: any): OriginalEvidence {
  return {
    id: row.id,
    taskId: row.task_id,
    fileName: row.file_name,
    fileHash: row.file_hash,
    originalContent: row.original_content,
    lineNumber: row.line_number,
    createdAt: row.created_at,
  };
}

export const evidenceRepository = {
  create(data: {
    taskId: string;
    fileName: string;
    originalContent: string;
    lineNumber: number;
  }): OriginalEvidence {
    const db = getDatabase();
    const id = randomUUID();
    const now = new Date().toISOString();
    const fileHash = this.calculateHash(data.originalContent);
    
    const stmt = db.prepare(`
      INSERT INTO original_evidence (id, task_id, file_name, file_hash, original_content, line_number, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      data.taskId,
      data.fileName,
      fileHash,
      data.originalContent,
      data.lineNumber,
      now
    );
    
    return this.findById(id)!;
  },

  findById(id: string): OriginalEvidence | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM original_evidence WHERE id = ?').get(id);
    return row ? rowToEvidence(row) : null;
  },

  findByTaskId(taskId: string): OriginalEvidence | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM original_evidence WHERE task_id = ?').get(taskId);
    return row ? rowToEvidence(row) : null;
  },

  calculateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  },

  verifyIntegrity(evidence: OriginalEvidence): boolean {
    const calculatedHash = this.calculateHash(evidence.originalContent);
    return calculatedHash === evidence.fileHash;
  },
};
