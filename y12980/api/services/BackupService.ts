import { BackupCheckRepository } from '../repositories/BackupCheckRepository.js';
import type { BackupCheck, BackupSummary } from '../../shared/types.js';

export class BackupService {
  private repo: BackupCheckRepository;

  constructor() {
    this.repo = new BackupCheckRepository();
  }

  getAll(): BackupCheck[] {
    return this.repo.findAll();
  }

  getSummary(): BackupSummary {
    return this.repo.getSummary();
  }

  getGaps(): BackupCheck[] {
    return this.repo.findGaps();
  }

  runCheck(tableName: string): BackupCheck {
    const expected = Math.floor(Math.random() * 50000) + 10000;
    const hasGap = Math.random() < 0.2;
    const actual = hasGap ? expected - Math.floor(Math.random() * 1000) - 100 : expected;
    
    return this.repo.create({
      tableName,
      backupDate: new Date().toISOString().split('T')[0],
      status: hasGap ? 'MISSING' : (Math.random() < 0.05 ? 'CORRUPTED' : 'VERIFIED'),
      expectedRecords: expected,
      actualRecords: actual,
      gapRecords: Math.max(0, expected - actual),
      checksum: hasGap ? undefined : `sha256:${Math.random().toString(16).slice(2, 34)}`,
    });
  }
}
