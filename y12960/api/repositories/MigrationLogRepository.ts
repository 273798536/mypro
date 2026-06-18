import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import type { MigrationStatus } from '../../shared/types';

interface DbMigrationLog {
  id: string;
  change_record_id: string;
  synced: number;
  sync_at: string;
  source_write_back: string;
  synced_by: string;
}

export class MigrationLogRepository {
  async getStatus(changeRecordId: string): Promise<MigrationStatus> {
    const logs = db
      .prepare(
        `SELECT * FROM migration_log 
         WHERE change_record_id = ? 
         ORDER BY sync_at DESC`
      )
      .all(changeRecordId) as DbMigrationLog[];

    const latestSync = logs.find((l) => l.synced === 1);
    const writeBacks = logs
      .filter((l) => l.source_write_back)
      .map((l) => l.source_write_back);

    return {
      synced: latestSync ? true : false,
      lastSyncAt: latestSync?.sync_at || '',
      sourceWriteBack: writeBacks,
    };
  }

  async sync(
    changeRecordId: string,
    userId: string,
    sourceWriteBack: string
  ): Promise<MigrationStatus> {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO migration_log (id, change_record_id, synced, sync_at, source_write_back, synced_by)
       VALUES (?, ?, 1, ?, ?, ?)`
    ).run(id, changeRecordId, now, sourceWriteBack, userId);

    return this.getStatus(changeRecordId);
  }

  async addWriteBack(
    changeRecordId: string,
    userId: string,
    writeBack: string
  ): Promise<MigrationStatus> {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO migration_log (id, change_record_id, synced, sync_at, source_write_back, synced_by)
       VALUES (?, ?, 0, ?, ?, ?)`
    ).run(id, changeRecordId, now, writeBack, userId);

    return this.getStatus(changeRecordId);
  }
}

export const migrationLogRepository = new MigrationLogRepository();
