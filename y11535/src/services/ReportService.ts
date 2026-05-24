import * as XLSX from 'xlsx';
import { Repository } from 'typeorm';
import { ExceptionRecordEntity } from '../database/entities/ExceptionRecordEntity';
import { AppDataSource } from '../database/data-source';
import { ExceptionStatus, ExceptionType, Role } from '../types';
import { auditLogService } from './AuditLogService';
import { ActionType } from '../types';

export interface HRBPReportData {
  summary: {
    totalRecords: number;
    byStatus: Record<string, number>;
    byExceptionType: Record<string, number>;
    byDepartment: Record<string, number>;
    frozenCount: number;
    manualOverrideCount: number;
    settledCount: number;
  };
  details: Array<{
    employeeId: string;
    employeeName: string;
    department: string;
    trainingName: string;
    trainingDate: Date;
    exceptionType: string;
    status: string;
    isFrozen: boolean;
    frozenAt?: Date;
    frozenBy?: string;
    freezeReason?: string;
    manualReviewCount: number;
    latestReviewResult?: string;
    latestReviewReason?: string;
    latestReviewer?: string;
    settledAt?: Date;
    settledBy?: string;
    sourceFileName: string;
    sourceRowNumber: number;
    attachmentCount: number;
  }>;
  stateChanges: Array<{
    employeeId: string;
    employeeName: string;
    fromStatus: string;
    toStatus: string;
    changedBy: string;
    changeReason: string;
    changedAt: Date;
    actionType: string;
  }>;
}

export class ReportService {
  private repository: Repository<ExceptionRecordEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(ExceptionRecordEntity);
  }

  async generateHRBPReport(params: {
    trainingId?: string;
    department?: string;
    startDate?: Date;
    endDate?: Date;
    includeFrozen?: boolean;
    generatedBy: string;
    generatorName: string;
    generatorRole: Role;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<HRBPReportData> {
    const queryBuilder = this.repository.createQueryBuilder('record');

    if (params.trainingId) {
      queryBuilder.andWhere('record.trainingId = :trainingId', { trainingId: params.trainingId });
    }

    if (params.department) {
      queryBuilder.andWhere('record.department = :department', { department: params.department });
    }

    if (params.startDate) {
      queryBuilder.andWhere('record.trainingDate >= :startDate', { startDate: params.startDate });
    }

    if (params.endDate) {
      queryBuilder.andWhere('record.trainingDate <= :endDate', { endDate: params.endDate });
    }

    if (params.includeFrozen === false) {
      queryBuilder.andWhere('record.isFrozen = :isFrozen', { isFrozen: false });
    }

    const records = await queryBuilder.getMany();

    const summary = this.calculateSummary(records);
    const details = this.generateDetails(records);
    const stateChanges = this.generateStateChanges(records);

    await auditLogService.logAction({
      userId: params.generatedBy,
      userName: params.generatorName,
      userRole: params.generatorRole,
      actionType: ActionType.EXPORT,
      resourceType: 'report',
      resourceId: `hrbp-report-${Date.now()}`,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestBody: params,
      responseBody: { summary, recordCount: records.length },
      success: true
    });

    return { summary, details, stateChanges };
  }

  private calculateSummary(records: ExceptionRecordEntity[]): HRBPReportData['summary'] {
    const byStatus: Record<string, number> = {};
    const byExceptionType: Record<string, number> = {};
    const byDepartment: Record<string, number> = {};
    let frozenCount = 0;
    let manualOverrideCount = 0;
    let settledCount = 0;

    for (const record of records) {
      byStatus[record.status] = (byStatus[record.status] || 0) + 1;
      byExceptionType[record.exceptionType] = (byExceptionType[record.exceptionType] || 0) + 1;
      byDepartment[record.department] = (byDepartment[record.department] || 0) + 1;

      if (record.isFrozen) frozenCount++;
      if (record.status === ExceptionStatus.SETTLED) settledCount++;

      const manualReviews = record.reviewHistory.filter(r => r.manualOverride);
      manualOverrideCount += manualReviews.length;
    }

    return {
      totalRecords: records.length,
      byStatus,
      byExceptionType,
      byDepartment,
      frozenCount,
      manualOverrideCount,
      settledCount
    };
  }

  private generateDetails(records: ExceptionRecordEntity[]): HRBPReportData['details'] {
    return records.map(record => {
      const latestReview = record.reviewHistory[record.reviewHistory.length - 1];

      return {
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        department: record.department,
        trainingName: record.trainingName,
        trainingDate: record.trainingDate,
        exceptionType: record.exceptionType,
        status: record.status,
        isFrozen: record.isFrozen,
        frozenAt: record.frozenAt,
        frozenBy: record.frozenBy,
        freezeReason: record.freezeReason,
        manualReviewCount: record.reviewHistory.filter(r => r.manualOverride).length,
        latestReviewResult: latestReview?.result,
        latestReviewReason: latestReview?.reason,
        latestReviewer: latestReview?.reviewer,
        settledAt: record.settledAt,
        settledBy: record.settledBy,
        sourceFileName: record.importSource.sourceFileName,
        sourceRowNumber: record.importSource.originalRowNumber,
        attachmentCount: record.attachments.length
      };
    });
  }

  private generateStateChanges(records: ExceptionRecordEntity[]): HRBPReportData['stateChanges'] {
    const changes: HRBPReportData['stateChanges'] = [];

    for (const record of records) {
      for (const transition of record.stateTransitions) {
        changes.push({
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          fromStatus: transition.fromStatus,
          toStatus: transition.toStatus,
          changedBy: transition.changedBy,
          changeReason: transition.changeReason,
          changedAt: transition.changedAt,
          actionType: transition.triggeredBy
        });
      }
    }

    return changes.sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
  }

  exportToExcel(report: HRBPReportData): Buffer {
    const wb = XLSX.utils.book_new();

    const summaryData = [
      ['汇总信息'],
      ['指标', '数值'],
      ['总记录数', report.summary.totalRecords],
      ['已冻结', report.summary.frozenCount],
      ['人工改判数', report.summary.manualOverrideCount],
      ['已结算', report.summary.settledCount],
      [],
      ['按状态分布'],
      ['状态', '数量'],
      ...Object.entries(report.summary.byStatus).map(([k, v]) => [k, v]),
      [],
      ['按异常类型分布'],
      ['异常类型', '数量'],
      ...Object.entries(report.summary.byExceptionType).map(([k, v]) => [k, v]),
      [],
      ['按部门分布'],
      ['部门', '数量'],
      ...Object.entries(report.summary.byDepartment).map(([k, v]) => [k, v])
    ];

    const detailsData = [
      [
        '员工工号', '员工姓名', '部门', '培训名称', '培训日期',
        '异常类型', '当前状态', '是否冻结', '冻结时间', '冻结人', '冻结原因',
        '人工改判次数', '最新复核结果', '最新复核原因', '最新复核人',
        '结算时间', '结算人', '来源文件', '来源行号', '附件数量'
      ],
      ...report.details.map(d => [
        d.employeeId, d.employeeName, d.department, d.trainingName,
        d.trainingDate.toISOString().slice(0, 10),
        d.exceptionType, d.status, d.isFrozen ? '是' : '否',
        d.frozenAt?.toISOString().slice(0, 10) || '',
        d.frozenBy || '',
        d.freezeReason || '',
        d.manualReviewCount,
        d.latestReviewResult || '',
        d.latestReviewReason || '',
        d.latestReviewer || '',
        d.settledAt?.toISOString().slice(0, 10) || '',
        d.settledBy || '',
        d.sourceFileName,
        d.sourceRowNumber,
        d.attachmentCount
      ])
    ];

    const stateChangesData = [
      ['员工工号', '员工姓名', '从状态', '到状态', '操作人', '变更原因', '变更时间', '操作类型'],
      ...report.stateChanges.map(c => [
        c.employeeId, c.employeeName, c.fromStatus, c.toStatus,
        c.changedBy, c.changeReason,
        c.changedAt.toISOString(), c.actionType
      ])
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    const ws2 = XLSX.utils.aoa_to_sheet(detailsData);
    const ws3 = XLSX.utils.aoa_to_sheet(stateChangesData);

    XLSX.utils.book_append_sheet(wb, ws1, '汇总');
    XLSX.utils.book_append_sheet(wb, ws2, '明细');
    XLSX.utils.book_append_sheet(wb, ws3, '状态变更历史');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async getFrozenReport(params: {
    trainingId?: string;
    department?: string;
    generatedBy: string;
    generatorName: string;
    generatorRole: Role;
  }) {
    const queryBuilder = this.repository.createQueryBuilder('record');
    queryBuilder.andWhere('record.isFrozen = :isFrozen', { isFrozen: true });

    if (params.trainingId) {
      queryBuilder.andWhere('record.trainingId = :trainingId', { trainingId: params.trainingId });
    }

    if (params.department) {
      queryBuilder.andWhere('record.department = :department', { department: params.department });
    }

    const frozenRecords = await queryBuilder.getMany();

    return frozenRecords.map(record => ({
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      department: record.department,
      trainingName: record.trainingName,
      trainingDate: record.trainingDate,
      exceptionType: record.exceptionType,
      statusBeforeFreeze: record.stateTransitions.find(t => t.toStatus === ExceptionStatus.FROZEN)?.fromStatus,
      frozenAt: record.frozenAt,
      frozenBy: record.frozenBy,
      freezeReason: record.freezeReason,
      originalSource: record.importSource.sourceFileName,
      originalRow: record.importSource.originalRowNumber
    }));
  }
}

export const reportService = new ReportService();
