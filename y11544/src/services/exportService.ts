import { createObjectCsvStringifier } from 'csv-writer';
import { Database, getDatabase } from '../database';
import { MaterialStatus, UserRole } from '../types';
import { dataMaskingService } from './dataMaskingService';

export class ExportService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  async exportToCSV(
    status?: MaterialStatus,
    role: UserRole = UserRole.AUDITOR
  ): Promise<string> {
    const materials = await this.db.all(
      status
        ? 'SELECT * FROM materials WHERE status = ? ORDER BY updatedAt DESC'
        : 'SELECT * FROM materials ORDER BY updatedAt DESC',
      status ? [status] : []
    );

    const materialIds = materials.map(m => m.materialId);

    const [allCosts, allAudits, allComments] = await Promise.all([
      this.db.all(
        `SELECT materialId, SUM(cost) as totalCost, SUM(impressions) as totalImpressions, SUM(clicks) as totalClicks
         FROM daily_costs WHERE isValid = 1 AND materialId IN (${materialIds.map(() => '?').join(',')})
         GROUP BY materialId`,
        materialIds
      ),
      this.db.all(
        `SELECT ar.* FROM audit_records ar
         INNER JOIN (
           SELECT materialId, MAX(auditedAt) as maxDate
           FROM audit_records GROUP BY materialId
         ) latest ON ar.materialId = latest.materialId AND ar.auditedAt = latest.maxDate
         WHERE ar.materialId IN (${materialIds.map(() => '?').join(',')})`,
        materialIds
      ),
      this.db.all(
        `SELECT materialId, comment, evidence, commentedBy, commentedAt
         FROM manager_comments WHERE materialId IN (${materialIds.map(() => '?').join(',')})
         ORDER BY commentedAt DESC`,
        materialIds
      )
    ]);

    const costMap = new Map(allCosts.map(c => [c.materialId, c]));
    const auditMap = new Map(allAudits.map(a => [a.materialId, a]));
    const commentsMap = new Map<string, any[]>();
    allComments.forEach(c => {
      if (!commentsMap.has(c.materialId)) {
        commentsMap.set(c.materialId, []);
      }
      commentsMap.get(c.materialId)!.push(c);
    });

    const records = materials.map(material => {
      const costs = costMap.get(material.materialId) || { totalCost: 0, totalImpressions: 0, totalClicks: 0 };
      const audit = auditMap.get(material.materialId);
      const comments = commentsMap.get(material.materialId) || [];

      return {
        materialId: material.materialId,
        name: material.name,
        platform: material.platform,
        originalName: material.originalName,
        status: material.status,
        createdBy: material.createdBy,
        createdAt: material.createdAt,
        updatedAt: material.updatedAt,
        totalCost: costs.totalCost,
        totalImpressions: costs.totalImpressions,
        totalClicks: costs.totalClicks,
        ctr: costs.totalImpressions > 0 ? (costs.totalClicks / costs.totalImpressions * 100).toFixed(2) + '%' : '0%',
        cpc: costs.totalClicks > 0 ? (costs.totalCost / costs.totalClicks).toFixed(2) : '0',
        auditResult: audit?.auditResult || '',
        auditComment: audit?.auditComment || '',
        managerCommentCount: comments.length,
        latestComment: comments[0]?.comment || '',
        version: material.version
      };
    });

    const maskedRecords = records.map(r => dataMaskingService.maskExportData(r, role));

    const csvStringifier = createObjectCsvStringifier({
      header: Object.keys(maskedRecords[0] || {}).map(key => ({ id: key, title: key }))
    });

    return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(maskedRecords);
  }

  async exportMaterialDetail(materialId: string, role: UserRole): Promise<string> {
    const material = await this.db.get('SELECT * FROM materials WHERE materialId = ?', [materialId]);
    if (!material) {
      throw new Error(`Material ${materialId} not found`);
    }

    const [costs, audits, comments, statusLogs] = await Promise.all([
      this.db.all('SELECT * FROM daily_costs WHERE materialId = ? AND isValid = 1 ORDER BY date', [materialId]),
      this.db.all('SELECT * FROM audit_records WHERE materialId = ? ORDER BY auditedAt', [materialId]),
      this.db.all('SELECT * FROM manager_comments WHERE materialId = ? ORDER BY commentedAt', [materialId]),
      this.db.all('SELECT * FROM status_change_logs WHERE materialId = ? ORDER BY changedAt', [materialId])
    ]);

    const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);
    const totalImpressions = costs.reduce((sum, c) => sum + c.impressions, 0);
    const totalClicks = costs.reduce((sum, c) => sum + c.clicks, 0);

    const summary = {
      materialId: material.materialId,
      name: material.name,
      platform: material.platform,
      originalName: material.originalName,
      currentStatus: material.status,
      createdBy: material.createdBy,
      createdAt: material.createdAt,
      totalCost,
      totalImpressions,
      totalClicks,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) + '%' : '0%',
      cpc: totalClicks > 0 ? (totalCost / totalClicks).toFixed(2) : '0',
      auditCount: audits.length,
      commentCount: comments.length,
      statusChangeCount: statusLogs.length,
      version: material.version
    };

    const maskedSummary = dataMaskingService.maskExportData(summary, role);
    const maskedCosts = costs.map(c => dataMaskingService.maskExportData(c, role));
    const maskedAudits = audits.map(a => dataMaskingService.maskExportData(a, role));
    const maskedComments = comments.map(c => dataMaskingService.maskExportData(c, role));
    const maskedLogs = statusLogs.map(l => dataMaskingService.maskExportData(l, role));

    let csvContent = '';

    csvContent += '=== 素材概要 ===\n';
    const summaryStringifier = createObjectCsvStringifier({
      header: Object.keys(maskedSummary).map(key => ({ id: key, title: key }))
    });
    csvContent += summaryStringifier.getHeaderString() + summaryStringifier.stringifyRecords([maskedSummary]);

    csvContent += '\n=== 花费明细 ===\n';
    const costStringifier = createObjectCsvStringifier({
      header: ['date', 'cost', 'impressions', 'clicks'].map(key => ({ id: key, title: key }))
    });
    csvContent += costStringifier.getHeaderString() + costStringifier.stringifyRecords(maskedCosts);

    csvContent += '\n=== 审核记录 ===\n';
    const auditStringifier = createObjectCsvStringifier({
      header: ['auditedAt', 'auditResult', 'auditComment', 'auditedBy'].map(key => ({ id: key, title: key }))
    });
    csvContent += auditStringifier.getHeaderString() + auditStringifier.stringifyRecords(maskedAudits);

    csvContent += '\n=== 主管批注 ===\n';
    const commentStringifier = createObjectCsvStringifier({
      header: ['commentedAt', 'comment', 'evidence', 'commentedBy'].map(key => ({ id: key, title: key }))
    });
    csvContent += commentStringifier.getHeaderString() + commentStringifier.stringifyRecords(maskedComments);

    csvContent += '\n=== 状态变更历史 ===\n';
    const logStringifier = createObjectCsvStringifier({
      header: ['changedAt', 'fromStatus', 'toStatus', 'changedBy', 'reason'].map(key => ({ id: key, title: key }))
    });
    csvContent += logStringifier.getHeaderString() + logStringifier.stringifyRecords(maskedLogs);

    return csvContent;
  }
}

export const exportService = new ExportService();
