import { AttendanceDatabase } from './database';
import { CheckResult, CheckIssueType, AttendanceRecord } from './types';

export class CheckService {
  private db: AttendanceDatabase;

  constructor(db: AttendanceDatabase) {
    this.db = db;
  }

  async runChecks(operator: string): Promise<CheckResult> {
    const records = await this.db.getAllRecords();
    const now = new Date().toISOString();

    const issuesByType: Record<CheckIssueType, number> = {
      duplicate_tracking_number: 0,
      duplicate_employee: 0,
      proxy_sign_suspected: 0,
      makeup_sign_detected: 0,
      status_mismatch: 0,
      missing_data: 0,
      withdrawn_resubmitted: 0,
    };

    const newIssues = [];
    let criticalCount = 0;

    const trackingNumberGroups = new Map<string, AttendanceRecord[]>();
    const employeeCourseGroups = new Map<string, AttendanceRecord[]>();

    for (const record of records) {
      const key = `${record.trackingNumber}`;
      if (!trackingNumberGroups.has(key)) {
        trackingNumberGroups.set(key, []);
      }
      trackingNumberGroups.get(key)!.push(record);

      const empKey = `${record.employeeId}-${record.courseId}`;
      if (!employeeCourseGroups.has(empKey)) {
        employeeCourseGroups.set(empKey, []);
      }
      employeeCourseGroups.get(empKey)!.push(record);
    }

    for (const [trackingNumber, groupRecords] of trackingNumberGroups) {
      if (groupRecords.length > 1) {
        issuesByType.duplicate_tracking_number += groupRecords.length;

        for (const record of groupRecords) {
          if (record.isFrozen) continue;

          const existingIssue = record.issues.find(
            i => i.type === 'duplicate_tracking_number' && !i.resolved
          );
          if (existingIssue) continue;

          const relatedRecordIds = groupRecords
            .filter(r => r.id !== record.id)
            .map(r => r.id);

          const issueId = await this.db.addIssue(
            record.id,
            'duplicate_tracking_number',
            'critical',
            `快递单号 [${trackingNumber}] 被 ${groupRecords.length} 条记录重复使用，相关记录ID: ${relatedRecordIds.join(', ')}`,
            relatedRecordIds
          );

          await this.db.updateRecordStatus(
            record.id,
            'duplicate',
            operator,
            `检测到快递单号重复: ${trackingNumber}`
          );

          newIssues.push({
            id: issueId,
            recordId: record.id,
            type: 'duplicate_tracking_number' as CheckIssueType,
            severity: 'critical' as const,
            description: `快递单号 [${trackingNumber}] 重复`,
            relatedRecordIds,
            detectedAt: now,
            resolved: false,
          });
          criticalCount++;
        }
      }
    }

    for (const [empKey, groupRecords] of employeeCourseGroups) {
      if (groupRecords.length > 1) {
        issuesByType.duplicate_employee += groupRecords.length - 1;

        for (let i = 1; i < groupRecords.length; i++) {
          const record = groupRecords[i];
          if (record.isFrozen) continue;

          const existingIssue = record.issues.find(
            i => i.type === 'duplicate_employee' && !i.resolved
          );
          if (existingIssue) continue;

          const issueId = await this.db.addIssue(
            record.id,
            'duplicate_employee',
            'high',
            `员工 [${record.employeeName}/${record.employeeId}] 在同一课程有 ${groupRecords.length} 条签到记录`
          );

          newIssues.push({
            id: issueId,
            recordId: record.id,
            type: 'duplicate_employee' as CheckIssueType,
            severity: 'high' as const,
            description: `员工同一课程多次签到`,
            detectedAt: now,
            resolved: false,
          });
        }
      }
    }

    for (const record of records) {
      if (record.isFrozen) continue;

      const sourceTypes = record.sources.map(s => s.sourceType);
      const hasExternal = sourceTypes.includes('external_receipt');
      const hasRegistration = sourceTypes.includes('registration');

      if (hasExternal && !hasRegistration) {
        const existingIssue = record.issues.find(
          i => i.type === 'proxy_sign_suspected' && !i.resolved
        );
        if (!existingIssue) {
          const issueId = await this.db.addIssue(
            record.id,
            'proxy_sign_suspected',
            'high',
            '只有外部回执，没有报名表签到记录，疑似代签到'
          );

          await this.db.updateRecordStatus(
            record.id,
            'proxy_sign',
            operator,
            '疑似代签到：只有外部回执'
          );

          newIssues.push({
            id: issueId,
            recordId: record.id,
            type: 'proxy_sign_suspected' as CheckIssueType,
            severity: 'high' as const,
            description: '疑似代签到',
            detectedAt: now,
            resolved: false,
          });
          issuesByType.proxy_sign_suspected++;
        }
      }

      if (sourceTypes.length >= 2 && hasRegistration) {
        const externalSource = record.sources.find(s => s.sourceType === 'external_receipt');
        const qrcodeSource = record.sources.find(s => s.sourceType === 'qrcode');
        const homeworkSource = record.sources.find(s => s.sourceType === 'homework');

        if (externalSource && (qrcodeSource || homeworkSource)) {
          const existingIssue = record.issues.find(
            i => i.type === 'makeup_sign_detected' && !i.resolved
          );
          if (!existingIssue) {
            const issueId = await this.db.addIssue(
              record.id,
              'makeup_sign_detected',
              'medium',
              '同时有原始签到和外部回执，疑似补签'
            );

            await this.db.updateRecordStatus(
              record.id,
              'makeup_sign',
              operator,
              '疑似补签：多源数据混合'
            );

            newIssues.push({
              id: issueId,
              recordId: record.id,
              type: 'makeup_sign_detected' as CheckIssueType,
              severity: 'medium' as const,
              description: '疑似补签',
              detectedAt: now,
              resolved: false,
            });
            issuesByType.makeup_sign_detected++;
          }
        }
      }

      if (record.currentStatus === 'resubmitted') {
        const existingIssue = record.issues.find(
          i => i.type === 'withdrawn_resubmitted' && !i.resolved
        );
        if (!existingIssue) {
          const issueId = await this.db.addIssue(
            record.id,
            'withdrawn_resubmitted',
            'medium',
            '记录被重新提交，需要确认是否为撤回后再提交'
          );

          newIssues.push({
            id: issueId,
            recordId: record.id,
            type: 'withdrawn_resubmitted' as CheckIssueType,
            severity: 'medium' as const,
            description: '重新提交记录',
            detectedAt: now,
            resolved: false,
          });
          issuesByType.withdrawn_resubmitted++;
        }
      }
    }

    return {
      checkedAt: now,
      totalRecords: records.length,
      totalIssues: newIssues.length,
      issuesByType,
      criticalIssues: criticalCount,
      newIssues,
    };
  }
}
