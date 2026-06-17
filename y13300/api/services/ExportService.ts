import { TicketRepository, VersionRepository, EvidenceRepository, AuditLogRepository } from '../repositories/index.js';
import type { TicketVersion, TicketStatus } from '../../shared/types.js';
import { STATUS_LABELS, SOURCE_LABELS } from '../../shared/types.js';

export interface ExportVersionData {
  version: number;
  modelVersion: string;
  summary: string;
  status: TicketStatus;
  statusLabel: string;
  isLocked: boolean;
  lockedBy: string | null;
  lockedAt: string | null;
  createdBy: string;
  changeNote: string;
  createdAt: string;
  evidences: Array<{
    content: string;
    source: string;
    sourceLabel: string;
    isSampleLeak: boolean;
    importBatch: string;
    createdAt: string;
  }>;
}

export interface ExportChangeHistory {
  version: number;
  action: string;
  operator: string;
  detail: string;
  timestamp: string;
}

export interface ExportData {
  ticket: {
    id: string;
    ticketNo: string;
    customerIssue: string;
    customerName: string;
    status: TicketStatus;
    statusLabel: string;
    currentVersion: number;
    latestVersion: number;
    lockedVersion: number | null;
    hasSampleLeak: boolean;
    hasManualMark: boolean;
    createdAt: string;
    updatedAt: string;
  };
  activeVersion: ExportVersionData;
  allVersions: ExportVersionData[];
  changeHistory: ExportChangeHistory[];
  summary: {
    totalVersions: number;
    totalEvidences: number;
    totalChanges: number;
    sampleLeakCount: number;
    manualMarkCount: number;
  };
  exportedAt: string;
}

export class ExportService {
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

  generateExport(ticketId: string, operator: string): ExportData {
    const ticket = this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new Error('工单不存在');
    }

    const displayVersion = ticket.lockedVersion ?? ticket.currentVersion;
    const allVersions = this.versionRepo.findByTicketId(ticketId);
    const activeVersion = allVersions.find(v => v.version === displayVersion);

    if (!activeVersion) {
      throw new Error('活跃版本不存在');
    }

    const auditLogs = this.auditLogRepo.findByTicketId(ticketId);
    const allEvidences = this.evidenceRepo.findByTicketId(ticketId);

    const exportData: ExportData = {
      ticket: {
        id: ticket.id,
        ticketNo: ticket.ticketNo,
        customerIssue: ticket.customerIssue,
        customerName: ticket.customerName,
        status: ticket.status,
        statusLabel: STATUS_LABELS[ticket.status],
        currentVersion: ticket.currentVersion,
        latestVersion: ticket.latestVersion,
        lockedVersion: ticket.lockedVersion,
        hasSampleLeak: ticket.hasSampleLeak,
        hasManualMark: ticket.hasManualMark,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      },
      activeVersion: this.mapVersionForExport(activeVersion, ticket.status),
      allVersions: allVersions.map(v => this.mapVersionForExport(v, ticket.status)),
      changeHistory: auditLogs.map(log => ({
        version: log.version,
        action: log.action,
        operator: log.operator,
        detail: log.detail,
        timestamp: log.createdAt,
      })),
      summary: {
        totalVersions: allVersions.length,
        totalEvidences: allEvidences.length,
        totalChanges: auditLogs.length,
        sampleLeakCount: allEvidences.filter(e => e.isSampleLeak).length,
        manualMarkCount: allEvidences.filter(e => e.source === 'manual').length,
      },
      exportedAt: new Date().toISOString(),
    };

    this.auditLogRepo.create({
      ticketId,
      version: displayVersion,
      action: 'export',
      operator,
      detail: `导出工单完整数据，包含 ${allVersions.length} 个版本，${allEvidences.length} 条证据`,
    });

    return exportData;
  }

  generateVersionExport(ticketId: string, version: number, operator: string): ExportData {
    const ticket = this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new Error('工单不存在');
    }

    const targetVersion = this.versionRepo.findByTicketAndVersion(ticketId, version);
    if (!targetVersion) {
      throw new Error('指定版本不存在');
    }

    const allVersions = this.versionRepo.findByTicketId(ticketId);
    const auditLogs = this.auditLogRepo.findByTicketId(ticketId);
    const allEvidences = this.evidenceRepo.findByTicketId(ticketId);

    const exportData: ExportData = {
      ticket: {
        id: ticket.id,
        ticketNo: ticket.ticketNo,
        customerIssue: ticket.customerIssue,
        customerName: ticket.customerName,
        status: ticket.status,
        statusLabel: STATUS_LABELS[ticket.status],
        currentVersion: ticket.currentVersion,
        latestVersion: ticket.latestVersion,
        lockedVersion: ticket.lockedVersion,
        hasSampleLeak: ticket.hasSampleLeak,
        hasManualMark: ticket.hasManualMark,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      },
      activeVersion: this.mapVersionForExport(targetVersion, ticket.status),
      allVersions: allVersions.map(v => this.mapVersionForExport(v, ticket.status)),
      changeHistory: auditLogs.map(log => ({
        version: log.version,
        action: log.action,
        operator: log.operator,
        detail: log.detail,
        timestamp: log.createdAt,
      })),
      summary: {
        totalVersions: allVersions.length,
        totalEvidences: allEvidences.length,
        totalChanges: auditLogs.length,
        sampleLeakCount: allEvidences.filter(e => e.isSampleLeak).length,
        manualMarkCount: allEvidences.filter(e => e.source === 'manual').length,
      },
      exportedAt: new Date().toISOString(),
    };

    this.auditLogRepo.create({
      ticketId,
      version,
      action: 'export_version',
      operator,
      detail: `导出版本v${version}数据`,
    });

    return exportData;
  }

  private mapVersionForExport(version: TicketVersion, ticketStatus: TicketStatus): ExportVersionData {
    const displayStatus = version.isLocked ? 'locked' as TicketStatus : ticketStatus;

    return {
      version: version.version,
      modelVersion: version.modelVersion,
      summary: version.summary,
      status: displayStatus,
      statusLabel: STATUS_LABELS[displayStatus],
      isLocked: version.isLocked,
      lockedBy: version.lockedBy,
      lockedAt: version.lockedAt,
      createdBy: version.createdBy,
      changeNote: version.changeNote,
      createdAt: version.createdAt,
      evidences: version.evidences.map(e => ({
        content: e.content,
        source: e.source,
        sourceLabel: SOURCE_LABELS[e.source],
        isSampleLeak: e.isSampleLeak,
        importBatch: e.importBatch,
        createdAt: e.createdAt,
      })),
    };
  }

  generateSimpleExport(ticketId: string): {
    ticketNo: string;
    customerName: string;
    customerIssue: string;
    status: string;
    currentVersion: number;
    locked: boolean;
    summary: string;
    evidences: string[];
  } {
    const ticket = this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new Error('工单不存在');
    }

    const displayVersion = ticket.lockedVersion ?? ticket.currentVersion;
    const activeVersion = this.versionRepo.findByTicketAndVersion(ticketId, displayVersion);

    if (!activeVersion) {
      throw new Error('活跃版本不存在');
    }

    return {
      ticketNo: ticket.ticketNo,
      customerName: ticket.customerName,
      customerIssue: ticket.customerIssue,
      status: STATUS_LABELS[ticket.status],
      currentVersion: displayVersion,
      locked: ticket.lockedVersion !== null,
      summary: activeVersion.summary,
      evidences: activeVersion.evidences.map(e => e.content),
    };
  }
}
