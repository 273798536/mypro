import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { Batch, Material, AuditResult, CostDaily } from '../entities';
import { AppDataSource } from '../database/data-source';
import { auditLogService } from './AuditLogService';
import { batchService } from './BatchService';

export interface ReplayDiff {
  field: string;
  oldValue: any;
  newValue: any;
  changedAt: Date;
  operator?: string;
}

export interface AnomalyRecord {
  type: 'status_jump' | 'cost_inconsistency' | 'duplicate_material' | 'manual_override' | 'freeze_violation';
  batchId: string;
  materialId?: string;
  description: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
}

export class ExportService {
  private batchRepo = AppDataSource.getRepository(Batch);
  private materialRepo = AppDataSource.getRepository(Material);
  private auditRepo = AppDataSource.getRepository(AuditResult);
  private costRepo = AppDataSource.getRepository(CostDaily);

  private ensureExportDir(): string {
    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    return exportDir;
  }

  async exportBatchToCsv(batchId: string, operator?: string): Promise<string> {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId },
      relations: ['materials']
    });

    if (!batch) {
      throw new Error('批次不存在');
    }

    if (!batch.frozen) {
      throw new Error('导出前必须先冻结批次');
    }

    const exportDir = this.ensureExportDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `batch_${batch.batchNo}_${timestamp}.csv`;
    const filepath = path.join(exportDir, filename);

    const materials = await this.materialRepo.find({
      where: { batchId },
      relations: ['auditResults', 'costDailies']
    });

    const records = [];
    for (const material of materials) {
      const latestAudit = material.auditResults.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      
      const totalCost = material.costDailies.reduce(
        (sum, c) => sum + Number(c.cost), 0
      );

      records.push({
        batchNo: batch.batchNo,
        materialId: material.materialId,
        materialName: material.name,
        platform: material.platform,
        status: material.status,
        auditStatus: latestAudit?.status || 'pending',
        auditReason: latestAudit?.reason || '',
        isManual: latestAudit?.isManual || false,
        totalCost: totalCost.toFixed(2),
        isDuplicate: material.isDuplicate,
        submittedAt: material.submittedAt?.toISOString() || '',
        completedAt: material.completedAt?.toISOString() || ''
      });
    }

    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: [
        { id: 'batchNo', title: '批次号' },
        { id: 'materialId', title: '素材ID' },
        { id: 'materialName', title: '素材名称' },
        { id: 'platform', title: '投放平台' },
        { id: 'status', title: '处理状态' },
        { id: 'auditStatus', title: '审核结果' },
        { id: 'auditReason', title: '审核原因' },
        { id: 'isManual', title: '人工改判' },
        { id: 'totalCost', title: '总花费' },
        { id: 'isDuplicate', title: '是否重复' },
        { id: 'submittedAt', title: '提交时间' },
        { id: 'completedAt', title: '完成时间' }
      ]
    });

    await csvWriter.writeRecords(records);

    await auditLogService.log('exported', {
      batchId,
      operator,
      newValue: filepath
    });

    return filepath;
  }

  async exportHistoryDiff(batchId: string): Promise<string> {
    const history = await auditLogService.getBatchHistory(batchId);
    const batch = await this.batchRepo.findOne({ where: { id: batchId } });

    if (!batch) {
      throw new Error('批次不存在');
    }

    const exportDir = this.ensureExportDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `history_${batch.batchNo}_${timestamp}.csv`;
    const filepath = path.join(exportDir, filename);

    const records = history.map(log => ({
      timestamp: log.createdAt.toISOString(),
      action: log.action,
      materialId: log.materialId || '',
      fieldName: log.fieldName || '',
      oldValue: log.oldValue || '',
      newValue: log.newValue || '',
      diff: log.diff || '',
      operator: log.operator || '',
      reason: log.reason || ''
    }));

    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: [
        { id: 'timestamp', title: '时间' },
        { id: 'action', title: '操作' },
        { id: 'materialId', title: '素材ID' },
        { id: 'fieldName', title: '字段' },
        { id: 'oldValue', title: '原值' },
        { id: 'newValue', title: '新值' },
        { id: 'diff', title: '差异' },
        { id: 'operator', title: '操作人' },
        { id: 'reason', title: '原因' }
      ]
    });

    await csvWriter.writeRecords(records);
    return filepath;
  }

  async replayMaterialChanges(materialId: string, batchId?: string): Promise<ReplayDiff[]> {
    const history = await auditLogService.getMaterialHistory(materialId);
    const filtered = batchId 
      ? history.filter(h => h.batchId === batchId)
      : history;

    return filtered
      .filter(h => h.fieldName)
      .map(h => ({
        field: h.fieldName!,
        oldValue: h.oldValue,
        newValue: h.newValue,
        changedAt: h.createdAt,
        operator: h.operator
      }));
  }

  async detectAnomalies(batchId: string): Promise<AnomalyRecord[]> {
    const anomalies: AnomalyRecord[] = [];
    const batch = await this.batchRepo.findOne({ 
      where: { id: batchId },
      relations: ['materials']
    });

    if (!batch) {
      throw new Error('批次不存在');
    }

    for (const material of batch.materials) {
      const audits = await this.auditRepo.find({
        where: { materialRecordId: material.id },
        order: { createdAt: 'ASC' }
      });

      for (let i = 1; i < audits.length; i++) {
        const prev = audits[i - 1];
        const curr = audits[i];
        
        if (prev.status === 'approved' && curr.status === 'rejected') {
          anomalies.push({
            type: 'status_jump',
            batchId,
            materialId: material.materialId,
            description: `审核状态从通过直接变为拒绝: ${prev.status} → ${curr.status}`,
            timestamp: curr.createdAt,
            severity: 'high'
          });
        }

        if (curr.isManual) {
          anomalies.push({
            type: 'manual_override',
            batchId,
            materialId: material.materialId,
            description: `人工改判: ${prev.status} → ${curr.status}, 原因: ${curr.reason}`,
            timestamp: curr.createdAt,
            severity: 'medium'
          });
        }
      }

      if (material.isDuplicate) {
        anomalies.push({
          type: 'duplicate_material',
          batchId,
          materialId: material.materialId,
          description: `重复素材记录: ${material.name}`,
          timestamp: material.createdAt,
          severity: 'low'
        });
      }
    }

    if (batch.status !== 'frozen') {
      anomalies.push({
        type: 'freeze_violation',
        batchId,
        description: '批次未冻结，无法进行最终导出和对账',
        timestamp: new Date(),
        severity: 'medium'
      });
    }

    return anomalies;
  }

  async getReconciliationReport(batchId: string): Promise<any> {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId },
      relations: ['materials']
    });

    if (!batch) {
      throw new Error('批次不存在');
    }

    const materials = await this.materialRepo.find({
      where: { batchId },
      relations: ['auditResults', 'costDailies', 'mappings']
    });

    const totalCost = materials.reduce((sum, m) => {
      return sum + m.costDailies.reduce((s, c) => s + Number(c.cost), 0);
    }, 0);

    const approvedCount = materials.filter(m => 
      m.status === 'approved' || m.status === 'manual_override'
    ).length;

    const rejectedCount = materials.filter(m => 
      m.status === 'rejected' || m.status === 'failed'
    ).length;

    const platformStats: Record<string, { count: number; cost: number }> = {};
    for (const m of materials) {
      const platform = m.platform || 'unknown';
      if (!platformStats[platform]) {
        platformStats[platform] = { count: 0, cost: 0 };
      }
      platformStats[platform].count++;
      platformStats[platform].cost += m.costDailies.reduce((s, c) => s + Number(c.cost), 0);
    }

    return {
      batchNo: batch.batchNo,
      batchName: batch.name,
      status: batch.status,
      frozen: batch.frozen,
      totalMaterials: materials.length,
      approvedCount,
      rejectedCount,
      pendingCount: materials.length - approvedCount - rejectedCount,
      totalCost: totalCost.toFixed(2),
      platformBreakdown: platformStats,
      anomalies: await this.detectAnomalies(batchId),
      lastUpdated: batch.updatedAt
    };
  }
}

export const exportService = new ExportService();
