import {
  operationLogs as mockLogs,
  permissionSnapshots as mockSnapshots,
  backupRecords as mockBackups,
  rollbackRecords as mockRollbacks,
} from '../mock/data';
import { LocalStorageProvider } from './LocalStorageProvider';
import type {
  OperationLog,
  OperationType,
  PermissionSnapshot,
} from '../types';

interface LogFilters {
  operationType?: OperationType[];
  operatorId?: string;
  conflictId?: string;
  dateFrom?: string;
  dateTo?: string;
  withRelatedRecords?: boolean;
}

const persistedLogs = (): OperationLog[] => {
  const persisted = LocalStorageProvider.list<OperationLog>('operation_logs');
  return [...mockLogs, ...persisted];
};

const persistedSnapshots = (): PermissionSnapshot[] => {
  const persisted = LocalStorageProvider.list<PermissionSnapshot>('permission_snapshots');
  return [...mockSnapshots, ...persisted];
};

export const AuditService = {
  listOperationLogs(filters: LogFilters = {}): OperationLog[] {
    const { operationType, operatorId, conflictId, dateFrom, dateTo } = filters;
    let logs = persistedLogs();
    if (operationType && operationType.length > 0) {
      logs = logs.filter((l) => operationType.includes(l.operationType));
    }
    if (operatorId) logs = logs.filter((l) => l.operatorId === operatorId);
    if (conflictId) logs = logs.filter((l) => l.conflictId === conflictId);
    if (dateFrom) logs = logs.filter((l) => l.operatedAt >= dateFrom);
    if (dateTo) logs = logs.filter((l) => l.operatedAt <= dateTo);
    logs.sort((a, b) => Date.parse(b.operatedAt) - Date.parse(a.operatedAt));
    return logs;
  },

  listPermissionSnapshots(): PermissionSnapshot[] {
    return persistedSnapshots().sort((a, b) =>
      Date.parse(b.capturedAt) - Date.parse(a.capturedAt)
    );
  },

  getAuditChain(conflictId: string): {
    logs: OperationLog[];
    snapshots: PermissionSnapshot[];
    backups: { id: string; createdAt: string; restored: boolean }[];
    rollbacks: { id: string; updatedAt: string; status: string }[];
  } {
    const logs = AuditService.listOperationLogs({ conflictId });
    const snapshotIds = logs.map((l) => l.permissionSnapshotId);
    const snapshots = persistedSnapshots().filter((s) => snapshotIds.includes(s.id));
    const persistedBackups = LocalStorageProvider.list<{
      id: string;
      conflictId: string;
      createdAt: string;
      restored: boolean;
    }>('backup_records');
    const allBackups = [
      ...mockBackups.map((b) => ({
        id: b.id,
        conflictId: b.conflictId,
        createdAt: b.createdAt,
        restored: b.restored,
      })),
      ...persistedBackups,
    ].filter((b) => b.conflictId === conflictId);

    const persistedRollbacks = LocalStorageProvider.list<{
      id: string;
      conflictId: string;
      updatedAt: string;
      rollbackStatus: string;
    }>('rollback_records');
    const allRollbacks = [
      ...mockRollbacks.map((r) => ({
        id: r.id,
        conflictId: r.conflictId,
        updatedAt: r.updatedAt,
        status: r.rollbackStatus,
      })),
      ...persistedRollbacks.map((r) => ({
        id: r.id,
        conflictId: r.conflictId,
        updatedAt: r.updatedAt,
        status: r.rollbackStatus,
      })),
    ].filter((r) => r.conflictId === conflictId);

    return {
      logs,
      snapshots,
      backups: allBackups,
      rollbacks: allRollbacks,
    };
  },
};
