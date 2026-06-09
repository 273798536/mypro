import { RecordRepository } from '../repositories/RecordRepository.js';
import { SnapshotRepository } from '../repositories/SnapshotRepository.js';
import type { ProcessingRecord } from '../../shared/types.js';

export const RecordService = {
  listBySnapshot(snapshotId: string): ProcessingRecord[] {
    return RecordRepository.findBySnapshotId(snapshotId);
  },

  latest(snapshotId: string): ProcessingRecord | null {
    return RecordRepository.findLatest(snapshotId);
  },

  createOrUpdate(snapshotId: string, data: Partial<ProcessingRecord>, operator: string): ProcessingRecord {
    const snapshot = SnapshotRepository.findById(snapshotId);
    if (!snapshot) {
      throw new Error('Snapshot not found');
    }
    const latest = RecordRepository.findLatest(snapshotId);
    const record: Omit<ProcessingRecord, 'id' | 'createdAt'> = {
      snapshotId,
      sectionData: data.sectionData ?? latest?.sectionData ?? null,
      coordinates: data.coordinates ?? latest?.coordinates ?? null,
      dimensions: data.dimensions ?? latest?.dimensions ?? null,
      conversions: data.conversions ?? latest?.conversions ?? [],
      riskNotes: data.riskNotes ?? latest?.riskNotes ?? '',
      conclusion: data.conclusion ?? latest?.conclusion ?? '',
      operator,
    };
    const created = RecordRepository.create(record);
    SnapshotRepository.update(snapshotId, {
      status: 'reviewing',
      lastOperator: operator,
    });
    return created;
  },
};
