import {
  backupRecords as mockBackups,
  conflictRecords as mockConflicts,
  rollbackRecords as mockRollbacks,
  users,
} from '../mock/data';
import { LocalStorageProvider } from './LocalStorageProvider';
import type {
  BackupRecord,
  ConflictRecord,
  OperationLog,
  PermissionSnapshot,
  ResolveInfo,
  ResolveResult,
  ResolveStrategy,
  RollbackRecord,
} from '../types';

const OPERATOR = users[1] ?? users[3];

const uid = (prefix: string, salt: string): string =>
  `${prefix}_${salt}_${Date.now().toString(36)}${Math.floor(Math.random() * 0xffff).toString(36)}`;

const nowISO = (): string => new Date().toISOString();

const persistOperationLog = (log: OperationLog): void => {
  LocalStorageProvider.appendToList<OperationLog>('operation_logs', log);
};

const persistPermissionSnapshot = (ps: PermissionSnapshot): void => {
  LocalStorageProvider.appendToList<PermissionSnapshot>('permission_snapshots', ps);
};

const persistBackup = (bak: BackupRecord): void => {
  LocalStorageProvider.appendToList<BackupRecord>('backup_records', bak);
};

const persistRollback = (rb: RollbackRecord): void => {
  LocalStorageProvider.appendToList<RollbackRecord>('rollback_records', rb);
};

export const ResolveService = {
  async resolve(
    conflictId: string,
    strategy: ResolveStrategy,
    remark: string,
    withBackup: boolean
  ): Promise<ResolveResult> {
    const conflict = mockConflicts.find((c) => c.id === conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    const salt = `${conflictId}_${Math.floor(Math.random() * 1e6)}`;
    const resolveInfoId = `ri_${salt}`;
    const permissionSnapshotId = `ps_${salt}`;
    const operationLogId = `op_${salt}`;
    const backupRecordId = withBackup ? uid('bak', salt) : `bak_na_${salt}`;
    const rollbackRecordId = withBackup ? uid('rb', salt) : `rb_na_${salt}`;

    const ps: PermissionSnapshot = {
      id: permissionSnapshotId,
      operationId: operationLogId,
      userId: OPERATOR.id,
      capturedAt: nowISO(),
      roleIdsAtThatTime: [...OPERATOR.roleIds],
      permissionsAtThatTime: [...OPERATOR.effectivePermissions],
      permissionSource: 'role_grant',
      valid: true,
    };
    persistPermissionSnapshot(ps);

    const beforeState: Record<string, unknown> = {
      status: conflict.status,
      assignee: conflict.assignee ?? null,
      resolveInfo: conflict.resolveInfo ? { ...conflict.resolveInfo } : null,
    };

    const resolvedAt = nowISO();
    const resolveInfo: ResolveInfo = {
      strategy,
      resolvedAt,
      resolvedBy: OPERATOR.id,
      remark,
      backupRecordId: withBackup ? backupRecordId : undefined,
      rollbackRecordId: withBackup ? rollbackRecordId : undefined,
      changes: {
        status: { before: conflict.status, after: 'resolved' },
        updatedAt: { before: conflict.updatedAt, after: resolvedAt },
      },
    };

    const bak: BackupRecord = {
      id: backupRecordId,
      conflictId,
      linkedResolveInfoId: resolveInfoId,
      createdAt: resolvedAt,
      createdBy: OPERATOR.id,
      backupScope: withBackup ? 'changed_fields' : 'custom',
      backupData: {
        orderNo: conflict.orderNo,
        snapshotBeforeId: conflict.snapshotBeforeId,
        snapshotAfterId: conflict.snapshotAfterId,
        originalStatus: conflict.status,
        strategy,
      },
      restored: false,
    };
    if (withBackup) {
      mockBackups.push(bak);
      persistBackup(bak);
    }

    const rb: RollbackRecord = {
      id: rollbackRecordId,
      conflictId,
      linkedBackupId: backupRecordId,
      linkedResolveInfoId: resolveInfoId,
      updatedAt: resolvedAt,
      updatedBy: OPERATOR.id,
      rollbackStatus: withBackup ? 'pending' : 'pending',
      fieldRollbacks: {
        status: { from: 'resolved', to: beforeState.status as string },
        assignee: { from: OPERATOR.id, to: beforeState.assignee ?? null },
      },
    };
    mockRollbacks.push(rb);
    persistRollback(rb);

    resolveInfo.backupRecordId = backupRecordId;
    resolveInfo.rollbackRecordId = rollbackRecordId;

    const updatedConflict: ConflictRecord = {
      ...conflict,
      status: 'resolved',
      resolveInfo,
      updatedAt: resolvedAt,
    };
    const idx = mockConflicts.findIndex((c) => c.id === conflictId);
    if (idx >= 0) mockConflicts[idx] = updatedConflict;

    const log: OperationLog = {
      id: operationLogId,
      conflictId,
      operationType: 'resolve',
      operatorId: OPERATOR.id,
      operatorName: OPERATOR.displayName,
      operatedAt: resolvedAt,
      permissionSnapshotId,
      detail: {
        strategy,
        remark,
        withBackup,
        resolveInfoId,
      },
      beforeState,
      afterState: {
        status: 'resolved',
        assignee: OPERATOR.id,
        resolveInfo,
      },
      relatedBackupId: withBackup ? backupRecordId : undefined,
      relatedRollbackId: rollbackRecordId,
      remark: withBackup
        ? `已按策略【${strategy}】处理，并生成备份/回滚记录关联`
        : `已按策略【${strategy}】处理，未创建数据备份`,
    };
    persistOperationLog(log);

    return {
      resolveInfoId,
      backupRecordId,
      rollbackRecordId,
      operationLogId,
      permissionSnapshotId,
      conflictId,
      conflictStatus: 'resolved',
    };
  },
};
