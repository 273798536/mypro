import { v4 as uuidv4 } from 'uuid';
import { AuditLog, User } from '@/types';

class AuditEngine {
  private logs: AuditLog[] = [];
  private currentUser: User | null = null;

  setCurrentUser(user: User): void {
    this.currentUser = user;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  logAction(
    operatorId: string,
    operatorName: string,
    action: string,
    targetType: string,
    targetId: string,
    details: Record<string, any>,
    ipAddress?: string
  ): AuditLog {
    const log: AuditLog = {
      logId: uuidv4(),
      operatorId,
      operatorName,
      action,
      targetType,
      targetId,
      timestamp: Date.now(),
      details,
      ipAddress,
    };

    this.logs.unshift(log);
    return log;
  }

  logActionForCurrentUser(
    action: string,
    targetType: string,
    targetId: string,
    details: Record<string, any>
  ): AuditLog | null {
    if (!this.currentUser) return null;

    return this.logAction(
      this.currentUser.id,
      this.currentUser.name,
      action,
      targetType,
      targetId,
      details
    );
  }

  getAuditTrail(targetType: string, targetId: string): AuditLog[] {
    return this.logs.filter((log) => log.targetType === targetType && log.targetId === targetId);
  }

  getOperatorLogs(operatorId: string, dateRange?: [number, number]): AuditLog[] {
    let logs = this.logs.filter((log) => log.operatorId === operatorId);

    if (dateRange) {
      logs = logs.filter(
        (log) => log.timestamp >= dateRange[0] && log.timestamp <= dateRange[1]
      );
    }

    return logs;
  }

  getLogsByAction(action: string): AuditLog[] {
    return this.logs.filter((log) => log.action === action);
  }

  getLogsByDateRange(start: number, end: number): AuditLog[] {
    return this.logs.filter((log) => log.timestamp >= start && log.timestamp <= end);
  }

  getAllLogs(): AuditLog[] {
    return [...this.logs];
  }

  getRecentLogs(limit: number = 50): AuditLog[] {
    return this.logs.slice(0, limit);
  }

  getActionSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    this.logs.forEach((log) => {
      summary[log.action] = (summary[log.action] || 0) + 1;
    });
    return summary;
  }

  getOperatorSummary(): Record<string, { name: string; count: number }> {
    const summary: Record<string, { name: string; count: number }> = {};
    this.logs.forEach((log) => {
      if (!summary[log.operatorId]) {
        summary[log.operatorId] = { name: log.operatorName, count: 0 };
      }
      summary[log.operatorId].count++;
    });
    return summary;
  }

  setInitialLogs(logs: AuditLog[]): void {
    this.logs = [...logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }

    const headers = ['时间', '操作人', '操作类型', '目标类型', '目标ID', '详情'];
    const rows = this.logs.map((log) => [
      new Date(log.timestamp).toLocaleString('zh-CN'),
      log.operatorName,
      this.getActionLabel(log.action),
      this.getTargetTypeLabel(log.targetType),
      log.targetId,
      JSON.stringify(log.details),
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }

  private getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      import: '数据导入',
      create_version: '创建版本',
      update_version: '更新版本',
      manual_correction: '人工修正',
      add_review_comment: '添加复核意见',
      confirm_conclusion: '确认最终结论',
      mark_duplicate: '标记重复',
      resolve_duplicate: '解决重复',
      merge_duplicate: '合并重复',
      ai_analysis: 'AI分析',
      rollback: '版本回滚',
      export: '数据导出',
    };
    return labels[action] || action;
  }

  private getTargetTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      sample: '样本',
      version: '版本',
      review_comment: '复核意见',
      conclusion: '最终结论',
      import_batch: '导入批次',
      dedup_result: '去重结果',
    };
    return labels[type] || type;
  }
}

export const auditEngine = new AuditEngine();
