import { v4 as uuidv4 } from 'uuid';
import { Database, getDatabase } from '../database';
import {
  Material,
  MaterialStatus,
  StatusChangeLog,
  CreateMaterialRequest,
  StatusChangeRequest,
  AuditRecord,
  DailyCost,
  ManagerComment,
  FailedRecord,
} from '../types';
import { stateMachine } from './stateMachine';

export class MaterialService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  async createMaterial(request: CreateMaterialRequest, role: string = 'operator'): Promise<Material> {
    const now = new Date().toISOString();
    const id = uuidv4();

    stateMachine.validateTransition(null, MaterialStatus.DRAFT, role);

    const existing = await this.db.get(
      'SELECT * FROM materials WHERE materialId = ?',
      [request.materialId]
    );
    if (existing) {
      throw new Error(`Material with ID ${request.materialId} already exists`);
    }

    await this.db.run(
      `INSERT INTO materials (id, materialId, name, platform, originalName, status, createdBy, createdAt, updatedAt, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, request.materialId, request.name, request.platform, request.originalName,
       MaterialStatus.DRAFT, request.createdBy, now, now]
    );

    await this.db.run(
      `INSERT INTO status_change_logs (id, materialId, fromStatus, toStatus, changedBy, changedAt, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), request.materialId, null, MaterialStatus.DRAFT, request.createdBy, now, '创建素材']
    );

    return this.getMaterial(request.materialId) as Promise<Material>;
  }

  async getMaterial(materialId: string): Promise<Material | undefined> {
    return this.db.get<Material>(
      'SELECT * FROM materials WHERE materialId = ?',
      [materialId]
    );
  }

  async getMaterialDetail(materialId: string): Promise<any> {
    const material = await this.getMaterial(materialId);
    if (!material) return undefined;

    const [auditRecords, dailyCosts, managerComments, statusLogs] = await Promise.all([
      this.db.get<AuditRecord>(
        'SELECT * FROM audit_records WHERE materialId = ? ORDER BY auditedAt DESC LIMIT 1',
        [materialId]
      ),
      this.db.all<DailyCost>(
        'SELECT * FROM daily_costs WHERE materialId = ? AND isValid = 1 ORDER BY date DESC',
        [materialId]
      ),
      this.db.all<ManagerComment>(
        'SELECT * FROM manager_comments WHERE materialId = ? ORDER BY commentedAt DESC',
        [materialId]
      ),
      this.db.all<StatusChangeLog>(
        'SELECT * FROM status_change_logs WHERE materialId = ? ORDER BY changedAt ASC',
        [materialId]
      ),
    ]);

    const totalCost = dailyCosts.reduce((sum, c) => sum + c.cost, 0);
    const totalImpressions = dailyCosts.reduce((sum, c) => sum + c.impressions, 0);
    const totalClicks = dailyCosts.reduce((sum, c) => sum + c.clicks, 0);

    return {
      ...material,
      latestAudit: auditRecords,
      dailyCosts,
      managerComments,
      statusHistory: statusLogs,
      summary: {
        totalCost,
        totalImpressions,
        totalClicks,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) + '%' : '0%',
        cpc: totalClicks > 0 ? (totalCost / totalClicks).toFixed(2) : '0',
      }
    };
  }

  async changeStatus(request: StatusChangeRequest, role: string = 'operator'): Promise<Material> {
    const material = await this.getMaterial(request.materialId);
    if (!material) {
      throw new Error(`Material ${request.materialId} not found`);
    }

    if (material.status === request.toStatus) {
      return material;
    }

    stateMachine.validateTransition(material.status, request.toStatus, role);

    const now = new Date().toISOString();

    await this.db.beginTransaction();
    try {
      await this.db.run(
        `UPDATE materials SET status = ?, updatedAt = ?, version = version + 1 WHERE materialId = ?`,
        [request.toStatus, now, request.materialId]
      );

      await this.db.run(
        `INSERT INTO status_change_logs (id, materialId, fromStatus, toStatus, changedBy, changedAt, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), request.materialId, material.status, request.toStatus, request.changedBy, now, request.reason]
      );

      await this.db.commit();
    } catch (error) {
      await this.db.rollback();
      throw error;
    }

    return this.getMaterial(request.materialId) as Promise<Material>;
  }

  async submitForReview(materialId: string, submittedBy: string): Promise<Material> {
    return this.changeStatus({
      materialId,
      toStatus: MaterialStatus.SUBMITTED,
      changedBy: submittedBy,
      reason: '提交审核'
    }, 'operator');
  }

  async rejectMaterial(materialId: string, rejectedBy: string, reason: string): Promise<Material> {
    return this.changeStatus({
      materialId,
      toStatus: MaterialStatus.REJECTED,
      changedBy: rejectedBy,
      reason
    }, 'reviewer');
  }

  async secondaryConfirm(materialId: string, confirmedBy: string): Promise<Material> {
    return this.changeStatus({
      materialId,
      toStatus: MaterialStatus.SECONDARY_CONFIRMED,
      changedBy: confirmedBy,
      reason: '二次审核通过'
    }, 'reviewer');
  }

  async listMaterials(status?: MaterialStatus, page: number = 1, pageSize: number = 20): Promise<{
    items: Material[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    let sql = 'SELECT * FROM materials';
    let countSql = 'SELECT COUNT(*) as count FROM materials';
    const params: any[] = [];

    if (status) {
      sql += ' WHERE status = ?';
      countSql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY updatedAt DESC LIMIT ? OFFSET ?';
    params.push(pageSize, (page - 1) * pageSize);

    const [items, countResult] = await Promise.all([
      this.db.all<Material>(sql, params),
      this.db.get<{ count: number }>(countSql, status ? [status] : [])
    ]);

    return {
      items,
      total: countResult?.count || 0,
      page,
      pageSize
    };
  }

  async getStatusHistory(materialId: string): Promise<StatusChangeLog[]> {
    return this.db.all<StatusChangeLog>(
      'SELECT * FROM status_change_logs WHERE materialId = ? ORDER BY changedAt ASC',
      [materialId]
    );
  }
}

export const materialService = new MaterialService();
