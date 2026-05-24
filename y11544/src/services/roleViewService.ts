import { Database, getDatabase } from '../database';
import { UserRole, MaterialStatus } from '../types';
import { dataMaskingService } from './dataMaskingService';

export class RoleViewService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  async getRoleDashboard(role: UserRole): Promise<any> {
    const baseStats = await this.getBaseStats();

    switch (role) {
      case UserRole.OPERATOR:
        return this.getOperatorView(baseStats);
      case UserRole.REVIEWER:
        return this.getReviewerView(baseStats);
      case UserRole.MANAGER:
        return this.getManagerView(baseStats);
      case UserRole.AUDITOR:
        return this.getAuditorView(baseStats);
      case UserRole.ADMIN:
        return this.getAdminView(baseStats);
      default:
        return baseStats;
    }
  }

  private async getBaseStats(): Promise<any> {
    const [statusStats, recentChanges, failedStats] = await Promise.all([
      this.db.all(
        'SELECT status, COUNT(*) as count FROM materials GROUP BY status'
      ),
      this.db.all(
        `SELECT l.*, m.name as materialName
         FROM status_change_logs l
         INNER JOIN materials m ON l.materialId = m.materialId
         ORDER BY l.changedAt DESC LIMIT 10`
      ),
      this.db.get(
        'SELECT COUNT(*) as count FROM failed_records WHERE failedAt >= ?',
        [new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()]
      )
    ]);

    const statusMap: Record<string, number> = {};
    statusStats.forEach(s => {
      statusMap[s.status] = s.count;
    });

    return {
      totalMaterials: statusStats.reduce((sum, s) => sum + s.count, 0),
      byStatus: statusMap,
      recentChanges,
      failedRecords24h: failedStats?.count || 0
    };
  }

  private getOperatorView(baseStats: any): any {
    return {
      role: UserRole.OPERATOR,
      focus: 'My Drafts & Submissions',
      totalMaterials: baseStats.totalMaterials,
      draftCount: baseStats.byStatus[MaterialStatus.DRAFT] || 0,
      submittedCount: baseStats.byStatus[MaterialStatus.SUBMITTED] || 0,
      rejectedCount: baseStats.byStatus[MaterialStatus.REJECTED] || 0,
      recentChanges: baseStats.recentChanges.map((c: any) =>
        dataMaskingService.maskMaterialDetail(c, UserRole.OPERATOR)
      ),
      actions: ['Create Draft', 'Edit Draft', 'Submit for Review', 'Resubmit Rejected']
    };
  }

  private getReviewerView(baseStats: any): any {
    return {
      role: UserRole.REVIEWER,
      focus: 'Pending Reviews',
      totalMaterials: baseStats.totalMaterials,
      pendingReview: baseStats.byStatus[MaterialStatus.SUBMITTED] || 0,
      secondaryConfirmed: baseStats.byStatus[MaterialStatus.SECONDARY_CONFIRMED] || 0,
      recentChanges: baseStats.recentChanges,
      actions: ['Review Submissions', 'Approve/Reject', 'Add Comments']
    };
  }

  private getManagerView(baseStats: any): any {
    return {
      role: UserRole.MANAGER,
      focus: 'Team Overview & Quality Control',
      totalMaterials: baseStats.totalMaterials,
      byStatus: baseStats.byStatus,
      failedRecords24h: baseStats.failedRecords24h,
      recentChanges: baseStats.recentChanges,
      actions: ['View All Materials', 'Add Manager Comments', 'Review Audit Trails']
    };
  }

  private getAuditorView(baseStats: any): any {
    return {
      role: UserRole.AUDITOR,
      focus: 'Compliance & Audit Trail',
      totalMaterials: baseStats.totalMaterials,
      auditOnlyCount: baseStats.byStatus[MaterialStatus.AUDIT_ONLY] || 0,
      exportedCount: baseStats.byStatus[MaterialStatus.EXPORTED] || 0,
      recentChanges: baseStats.recentChanges,
      actions: ['View Audit Trails', 'Export Reports', 'Verify Data Integrity']
    };
  }

  private getAdminView(baseStats: any): any {
    return {
      role: UserRole.ADMIN,
      focus: 'Full System Control',
      totalMaterials: baseStats.totalMaterials,
      byStatus: baseStats.byStatus,
      failedRecords24h: baseStats.failedRecords24h,
      recentChanges: baseStats.recentChanges,
      actions: ['Full CRUD Access', 'Manage Users', 'System Configuration', 'All Export Options']
    };
  }

  async getMaterialForRole(materialId: string, role: UserRole): Promise<any> {
    const material = await this.db.get(
      'SELECT * FROM materials WHERE materialId = ?',
      [materialId]
    );

    if (!material) return undefined;

    const [auditRecords, dailyCosts, managerComments, statusLogs] = await Promise.all([
      this.db.all(
        'SELECT * FROM audit_records WHERE materialId = ? ORDER BY auditedAt DESC',
        [materialId]
      ),
      this.db.all(
        'SELECT * FROM daily_costs WHERE materialId = ? AND isValid = 1 ORDER BY date DESC',
        [materialId]
      ),
      this.db.all(
        'SELECT * FROM manager_comments WHERE materialId = ? ORDER BY commentedAt DESC',
        [materialId]
      ),
      this.db.all(
        'SELECT * FROM status_change_logs WHERE materialId = ? ORDER BY changedAt ASC',
        [materialId]
      ),
    ]);

    const totalCost = dailyCosts.reduce((sum, c) => sum + c.cost, 0);
    const totalImpressions = dailyCosts.reduce((sum, c) => sum + c.impressions, 0);
    const totalClicks = dailyCosts.reduce((sum, c) => sum + c.clicks, 0);

    const result = {
      ...dataMaskingService.maskMaterialDetail(material, role),
      auditRecords: auditRecords.map(a => dataMaskingService.maskMaterialDetail(a, role)),
      dailyCosts: dailyCosts.map(c => dataMaskingService.maskMaterialDetail(c, role)),
      managerComments: managerComments.map(c => dataMaskingService.maskMaterialDetail(c, role)),
      statusHistory: statusLogs.map(l => dataMaskingService.maskMaterialDetail(l, role)),
      summary: {
        totalCost,
        totalImpressions,
        totalClicks,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) + '%' : '0%',
        cpc: totalClicks > 0 ? (totalCost / totalClicks).toFixed(2) : '0',
      }
    };

    return result;
  }
}

export const roleViewService = new RoleViewService();
