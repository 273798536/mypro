import { HistoryRepository } from '../repositories/HistoryRepository.js';
import { RecordRepository } from '../repositories/RecordRepository.js';
import { SnapshotRepository } from '../repositories/SnapshotRepository.js';
import type {
  HistoryRecord,
  FieldChange,
  ProcessingRecord,
  ReviewSubmission,
} from '../../shared/types.js';

function diffRecords(oldRec: ProcessingRecord | null, newRec: ProcessingRecord): FieldChange[] {
  const changes: FieldChange[] = [];
  const fields: Array<[string, keyof ProcessingRecord]> = [
    ['sectionData', 'sectionData'],
    ['coordinates', 'coordinates'],
    ['dimensions', 'dimensions'],
    ['conversions', 'conversions'],
    ['riskNotes', 'riskNotes'],
    ['conclusion', 'conclusion'],
  ];
  for (const [label, key] of fields) {
    const oldV = oldRec ? oldRec[key] : null;
    const newV = newRec[key];
    if (JSON.stringify(oldV) !== JSON.stringify(newV)) {
      changes.push({ field: label, oldValue: oldV, newValue: newV });
    }
  }
  return changes;
}

export const HistoryService = {
  listBySnapshot(snapshotId: string): HistoryRecord[] {
    return HistoryRepository.findBySnapshotId(snapshotId);
  },

  getDiff(recordId1: string, recordId2: string): FieldChange[] {
    return HistoryRepository.getDiff(recordId1, recordId2);
  },

  submitReview(submission: ReviewSubmission): HistoryRecord {
    const { snapshotId, processingRecord, changeReason, operator } = submission;
    const snapshot = SnapshotRepository.findById(snapshotId);
    if (!snapshot) throw new Error('Snapshot not found');
    const latest = RecordRepository.findLatest(snapshotId);
    const savedRecord = RecordRepository.create({
      snapshotId,
      sectionData: processingRecord.sectionData ?? latest?.sectionData ?? null,
      coordinates: processingRecord.coordinates ?? latest?.coordinates ?? null,
      dimensions: processingRecord.dimensions ?? latest?.dimensions ?? null,
      conversions: processingRecord.conversions ?? latest?.conversions ?? [],
      riskNotes: processingRecord.riskNotes ?? latest?.riskNotes ?? '',
      conclusion: processingRecord.conclusion ?? latest?.conclusion ?? '',
      operator,
    });
    const changes = diffRecords(latest, savedRecord);
    const allApproved = submission.riskApproved && submission.coordinateApproved && submission.conversionApproved;
    SnapshotRepository.update(snapshotId, {
      status: allApproved ? 'approved' : 'rejected',
      lastOperator: operator,
    });
    return HistoryRepository.create({
      snapshotId,
      processingRecordId: savedRecord.id,
      operator,
      changeReason,
      changes,
    });
  },
};
