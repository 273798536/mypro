import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from '../entities';
import { AppDataSource } from '../database/data-source';

export class AuditLogService {
  private repository: Repository<AuditLog>;

  constructor() {
    this.repository = AppDataSource.getRepository(AuditLog);
  }

  async log(
    action: AuditAction,
    options: {
      batchId?: string;
      materialId?: string;
      fieldName?: string;
      oldValue?: any;
      newValue?: any;
      operator?: string;
      reason?: string;
    } = {}
  ): Promise<AuditLog> {
    const log = new AuditLog();
    log.action = action;
    log.batchId = options.batchId || null;
    log.materialId = options.materialId || null;
    log.fieldName = options.fieldName || null;
    log.oldValue = options.oldValue !== undefined ? String(options.oldValue) : null;
    log.newValue = options.newValue !== undefined ? String(options.newValue) : null;
    log.diff = this.generateDiff(options.oldValue, options.newValue);
    log.operator = options.operator || null;
    log.reason = options.reason || null;

    return await this.repository.save(log);
  }

  private generateDiff(oldValue: any, newValue: any): string | null {
    if (oldValue === undefined && newValue === undefined) return null;
    if (oldValue === newValue) return null;

    const oldStr = oldValue !== undefined ? String(oldValue) : '(空)';
    const newStr = newValue !== undefined ? String(newValue) : '(空)';
    
    return `${oldStr} → ${newStr}`;
  }

  async getBatchHistory(batchId: string): Promise<AuditLog[]> {
    return await this.repository.find({
      where: { batchId },
      order: { createdAt: 'DESC' }
    });
  }

  async getMaterialHistory(materialId: string): Promise<AuditLog[]> {
    return await this.repository.find({
      where: { materialId },
      order: { createdAt: 'DESC' }
    });
  }

  async getChangeDiff(batchId: string, fieldName?: string): Promise<AuditLog[]> {
    const where: any = { batchId };
    if (fieldName) where.fieldName = fieldName;
    
    return await this.repository.find({
      where,
      order: { createdAt: 'DESC' }
    });
  }
}

export const auditLogService = new AuditLogService();
