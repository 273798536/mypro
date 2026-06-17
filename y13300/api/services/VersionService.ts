import { db } from '../db/database.js';
import { TicketRepository, VersionRepository, EvidenceRepository, AuditLogRepository } from '../repositories/index.js';
import type { TicketVersion, TicketStatus, EvidenceSource } from '../../shared/types.js';

export class VersionService {
  private ticketRepo: TicketRepository;
  private versionRepo: VersionRepository;
  private evidenceRepo: EvidenceRepository;
  private auditLogRepo: AuditLogRepository;

  constructor() {
    this.ticketRepo = new TicketRepository();
    this.versionRepo = new VersionRepository();
    this.evidenceRepo = new EvidenceRepository();
    this.auditLogRepo = new AuditLogRepository();
  }

  createVersion(params: {
    ticketId: string;
    modelVersion: string;
    summary: string;
    status: TicketStatus;
    createdBy: string;
    changeNote: string;
    evidences: Array<{
      content: string;
      source: EvidenceSource;
      isSampleLeak: boolean;
      importBatch: string;
    }>;
  }): TicketVersion {
    const { ticketId, modelVersion, summary, status, createdBy, changeNote, evidences } = params;

    const ticket = this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new Error('工单不存在');
    }

    const maxVersion = this.versionRepo.getMaxVersion(ticketId);
    const newVersionNumber = maxVersion + 1;

    const createTransaction = db.transaction(() => {
      const newVersion = this.versionRepo.create({
        ticketId,
        version: newVersionNumber,
        modelVersion,
        summary,
        status,
        createdBy,
        changeNote,
      });

      if (evidences.length > 0) {
        this.evidenceRepo.bulkCreate(
          evidences.map(e => ({
            versionId: newVersion.id,
            ticketId,
            content: e.content,
            source: e.source,
            isSampleLeak: e.isSampleLeak,
            importBatch: e.importBatch,
          }))
        );
      }

      const hasSampleLeak = evidences.some(e => e.isSampleLeak);
      const hasManualMark = evidences.some(e => e.source === 'manual');

      const versionUpdates: { latestVersion: number; currentVersion?: number } = {
        latestVersion: newVersionNumber,
      };

      if (ticket.lockedVersion === null) {
        versionUpdates.currentVersion = newVersionNumber;
      }

      this.ticketRepo.updateVersions(ticketId, versionUpdates);
      this.ticketRepo.updateFlags(ticketId, { hasSampleLeak, hasManualMark });

      const lockNote = ticket.lockedVersion !== null
        ? `（不覆盖已锁定的v${ticket.lockedVersion}版本）`
        : '';

      this.auditLogRepo.create({
        ticketId,
        version: newVersionNumber,
        action: 'create_version',
        operator: createdBy,
        detail: `创建版本v${newVersionNumber}${lockNote}：${changeNote}`,
      });

      return this.versionRepo.findById(newVersion.id)!;
    });

    return createTransaction();
  }

  lockVersion(ticketId: string, version: number, lockedBy: string): TicketVersion {
    const ticket = this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new Error('工单不存在');
    }

    if (ticket.lockedVersion !== null) {
      throw new Error('该工单已有锁定版本，请先解锁');
    }

    const ticketVersion = this.versionRepo.findByTicketAndVersion(ticketId, version);
    if (!ticketVersion) {
      throw new Error('版本不存在');
    }

    if (ticketVersion.isLocked) {
      throw new Error('该版本已锁定');
    }

    const lockTransaction = db.transaction(() => {
      this.versionRepo.updateLock(ticketVersion.id, true, lockedBy);
      this.ticketRepo.updateVersions(ticketId, {
        lockedVersion: version,
        currentVersion: version,
      });
      this.ticketRepo.updateStatus(ticketId, 'locked');

      this.auditLogRepo.create({
        ticketId,
        version,
        action: 'lock_version',
        operator: lockedBy,
        detail: `锁定版本v${version}，设为当前版本`,
      });
    });

    lockTransaction();

    return this.versionRepo.findByTicketAndVersion(ticketId, version)!;
  }

  unlockVersion(ticketId: string, unlockedBy: string): TicketVersion {
    const ticket = this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new Error('工单不存在');
    }

    if (ticket.lockedVersion === null) {
      throw new Error('该工单没有锁定版本');
    }

    const lockedVersion = ticket.lockedVersion;
    const ticketVersion = this.versionRepo.findByTicketAndVersion(ticketId, lockedVersion);
    if (!ticketVersion) {
      throw new Error('锁定版本不存在');
    }

    const unlockTransaction = db.transaction(() => {
      this.versionRepo.updateLock(ticketVersion.id, false, null);
      this.ticketRepo.updateVersions(ticketId, {
        lockedVersion: null,
        currentVersion: ticket.latestVersion,
      });

      const latestVersionData = this.versionRepo.findByTicketAndVersion(ticketId, ticket.latestVersion);
      if (latestVersionData) {
        this.ticketRepo.updateStatus(ticketId, latestVersionData.status);
      }

      this.auditLogRepo.create({
        ticketId,
        version: lockedVersion,
        action: 'unlock_version',
        operator: unlockedBy,
        detail: `解锁版本v${lockedVersion}，当前版本恢复为v${ticket.latestVersion}`,
      });
    });

    unlockTransaction();

    return this.versionRepo.findByTicketAndVersion(ticketId, ticket.latestVersion)!;
  }

  getVersion(ticketId: string, version: number): TicketVersion | null {
    return this.versionRepo.findByTicketAndVersion(ticketId, version);
  }

  getActiveVersion(ticketId: string): TicketVersion | null {
    const ticket = this.ticketRepo.findById(ticketId);
    if (!ticket) return null;

    const displayVersion = ticket.lockedVersion ?? ticket.currentVersion;
    return this.versionRepo.findByTicketAndVersion(ticketId, displayVersion);
  }

  listVersions(ticketId: string): TicketVersion[] {
    return this.versionRepo.findByTicketId(ticketId);
  }
}
