import type { RecordStatus } from '../../shared/types.js';
import { getDb, genId } from '../db/index.js';

const STATUS_FLOW: Record<RecordStatus, RecordStatus | null> = {
  pending: 'reviewing',
  reviewing: 'resolved',
  resolved: 'confirmed',
  confirmed: null,
};

export function getNextStatus(current: RecordStatus): RecordStatus | null {
  return STATUS_FLOW[current] ?? null;
}

export function canTransition(from: RecordStatus, to: RecordStatus): boolean {
  return STATUS_FLOW[from] === to;
}

export interface TransitionInput {
  roundId: string;
  entityType: 'record' | 'anomaly';
  entityId: string;
  fromStatus: RecordStatus;
  toStatus: RecordStatus;
  operator: string;
  remark: string;
}

export function recordTransition(input: TransitionInput): void {
  const db = getDb();
  const logId = genId('log');
  const stmt = db.prepare(`
    INSERT INTO status_log
    (id, round_id, entity_type, entity_id, from_status, to_status, operator, remark, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    logId,
    input.roundId,
    input.entityType,
    input.entityId,
    input.fromStatus,
    input.toStatus,
    input.operator,
    input.remark,
    Date.now(),
  );
}

export const STATUS_LABEL: Record<RecordStatus, string> = {
  pending: '待处理',
  reviewing: '复核中',
  resolved: '已处理',
  confirmed: '已确认',
};
