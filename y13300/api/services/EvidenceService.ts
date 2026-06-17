import { db } from '../db/database.js';
import { EvidenceRepository, TicketRepository, VersionRepository, AuditLogRepository } from '../repositories/index.js';
import type { Evidence, EvidenceSource } from '../../shared/types.js';

export class EvidenceService {
  private evidenceRepo: EvidenceRepository;
  private ticketRepo: TicketRepository;
  private versionRepo: VersionRepository;
  private auditLogRepo: AuditLogRepository;

  constructor() {
    this.evidenceRepo = new EvidenceRepository();
    this.ticketRepo = new TicketRepository();
    this.versionRepo = new VersionRepository();
    this.auditLogRepo = new AuditLogRepository();
  }

  getByVersionId(versionId: string): Evidence[] {
    return this.evidenceRepo.findByVersionId(versionId);
  }

  getByTicketId(ticketId: string): Evidence[] {
    return this.evidenceRepo.findByTicketId(ticketId);
  }

  getById(id: string): Evidence | null {
    return this.evidenceRepo.findById(id);
  }

  addEvidence(params: {
    ticketId: string;
    versionId: string;
    content: string;
    source: EvidenceSource;
    isSampleLeak: boolean;
    importBatch: string;
    operator: string;
  }): Evidence {
    const { ticketId, versionId, content, source, isSampleLeak, importBatch, operator } = params;

    const ticket = this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new Error('工单不存在');
    }

    const version = this.versionRepo.findById(versionId);
    if (!version) {
      throw new Error('版本不存在');
    }

    if (version.isLocked) {
      throw new Error('该版本已锁定，无法添加证据');
    }

    const addTransaction = db.transaction(() => {
      const evidence = this.evidenceRepo.create({
        versionId,
        ticketId,
        content,
        source,
        isSampleLeak,
        importBatch,
      });

      const allEvidences = this.evidenceRepo.findByVersionId(versionId);
      const hasSampleLeak = allEvidences.some(e => e.isSampleLeak);
      const hasManualMark = allEvidences.some(e => e.source === 'manual');

      this.ticketRepo.updateFlags(ticketId, { hasSampleLeak, hasManualMark });

      this.auditLogRepo.create({
        ticketId,
        version: version.version,
        action: 'add_evidence',
        operator,
        detail: `添加证据：${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
      });

      return evidence;
    });

    return addTransaction();
  }

  deleteEvidence(id: string, operator: string): void {
    const evidence = this.evidenceRepo.findById(id);
    if (!evidence) {
      throw new Error('证据不存在');
    }

    const version = this.versionRepo.findById(evidence.versionId);
    if (!version) {
      throw new Error('版本不存在');
    }

    if (version.isLocked) {
      throw new Error('该版本已锁定，无法删除证据');
    }

    const deleteTransaction = db.transaction(() => {
      this.evidenceRepo.delete(id);

      const remainingEvidences = this.evidenceRepo.findByVersionId(evidence.versionId);
      const hasSampleLeak = remainingEvidences.some(e => e.isSampleLeak);
      const hasManualMark = remainingEvidences.some(e => e.source === 'manual');

      this.ticketRepo.updateFlags(evidence.ticketId, { hasSampleLeak, hasManualMark });

      this.auditLogRepo.create({
        ticketId: evidence.ticketId,
        version: version.version,
        action: 'delete_evidence',
        operator,
        detail: `删除证据：${evidence.content.substring(0, 50)}${evidence.content.length > 50 ? '...' : ''}`,
      });
    });

    deleteTransaction();
  }

  bulkAdd(params: {
    ticketId: string;
    versionId: string;
    evidences: Array<{
      content: string;
      source: EvidenceSource;
      isSampleLeak: boolean;
      importBatch: string;
    }>;
    operator: string;
  }): Evidence[] {
    const { ticketId, versionId, evidences, operator } = params;

    const ticket = this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new Error('工单不存在');
    }

    const version = this.versionRepo.findById(versionId);
    if (!version) {
      throw new Error('版本不存在');
    }

    if (version.isLocked) {
      throw new Error('该版本已锁定，无法添加证据');
    }

    const bulkTransaction = db.transaction(() => {
      const createdEvidences = this.evidenceRepo.bulkCreate(
        evidences.map(e => ({
          versionId,
          ticketId,
          content: e.content,
          source: e.source,
          isSampleLeak: e.isSampleLeak,
          importBatch: e.importBatch,
        }))
      );

      const allEvidences = this.evidenceRepo.findByVersionId(versionId);
      const hasSampleLeak = allEvidences.some(e => e.isSampleLeak);
      const hasManualMark = allEvidences.some(e => e.source === 'manual');

      this.ticketRepo.updateFlags(ticketId, { hasSampleLeak, hasManualMark });

      this.auditLogRepo.create({
        ticketId,
        version: version.version,
        action: 'bulk_add_evidence',
        operator,
        detail: `批量添加 ${evidences.length} 条证据`,
      });

      return createdEvidences;
    });

    return bulkTransaction();
  }

  hasSampleLeak(versionId: string): boolean {
    return this.evidenceRepo.hasSampleLeak(versionId);
  }
}
