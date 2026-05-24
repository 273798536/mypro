import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import {
  BatchTrace,
  TraceStatus,
  SampleLabel,
  TemperatureRecord,
  StoreComplaint,
  StoreHandover,
  StatusAuditLog,
  EntityType,
  OperationType,
} from '../entities';
import { AuditService } from './AuditService';

export interface ReplayResult {
  traceNo: string;
  replayTime: Date;
  status: 'success' | 'failed' | 'partial';
  issuesFound: ReplayIssue[];
  summary: string;
}

export interface ReplayIssue {
  type: 'mismatch' | 'missing' | 'anomaly' | 'inconsistency';
  severity: 'high' | 'medium' | 'low';
  source: string;
  field: string;
  expected?: any;
  actual?: any;
  message: string;
}

export interface ReconciliationResult {
  batchNo: string;
  potNo: string;
  reconciliationTime: Date;
  status: 'matched' | 'mismatch' | 'partial';
  checks: ReconciliationCheck[];
  summary: string;
}

export interface ReconciliationCheck {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

export class ReplayService {
  private traceRepository: Repository<BatchTrace>;
  private sampleRepository: Repository<SampleLabel>;
  private tempRepository: Repository<TemperatureRecord>;
  private complaintRepository: Repository<StoreComplaint>;
  private handoverRepository: Repository<StoreHandover>;
  private auditRepository: Repository<StatusAuditLog>;
  private auditService: AuditService;

  constructor() {
    this.traceRepository = AppDataSource.getRepository(BatchTrace);
    this.sampleRepository = AppDataSource.getRepository(SampleLabel);
    this.tempRepository = AppDataSource.getRepository(TemperatureRecord);
    this.complaintRepository = AppDataSource.getRepository(StoreComplaint);
    this.handoverRepository = AppDataSource.getRepository(StoreHandover);
    this.auditRepository = AppDataSource.getRepository(StatusAuditLog);
    this.auditService = new AuditService();
  }

  async replayTrace(traceNo: string, operator: string, requestId?: string): Promise<ReplayResult> {
    const trace = await this.traceRepository.findOne({ where: { traceNo } });
    if (!trace) {
      throw new Error(`Trace ${traceNo} not found`);
    }

    if (trace.status === TraceStatus.FROZEN) {
      throw new Error(`Trace ${traceNo} is frozen, cannot replay`);
    }

    const issues: ReplayIssue[] = [];

    try {
      issues.push(...await this.replaySampleLabels(trace.batchNo, trace.potNo, trace.sampleLabelCount));
      issues.push(...await this.replayTemperatureRecords(trace.batchNo, trace.potNo, trace.temperatureRecordCount, trace.hasAbnormalTemperature));
      issues.push(...await this.replayHandovers(trace.batchNo, trace.potNo, trace.handoverCount, trace.totalStores, trace.completedStores));
      issues.push(...await this.replayComplaints(trace.batchNo, trace.potNo, trace.complaintCount, trace.hasComplaint));
      issues.push(...await this.replayAuditLogs(traceNo));
    } catch (error: any) {
      issues.push({
        type: 'anomaly',
        severity: 'high',
        source: 'replay',
        field: 'system',
        message: `回放过程出错: ${error.message}`,
      });
    }

    const highIssues = issues.filter((i) => i.severity === 'high').length;
    const mediumIssues = issues.filter((i) => i.severity === 'medium').length;
    const lowIssues = issues.filter((i) => i.severity === 'low').length;

    let status: 'success' | 'failed' | 'partial' = 'success';
    if (highIssues > 0) {
      status = 'failed';
    } else if (mediumIssues > 0 || lowIssues > 0) {
      status = 'partial';
    }

    const summary = `回放完成: ${highIssues} 个严重问题, ${mediumIssues} 个中等问题, ${lowIssues} 个轻微问题`;

    await this.auditService.log({
      entityId: trace.id,
      entityType: EntityType.BATCH_TRACE,
      entityNo: traceNo,
      operationType: OperationType.REPLAY,
      operator,
      reason: summary,
      oldStatus: trace.status,
      newStatus: trace.status,
      requestId,
    });

    return {
      traceNo,
      replayTime: new Date(),
      status,
      issuesFound: issues,
      summary,
    };
  }

  private async replaySampleLabels(batchNo: string, potNo: string, expectedCount: number): Promise<ReplayIssue[]> {
    const issues: ReplayIssue[] = [];

    try {
      const samples = await this.sampleRepository.find({
        where: { batchNo, potNo, isDeleted: false },
      });

      if (samples.length !== expectedCount) {
        issues.push({
          type: 'mismatch',
          severity: samples.length === 0 ? 'high' : 'medium',
          source: 'sample_label',
          field: 'count',
          expected: expectedCount,
          actual: samples.length,
          message: `留样标签数量不匹配: 预期 ${expectedCount}, 实际 ${samples.length}`,
        });
      }

      samples.forEach((sample, index) => {
        if (!sample.status || sample.status === 'created') {
          issues.push({
            type: 'anomaly',
            severity: 'medium',
            source: 'sample_label',
            field: 'status',
            actual: sample.status,
            message: `留样标签[${index}]: 状态异常(${sample.status})，可能未完成验收流程`,
          });
        }
        if (sample.version > 1) {
          issues.push({
            type: 'inconsistency',
            severity: 'low',
            source: 'sample_label',
            field: 'version',
            actual: sample.version,
            message: `留样标签[${index}]: 已被修改过 ${sample.version - 1} 次`,
          });
        }
      });
    } catch (error: any) {
      issues.push({
        type: 'anomaly',
        severity: 'high',
        source: 'sample_label',
        field: 'query',
        message: `留样标签查询失败: ${error.message}`,
      });
    }

    return issues;
  }

  private async replayTemperatureRecords(
    batchNo: string,
    potNo: string,
    expectedCount: number,
    expectedHasAbnormal: boolean
  ): Promise<ReplayIssue[]> {
    const issues: ReplayIssue[] = [];

    try {
      const records = await this.tempRepository.find({
        where: { batchNo, potNo },
        order: { recordTime: 'ASC' },
      });

      if (records.length !== expectedCount) {
        issues.push({
          type: 'mismatch',
          severity: records.length === 0 ? 'high' : 'medium',
          source: 'temperature',
          field: 'count',
          expected: expectedCount,
          actual: records.length,
          message: `温度记录数量不匹配: 预期 ${expectedCount}, 实际 ${records.length}`,
        });
      }

      const hasAbnormal = records.some((r) => r.status !== 'normal');
      if (hasAbnormal !== expectedHasAbnormal) {
        issues.push({
          type: 'mismatch',
          severity: 'high',
          source: 'temperature',
          field: 'hasAbnormal',
          expected: expectedHasAbnormal,
          actual: hasAbnormal,
          message: `异常温度状态不匹配: 预期 ${expectedHasAbnormal}, 实际 ${hasAbnormal}`,
        });
      }

      if (records.length >= 2) {
        for (let i = 1; i < records.length; i++) {
          const prevTemp = records[i - 1].temperature;
          const currTemp = records[i].temperature;
          const diff = Math.abs(currTemp - prevTemp);
          if (diff > 5) {
            issues.push({
              type: 'anomaly',
              severity: 'medium',
              source: 'temperature',
              field: 'temperature_fluctuation',
              actual: diff,
              message: `温度波动异常: 记录 ${i - 1} → ${i} 相差 ${diff.toFixed(1)}°C`,
            });
          }
        }
      }
    } catch (error: any) {
      issues.push({
        type: 'anomaly',
        severity: 'high',
        source: 'temperature',
        field: 'query',
        message: `温度记录查询失败: ${error.message}`,
      });
    }

    return issues;
  }

  private async replayHandovers(
    batchNo: string,
    potNo: string,
    expectedCount: number,
    expectedTotalStores: number,
    expectedCompletedStores: number
  ): Promise<ReplayIssue[]> {
    const issues: ReplayIssue[] = [];

    try {
      const handovers = await this.handoverRepository.find({
        where: { batchNo, potNo },
      });

      if (handovers.length !== expectedCount) {
        issues.push({
          type: 'mismatch',
          severity: handovers.length === 0 ? 'high' : 'medium',
          source: 'handover',
          field: 'count',
          expected: expectedCount,
          actual: handovers.length,
          message: `交接单数量不匹配: 预期 ${expectedCount}, 实际 ${handovers.length}`,
        });
      }

      const totalStores = handovers.length;
      if (totalStores !== expectedTotalStores) {
        issues.push({
          type: 'mismatch',
          severity: 'medium',
          source: 'handover',
          field: 'totalStores',
          expected: expectedTotalStores,
          actual: totalStores,
          message: `涉及门店数不匹配: 预期 ${expectedTotalStores}, 实际 ${totalStores}`,
        });
      }

      const completedStores = handovers.filter((h) => h.status === 'received').length;
      if (completedStores !== expectedCompletedStores) {
        issues.push({
          type: 'mismatch',
          severity: 'low',
          source: 'handover',
          field: 'completedStores',
          expected: expectedCompletedStores,
          actual: completedStores,
          message: `已完成门店数不匹配: 预期 ${expectedCompletedStores}, 实际 ${completedStores}`,
        });
      }

      handovers.forEach((handover, index) => {
        if (handover.receivedQuantity > handover.deliveredQuantity) {
          issues.push({
            type: 'anomaly',
            severity: 'high',
            source: 'handover',
            field: 'quantity',
            actual: handover.receivedQuantity,
            expected: handover.deliveredQuantity,
            message: `交接单[${index}]: 实收数量(${handover.receivedQuantity})大于配送数量(${handover.deliveredQuantity})`,
          });
        }
        if (handover.status === 'delivered' && !handover.receiver) {
          issues.push({
            type: 'inconsistency',
            severity: 'low',
            source: 'handover',
            field: 'receiver',
            message: `交接单[${index}]: 状态为已送达但未填写签收人`,
          });
        }
      });
    } catch (error: any) {
      issues.push({
        type: 'anomaly',
        severity: 'high',
        source: 'handover',
        field: 'query',
        message: `交接单查询失败: ${error.message}`,
      });
    }

    return issues;
  }

  private async replayComplaints(
    batchNo: string,
    potNo: string,
    expectedCount: number,
    expectedHasComplaint: boolean
  ): Promise<ReplayIssue[]> {
    const issues: ReplayIssue[] = [];

    try {
      const complaints = await this.complaintRepository.find({
        where: { batchNo, potNo },
      });

      if (complaints.length !== expectedCount) {
        issues.push({
          type: 'mismatch',
          severity: complaints.length === 0 ? 'low' : 'medium',
          source: 'complaint',
          field: 'count',
          expected: expectedCount,
          actual: complaints.length,
          message: `投诉数量不匹配: 预期 ${expectedCount}, 实际 ${complaints.length}`,
        });
      }

      const hasComplaint = complaints.length > 0;
      if (hasComplaint !== expectedHasComplaint) {
        issues.push({
          type: 'mismatch',
          severity: 'medium',
          source: 'complaint',
          field: 'hasComplaint',
          expected: expectedHasComplaint,
          actual: hasComplaint,
          message: `投诉状态不匹配: 预期 ${expectedHasComplaint}, 实际 ${hasComplaint}`,
        });
      }

      complaints.forEach((complaint, index) => {
        if (complaint.status === 'investigating' && !complaint.handler) {
          issues.push({
            type: 'inconsistency',
            severity: 'medium',
            source: 'complaint',
            field: 'handler',
            message: `投诉[${index}]: 调查中但未指定处理人`,
          });
        }
      });
    } catch (error: any) {
      issues.push({
        type: 'anomaly',
        severity: 'medium',
        source: 'complaint',
        field: 'query',
        message: `投诉查询失败: ${error.message}`,
      });
    }

    return issues;
  }

  private async replayAuditLogs(traceNo: string): Promise<ReplayIssue[]> {
    const issues: ReplayIssue[] = [];

    try {
      const logs = await this.auditRepository.find({
        where: { entityNo: traceNo, entityType: EntityType.BATCH_TRACE },
        order: { operationTime: 'ASC' },
      });

      if (logs.length === 0) {
        issues.push({
          type: 'missing',
          severity: 'medium',
          source: 'audit_log',
          field: 'logs',
          message: '未找到审计日志记录',
        });
        return issues;
      }

      const hasCreate = logs.some((l) => l.operationType === OperationType.CREATE);
      if (!hasCreate) {
        issues.push({
          type: 'missing',
          severity: 'high',
          source: 'audit_log',
          field: 'create_log',
          message: '缺少创建记录的审计日志',
        });
      }

      for (let i = 1; i < logs.length; i++) {
        const prevTime = logs[i - 1].operationTime.getTime();
        const currTime = logs[i].operationTime.getTime();
        if (currTime < prevTime) {
          issues.push({
            type: 'anomaly',
            severity: 'high',
            source: 'audit_log',
            field: 'time_order',
            message: `审计日志时间顺序异常: 记录 ${i - 1} 晚于记录 ${i}`,
          });
        }
      }
    } catch (error: any) {
      issues.push({
        type: 'anomaly',
        severity: 'low',
        source: 'audit_log',
        field: 'query',
        message: `审计日志查询失败: ${error.message}`,
      });
    }

    return issues;
  }

  async reconcile(batchNo: string, potNo: string, operator: string, requestId?: string): Promise<ReconciliationResult> {
    const checks: ReconciliationCheck[] = [];

    checks.push(await this.checkSampleConsistency(batchNo, potNo));
    checks.push(await this.checkTemperatureConsistency(batchNo, potNo));
    checks.push(await this.checkHandoverConsistency(batchNo, potNo));
    checks.push(await this.checkCrossSourceConsistency(batchNo, potNo));

    const passedCount = checks.filter((c) => c.passed).length;
    let status: 'matched' | 'mismatch' | 'partial' = 'matched';
    if (passedCount === 0) {
      status = 'mismatch';
    } else if (passedCount < checks.length) {
      status = 'partial';
    }

    const summary = `对账完成: ${passedCount}/${checks.length} 项检查通过`;

    return {
      batchNo,
      potNo,
      reconciliationTime: new Date(),
      status,
      checks,
      summary,
    };
  }

  private async checkSampleConsistency(batchNo: string, potNo: string): Promise<ReconciliationCheck> {
    try {
      const samples = await this.sampleRepository.find({
        where: { batchNo, potNo, isDeleted: false },
      });

      if (samples.length === 0) {
        return {
          name: '留样标签一致性',
          passed: false,
          message: '未找到留样标签数据',
        };
      }

      const uniqueBatchNo = new Set(samples.map((s) => s.batchNo));
      const uniquePotNo = new Set(samples.map((s) => s.potNo));

      if (uniqueBatchNo.size > 1 || uniquePotNo.size > 1) {
        return {
          name: '留样标签一致性',
          passed: false,
          message: '同批次留样标签存在不一致的批次号或锅次号',
          details: {
            batchNos: Array.from(uniqueBatchNo),
            potNos: Array.from(uniquePotNo),
          },
        };
      }

      return {
        name: '留样标签一致性',
        passed: true,
        message: `${samples.length} 条留样标签数据一致`,
      };
    } catch (error: any) {
      return {
        name: '留样标签一致性',
        passed: false,
        message: `检查失败: ${error.message}`,
      };
    }
  }

  private async checkTemperatureConsistency(batchNo: string, potNo: string): Promise<ReconciliationCheck> {
    try {
      const records = await this.tempRepository.find({
        where: { batchNo, potNo },
        order: { recordTime: 'ASC' },
      });

      if (records.length === 0) {
        return {
          name: '温度记录一致性',
          passed: false,
          message: '未找到温度记录数据',
        };
      }

      let hasGaps = false;
      for (let i = 1; i < records.length; i++) {
        const gap = records[i].recordTime.getTime() - records[i - 1].recordTime.getTime();
        if (gap > 2 * 60 * 60 * 1000) {
          hasGaps = true;
          break;
        }
      }

      if (hasGaps) {
        return {
          name: '温度记录一致性',
          passed: false,
          message: '温度记录存在超过2小时的时间间隔',
        };
      }

      return {
        name: '温度记录一致性',
        passed: true,
        message: `${records.length} 条温度记录连续一致`,
      };
    } catch (error: any) {
      return {
        name: '温度记录一致性',
        passed: false,
        message: `检查失败: ${error.message}`,
      };
    }
  }

  private async checkHandoverConsistency(batchNo: string, potNo: string): Promise<ReconciliationCheck> {
    try {
      const handovers = await this.handoverRepository.find({
        where: { batchNo, potNo },
      });

      if (handovers.length === 0) {
        return {
          name: '门店交接一致性',
          passed: false,
          message: '未找到门店交接数据',
        };
      }

      const uniqueStores = new Set(handovers.map((h) => h.storeCode));
      if (uniqueStores.size !== handovers.length) {
        return {
          name: '门店交接一致性',
          passed: false,
          message: '存在重复的门店交接记录',
        };
      }

      return {
        name: '门店交接一致性',
        passed: true,
        message: `${handovers.length} 个门店交接记录一致，无重复`,
      };
    } catch (error: any) {
      return {
        name: '门店交接一致性',
        passed: false,
        message: `检查失败: ${error.message}`,
      };
    }
  }

  private async checkCrossSourceConsistency(batchNo: string, potNo: string): Promise<ReconciliationCheck> {
    try {
      const samples = await this.sampleRepository.find({ where: { batchNo, potNo, isDeleted: false } });
      const handovers = await this.handoverRepository.find({ where: { batchNo, potNo } });

      if (samples.length === 0) {
        return {
          name: '跨源数据一致性',
          passed: false,
          message: '缺少留样标签数据',
        };
      }

      if (handovers.length === 0) {
        return {
          name: '跨源数据一致性',
          passed: false,
          message: '缺少门店交接数据',
        };
      }

      const totalDelivered = handovers.reduce((sum, h) => sum + h.deliveredQuantity, 0);
      const sampleQuantity = samples.reduce((sum, s) => sum + s.quantity, 0);

      if (totalDelivered === 0) {
        return {
          name: '跨源数据一致性',
          passed: false,
          message: '配送总数量为0',
        };
      }

      return {
        name: '跨源数据一致性',
        passed: true,
        message: `留样数量(${sampleQuantity}) 与 配送数量(${totalDelivered}) 对应关系正常`,
      };
    } catch (error: any) {
      return {
        name: '跨源数据一致性',
        passed: false,
        message: `检查失败: ${error.message}`,
      };
    }
  }
}