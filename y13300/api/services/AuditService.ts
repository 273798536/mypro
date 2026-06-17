import { AuditLogRepository, TicketRepository } from '../repositories/index.js';
import type { AuditLog } from '../../shared/types.js';

export class AuditService {
  private auditLogRepo: AuditLogRepository;
  private ticketRepo: TicketRepository;

  constructor() {
    this.auditLogRepo = new AuditLogRepository();
    this.ticketRepo = new TicketRepository();
  }

  createLog(params: {
    ticketId: string;
    version: number;
    action: string;
    operator: string;
    detail: string;
  }): AuditLog {
    const ticket = this.ticketRepo.findById(params.ticketId);
    if (!ticket) {
      throw new Error('工单不存在');
    }

    return this.auditLogRepo.create(params);
  }

  getByTicketId(ticketId: string, options?: { limit?: number }): AuditLog[] {
    const ticket = this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new Error('工单不存在');
    }

    return this.auditLogRepo.findByTicketId(ticketId, options);
  }

  getAll(options?: { limit?: number; offset?: number }): {
    logs: AuditLog[];
    total: number;
  } {
    const logs = this.auditLogRepo.findAll(options);
    const total = logs.length;
    return { logs, total };
  }

  logStatusChange(ticketId: string, version: number, oldStatus: string, newStatus: string, operator: string): AuditLog {
    return this.createLog({
      ticketId,
      version,
      action: 'status_change',
      operator,
      detail: `状态从 ${oldStatus} 变更为 ${newStatus}`,
    });
  }

  logVersionCreation(ticketId: string, version: number, operator: string, note: string): AuditLog {
    return this.createLog({
      ticketId,
      version,
      action: 'version_create',
      operator,
      detail: `创建版本v${version}：${note}`,
    });
  }

  logLock(ticketId: string, version: number, operator: string): AuditLog {
    return this.createLog({
      ticketId,
      version,
      action: 'lock',
      operator,
      detail: `锁定版本v${version}`,
    });
  }

  logUnlock(ticketId: string, version: number, operator: string): AuditLog {
    return this.createLog({
      ticketId,
      version,
      action: 'unlock',
      operator,
      detail: `解锁版本v${version}`,
    });
  }

  logEvidenceAdd(ticketId: string, version: number, operator: string, content: string): AuditLog {
    const truncated = content.length > 50 ? content.substring(0, 50) + '...' : content;
    return this.createLog({
      ticketId,
      version,
      action: 'evidence_add',
      operator,
      detail: `添加证据：${truncated}`,
    });
  }

  logEvidenceDelete(ticketId: string, version: number, operator: string, content: string): AuditLog {
    const truncated = content.length > 50 ? content.substring(0, 50) + '...' : content;
    return this.createLog({
      ticketId,
      version,
      action: 'evidence_delete',
      operator,
      detail: `删除证据：${truncated}`,
    });
  }

  logManualReview(ticketId: string, version: number, operator: string, comment: string): AuditLog {
    return this.createLog({
      ticketId,
      version,
      action: 'manual_review',
      operator,
      detail: comment,
    });
  }

  logExport(ticketId: string, version: number, operator: string): AuditLog {
    return this.createLog({
      ticketId,
      version,
      action: 'export',
      operator,
      detail: `导出版本v${version}数据`,
    });
  }
}
