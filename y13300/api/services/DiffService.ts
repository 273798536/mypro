import { VersionRepository } from '../repositories/index.js';
import type { Evidence, DiffResult } from '../../shared/types.js';

export class DiffService {
  private versionRepo: VersionRepository;

  constructor() {
    this.versionRepo = new VersionRepository();
  }

  compareVersions(ticketId: string, versionA: number, versionB: number): DiffResult {
    const vA = this.versionRepo.findByTicketAndVersion(ticketId, versionA);
    const vB = this.versionRepo.findByTicketAndVersion(ticketId, versionB);

    if (!vA || !vB) {
      throw new Error('指定的版本不存在');
    }

    return this.compareEvidences(vA.evidences, vB.evidences);
  }

  compareWithActiveVersion(ticketId: string, targetVersion: number): DiffResult {
    const activeVersion = this.versionRepo.findByTicketId(ticketId)[0];
    if (!activeVersion) {
      throw new Error('工单没有版本记录');
    }

    const target = this.versionRepo.findByTicketAndVersion(ticketId, targetVersion);
    if (!target) {
      throw new Error('目标版本不存在');
    }

    return this.compareEvidences(activeVersion.evidences, target.evidences);
  }

  private compareEvidences(oldEvidences: Evidence[], newEvidences: Evidence[]): DiffResult {
    const oldMap = new Map(oldEvidences.map(e => [e.content, e]));
    const newMap = new Map(newEvidences.map(e => [e.content, e]));

    const added: Evidence[] = [];
    const removed: Evidence[] = [];
    const modified: Evidence[] = [];
    const unchanged: Evidence[] = [];

    for (const newEvidence of newEvidences) {
      const oldEvidence = oldMap.get(newEvidence.content);
      if (!oldEvidence) {
        added.push(newEvidence);
      } else if (this.isEvidenceModified(oldEvidence, newEvidence)) {
        modified.push(newEvidence);
      } else {
        unchanged.push(newEvidence);
      }
    }

    for (const oldEvidence of oldEvidences) {
      if (!newMap.has(oldEvidence.content)) {
        removed.push(oldEvidence);
      }
    }

    return {
      added,
      removed,
      modified,
      unchanged,
      summary: {
        addedCount: added.length,
        removedCount: removed.length,
        modifiedCount: modified.length,
        unchangedCount: unchanged.length,
      },
    };
  }

  private isEvidenceModified(oldEvidence: Evidence, newEvidence: Evidence): boolean {
    return (
      oldEvidence.source !== newEvidence.source ||
      oldEvidence.isSampleLeak !== newEvidence.isSampleLeak ||
      oldEvidence.importBatch !== newEvidence.importBatch
    );
  }

  compareWithPrevious(ticketId: string, version: number): DiffResult {
    if (version <= 1) {
      throw new Error('没有更早的版本可供比较');
    }

    return this.compareVersions(ticketId, version - 1, version);
  }

  compareWithLatest(ticketId: string, version: number): DiffResult {
    const versions = this.versionRepo.findByTicketId(ticketId);
    if (versions.length === 0) {
      throw new Error('工单没有版本记录');
    }

    const latestVersion = versions[0].version;
    if (version === latestVersion) {
      return {
        added: [],
        removed: [],
        modified: [],
        unchanged: versions[0].evidences,
        summary: {
          addedCount: 0,
          removedCount: 0,
          modifiedCount: 0,
          unchangedCount: versions[0].evidences.length,
        },
      };
    }

    return this.compareVersions(ticketId, version, latestVersion);
  }
}
