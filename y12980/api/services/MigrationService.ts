import { MigrationTaskRepository } from '../repositories/MigrationTaskRepository.js';
import type { MigrationTask, MigrationSummary } from '../../shared/types.js';

export class MigrationService {
  private repo: MigrationTaskRepository;

  constructor() {
    this.repo = new MigrationTaskRepository();
  }

  getAll(): MigrationTask[] {
    return this.repo.findAll();
  }

  getSummary(): MigrationSummary {
    return this.repo.getSummary();
  }

  updateProgress(tableName: string, processed: number, failed: number = 0): MigrationTask | null {
    const existing = this.repo.findAll().find(t => t.tableName === tableName);
    if (!existing) return null;

    const isCompleted = processed >= existing.totalRecords;
    const now = new Date().toISOString();

    return this.repo.update(tableName, {
      processedRecords: processed,
      failedRecords: failed,
      status: isCompleted ? (failed > 0 ? 'FAILED' : 'COMPLETED') : 'IN_PROGRESS',
      completedAt: isCompleted ? now : undefined,
    });
  }

  startMigration(tableName: string): MigrationTask | null {
    const existing = this.repo.findAll().find(t => t.tableName === tableName);
    if (!existing) return null;

    return this.repo.update(tableName, {
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString(),
      processedRecords: 0,
      failedRecords: 0,
    });
  }
}
