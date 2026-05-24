import * as fs from 'fs';
import * as path from 'path';
import { HistoryRecord, EntityType, ConsistencyCheckResult } from '../types';
import { storage } from '../storage/FileStorage';
import { calculateDiff } from '../utils/diff';

export interface AuditCheckResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string[];
}

export class AuditService {
  runAllAuditChecks(): AuditCheckResult[] {
    return [
      this.checkDuplicateImports(),
      this.checkPermissionConsistency(),
      this.checkExceptionRetention(),
      this.checkHistoryExportConsistency(),
      this.checkDataIntegrity(),
    ];
  }

  checkDuplicateImports(): AuditCheckResult {
    const importRecords = storage.getImportRecords();
    const sourceFiles = new Map<string, string[]>();
    const duplicates: string[] = [];

    for (const record of importRecords) {
      const key = `${record.sourceType}-${record.sourceFile}`;
      const existing = sourceFiles.get(key) || [];
      existing.push(record.batchId);
      sourceFiles.set(key, existing);

      if (existing.length > 1) {
        duplicates.push(
          `文件 ${record.sourceFile} (${record.sourceType}) 已导入 ${existing.length} 次: ${existing.join(', ')}`
        );
      }
    }

    return {
      name: '重复导入检查',
      passed: duplicates.length === 0,
      message: duplicates.length === 0 ? '未检测到重复导入' : `检测到 ${duplicates.length} 个潜在重复导入`,
      details: duplicates.length > 0 ? duplicates : undefined,
    };
  }

  checkPermissionConsistency(): AuditCheckResult {
    const history = storage.getHistory();
    const permissionIssues: string[] = [];
    const sensitiveActions = ['approve', 'reject', 'update'];

    const sensitiveRecords = history.filter((h) => sensitiveActions.includes(h.action));

    for (const record of sensitiveRecords) {
      if (!record.performedBy || record.performedBy === 'system') {
        permissionIssues.push(
          `操作 ${record.action} (${record.entityType}: ${record.entityId}) 缺少明确的操作人信息`
        );
      }
    }

    return {
      name: '权限拦截检查',
      passed: permissionIssues.length === 0,
      message: permissionIssues.length === 0 ? '所有敏感操作都有操作人记录' : `检测到 ${permissionIssues.length} 个权限记录问题`,
      details: permissionIssues.length > 0 ? permissionIssues : undefined,
    };
  }

  checkExceptionRetention(): AuditCheckResult {
    const importErrors = storage.getImportErrors();
    const issues: string[] = [];

    if (importErrors.length === 0) {
      return {
        name: '异常保留检查',
        passed: true,
        message: '暂无异常记录',
      };
    }

    const batches = new Set(importErrors.map((e) => e.batchId));
    for (const batchId of batches) {
      const batchErrors = importErrors.filter((e) => e.batchId === batchId);
      const hasRawData = batchErrors.every((e) => e.rawData && Object.keys(e.rawData).length > 0);
      if (!hasRawData) {
        issues.push(`批次 ${batchId} 的部分异常记录缺少原始数据`);
      }
    }

    return {
      name: '异常保留检查',
      passed: issues.length === 0,
      message: issues.length === 0 ? `所有 ${importErrors.length} 条异常记录都保留了原始数据` : `检测到异常记录保留问题`,
      details: issues.length > 0 ? issues : undefined,
    };
  }

  checkHistoryExportConsistency(): AuditCheckResult {
    const issues: string[] = [];
    const exportDir = storage.getExportDir();

    if (!fs.existsSync(exportDir)) {
      return {
        name: '重启后历史和导出一致性',
        passed: true,
        message: '暂无导出文件',
      };
    }

    const exportFiles = fs
      .readdirSync(exportDir)
      .filter((f) => f.startsWith('export_') && f.endsWith('.json'))
      .sort()
      .slice(-5);

    for (const file of exportFiles) {
      const filePath = path.join(exportDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const exportData = JSON.parse(content);
        const history = storage.getHistory();

        if (exportData.history) {
          const exportHistoryIds = new Set(exportData.history.map((h: HistoryRecord) => h.id));
          const currentHistoryIds = new Set(history.slice(-100).map((h) => h.id));

          for (const hid of exportHistoryIds) {
            const hidStr = String(hid);
            if (!currentHistoryIds.has(hidStr)) {
              const exportRecord = exportData.history.find((h: HistoryRecord) => h.id === hid);
              const currentRecord = history.find((h) => h.id === hidStr);

              if (exportRecord && currentRecord) {
                const diff = calculateDiff(
                  exportRecord as unknown as Record<string, unknown>,
                  currentRecord as unknown as Record<string, unknown>
                );
                if (diff.length > 0) {
                  issues.push(`导出文件 ${file} 中历史记录 ${hidStr} 与当前数据不一致`);
                }
              }
            }
          }
        }
      } catch (e) {
        issues.push(`无法读取导出文件 ${file}: ${(e as Error).message}`);
      }
    }

    return {
      name: '重启后历史和导出一致性',
      passed: issues.length === 0,
      message: issues.length === 0 ? '历史记录与导出文件保持一致' : `检测到 ${issues.length} 个一致性问题`,
      details: issues.length > 0 ? issues : undefined,
    };
  }

  checkDataIntegrity(): AuditCheckResult {
    const issues: string[] = [];
    const tickets = storage.getTickets();
    const ticketIds = new Set(tickets.map((t) => t.id));

    const ticketNos = new Map<string, string[]>();
    for (const ticket of tickets) {
      const existing = ticketNos.get(ticket.ticketNo) || [];
      existing.push(ticket.id);
      ticketNos.set(ticket.ticketNo, existing);
      if (existing.length > 1) {
        issues.push(`工单号 ${ticket.ticketNo} 重复出现于 ${existing.length} 条记录`);
      }
    }

    const assignments = storage.getAssignmentHistories();
    for (const assignment of assignments) {
      if (!ticketIds.has(assignment.ticketId)) {
        issues.push(`转派记录 ${assignment.id} 引用不存在的工单: ${assignment.ticketId}`);
      }
    }

    return {
      name: '数据完整性检查',
      passed: issues.length === 0,
      message: issues.length === 0 ? '数据完整性良好' : `检测到 ${issues.length} 个数据完整性问题`,
      details: issues.length > 0 ? issues : undefined,
    };
  }

  getEntityHistory(entityType: EntityType, entityId: string): HistoryRecord[] {
    return storage
      .getHistory()
      .filter((h) => h.entityType === entityType && h.entityId === entityId)
      .sort((a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime());
  }

  getBatchHistory(batchId: string): HistoryRecord[] {
    return storage
      .getHistory()
      .filter((h) => h.batchId === batchId)
      .sort((a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime());
  }

  getRecentHistory(limit: number = 50): HistoryRecord[] {
    return storage
      .getHistory()
      .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
      .slice(0, limit);
  }
}

export const auditService = new AuditService();
