import { LedgerRepository } from '../repositories/LedgerRepository.js';
import type { LedgerRecord, GetLedgerParams, PaginatedResponse, UpdateLedgerRequest, RecordStatus } from '../../shared/types.js';

export class LedgerService {
  private repo: LedgerRepository;

  constructor() {
    this.repo = new LedgerRepository();
  }

  getList(params: GetLedgerParams): PaginatedResponse<LedgerRecord> {
    return this.repo.findPaginated(params);
  }

  getById(id: string): LedgerRecord | null {
    return this.repo.findById(id);
  }

  update(id: string, updates: UpdateLedgerRequest, handledBy: string = 'dba_admin'): LedgerRecord | null {
    const finalUpdates: UpdateLedgerRequest = { ...updates };
    
    if (updates.status && updates.status !== 'NEEDS_REVIEW') {
      const now = new Date().toISOString();
      const existing = this.repo.findById(id);
      
      if (updates.status === 'AVAILABLE') {
        finalUpdates.handlingOpinion = updates.handlingOpinion || existing?.handlingOpinion || 'DBA复核通过，数据可用';
      } else if (updates.status === 'UNAVAILABLE') {
        finalUpdates.handlingOpinion = updates.handlingOpinion || existing?.handlingOpinion || 'DBA确认数据存在问题，标记为不可用';
      }

      return this.repo.update(id, {
        ...finalUpdates,
      });
    }

    return this.repo.update(id, finalUpdates);
  }

  getStatusCounts(): Record<RecordStatus, number> {
    return this.repo.countByStatus();
  }

  getGapRecords(): LedgerRecord[] {
    return this.repo.findGaps();
  }
}
