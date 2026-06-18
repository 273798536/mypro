import { migrationLogRepository } from '../repositories/MigrationLogRepository';
import { changeRepository } from '../repositories/ChangeRepository';
import type { MigrationStatus, RecordStatus } from '../../shared/types';
import { auditLogRepository } from '../repositories/AuditLogRepository';

export class MigrationSyncService {
  async getMigrationStatus(changeRecordId: string): Promise<MigrationStatus> {
    return migrationLogRepository.getStatus(changeRecordId);
  }

  async syncToSource(
    changeRecordId: string,
    userId: string,
    writeBackContent: string
  ): Promise<MigrationStatus> {
    const record = await changeRepository.findById(changeRecordId);
    if (!record) {
      throw new Error('变更记录不存在');
    }

    const status = await migrationLogRepository.sync(changeRecordId, userId, writeBackContent);

    await auditLogRepository.create({
      userId,
      action: 'SYNC_TO_SOURCE',
      resource: 'change_record',
      details: {
        recordId: changeRecordId,
        recordNo: record.recordNo,
        writeBackContent,
      },
    });

    return status;
  }

  async addWriteBack(
    changeRecordId: string,
    userId: string,
    writeBack: string
  ): Promise<MigrationStatus> {
    const record = await changeRepository.findById(changeRecordId);
    if (!record) {
      throw new Error('变更记录不存在');
    }

    const status = await migrationLogRepository.addWriteBack(changeRecordId, userId, writeBack);

    await auditLogRepository.create({
      userId,
      action: 'ADD_WRITE_BACK',
      resource: 'change_record',
      details: {
        recordId: changeRecordId,
        recordNo: record.recordNo,
        writeBack,
      },
    });

    return status;
  }

  async bulkTransfer(
    ids: string[],
    targetStatus: RecordStatus,
    userId: string
  ): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    const validIds: string[] = [];

    for (const id of ids) {
      const record = await changeRepository.findById(id);
      if (!record) {
        errors.push(`记录 ${id} 不存在`);
        continue;
      }
      validIds.push(id);
    }

    const updated = await changeRepository.bulkUpdateStatus(validIds, targetStatus);

    await auditLogRepository.create({
      userId,
      action: 'BULK_TRANSFER',
      resource: 'change_record',
      details: {
        count: updated,
        targetStatus,
        recordIds: validIds,
      },
    });

    return { updated, errors };
  }

  async endOfMonthTransfer(userId: string): Promise<{
    transferred: number;
    unavailable: number;
    pendingReview: number;
    details: Array<{ recordNo: string; tableName: string; fieldName: string; status: string }>;
  }> {
    const { data: allRecords } = await changeRepository.findAll({}, 1, 10000);

    const unavailableRecords = allRecords.filter((r) => r.status === 'UNAVAILABLE');
    const pendingRecords = allRecords.filter((r) => r.status === 'PENDING_REVIEW');
    const availableRecords = allRecords.filter((r) => r.status === 'AVAILABLE');

    const details = [
      ...unavailableRecords.map((r) => ({
        recordNo: r.recordNo,
        tableName: r.tableName,
        fieldName: r.fieldName,
        status: 'UNAVAILABLE',
      })),
      ...pendingRecords.map((r) => ({
        recordNo: r.recordNo,
        tableName: r.tableName,
        fieldName: r.fieldName,
        status: 'PENDING_REVIEW',
      })),
      ...availableRecords.map((r) => ({
        recordNo: r.recordNo,
        tableName: r.tableName,
        fieldName: r.fieldName,
        status: 'AVAILABLE',
      })),
    ];

    await auditLogRepository.create({
      userId,
      action: 'END_OF_MONTH_TRANSFER',
      resource: 'change_record',
      details: {
        total: allRecords.length,
        available: availableRecords.length,
        pendingReview: pendingRecords.length,
        unavailable: unavailableRecords.length,
      },
    });

    return {
      transferred: allRecords.length,
      unavailable: unavailableRecords.length,
      pendingReview: pendingRecords.length,
      details,
    };
  }
}

export const migrationSyncService = new MigrationSyncService();
