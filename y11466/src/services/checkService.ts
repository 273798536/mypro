import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import {
  SampleRepository,
  SizeModificationRepository,
  FabricTransactionRepository,
  RefundRepository,
  CheckRepository,
  AuditRepository
} from '../db';
import { CheckResult, SampleFlowRecord, FabricTransaction, RefundRecord } from '../types';

export interface CheckOptions {
  checkTypes?: string[];
  sampleNos?: string[];
  styleNos?: string[];
}

export interface FixResult {
  checkId: string;
  fixed: boolean;
  message: string;
}

export class CheckService {
  private sampleRepo: SampleRepository;
  private sizeRepo: SizeModificationRepository;
  private fabricTxRepo: FabricTransactionRepository;
  private refundRepo: RefundRepository;
  private checkRepo: CheckRepository;
  private auditRepo: AuditRepository;
  private currentUser: string;

  constructor(
    sampleRepo: SampleRepository,
    sizeRepo: SizeModificationRepository,
    fabricTxRepo: FabricTransactionRepository,
    refundRepo: RefundRepository,
    checkRepo: CheckRepository,
    auditRepo: AuditRepository,
    currentUser = 'system'
  ) {
    this.sampleRepo = sampleRepo;
    this.sizeRepo = sizeRepo;
    this.fabricTxRepo = fabricTxRepo;
    this.refundRepo = refundRepo;
    this.checkRepo = checkRepo;
    this.auditRepo = auditRepo;
    this.currentUser = currentUser;
  }

  async runChecks(options: CheckOptions = {}): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const checkTypes = options.checkTypes || this.getAvailableChecks();

    for (const checkType of checkTypes) {
      switch (checkType) {
        case 'deposit_discrepancy':
          results.push(...await this.checkDepositDiscrepancy(options));
          break;
        case 'fabric_usage_tracking':
          results.push(...await this.checkFabricUsageTracking(options));
          break;
        case 'missing_size_modification':
          results.push(...await this.checkMissingSizeModification(options));
          break;
        case 'refund_mismatch':
          results.push(...await this.checkRefundMismatch(options));
          break;
        case 'version_consistency':
          results.push(...await this.checkVersionConsistency(options));
          break;
        default:
          console.warn(`Unknown check type: ${checkType}`);
      }
    }

    for (const result of results) {
      this.checkRepo.create(result);
    }

    return results;
  }

  getAvailableChecks(): string[] {
    return [
      'deposit_discrepancy',
      'fabric_usage_tracking',
      'missing_size_modification',
      'refund_mismatch',
      'version_consistency'
    ];
  }

  private async checkDepositDiscrepancy(options: CheckOptions): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const samples = this.sampleRepo.findMany({ where: { is_latest: 1 } }) as SampleFlowRecord[];

    for (const sample of samples) {
      if (options.sampleNos && !options.sampleNos.includes(sample.sampleNo)) continue;
      if (options.styleNos && !options.styleNos.includes(sample.styleNo)) continue;

      if (sample.depositAmount <= 0 && sample.status !== 'draft') {
        results.push({
          checkId: uuidv4(),
          type: 'deposit_discrepancy',
          severity: 'warning',
          message: `样衣 ${sample.sampleNo} (${sample.styleName}) 押金金额为0但状态不是草稿`,
          details: {
            sampleNo: sample.sampleNo,
            styleNo: sample.styleNo,
            depositAmount: sample.depositAmount,
            status: sample.status,
            sourceRowNumber: sample.sourceRowNumber
          },
          relatedEntities: [{ type: 'sample_flow', id: sample.sampleNo }],
          fixed: false,
          createdAt: dayjs().toISOString()
        });
      }

      const refunds = this.refundRepo.findBySampleNo(sample.sampleNo, true);
      const totalRefunded = refunds.reduce((sum, r) => sum + r.refundAmount, 0);

      if (sample.depositRefundAmount !== undefined && 
          sample.depositRefundAmount !== totalRefunded) {
        results.push({
          checkId: uuidv4(),
          type: 'deposit_discrepancy',
          severity: 'error',
          message: `样衣 ${sample.sampleNo} 押金退款金额不匹配: 流转单记录 ${sample.depositRefundAmount}，实际退款 ${totalRefunded}`,
          details: {
            sampleNo: sample.sampleNo,
            recordedRefund: sample.depositRefundAmount,
            actualRefund: totalRefunded,
            difference: sample.depositRefundAmount - totalRefunded,
            sourceRowNumber: sample.sourceRowNumber
          },
          relatedEntities: [
            { type: 'sample_flow', id: sample.sampleNo },
            ...refunds.map(r => ({ type: 'refund' as const, id: r.refundNo }))
          ],
          fixed: false,
          createdAt: dayjs().toISOString()
        });
      }

      if (sample.depositRefundedAt && !sample.depositRefundAmount) {
        results.push({
          checkId: uuidv4(),
          type: 'deposit_discrepancy',
          severity: 'error',
          message: `样衣 ${sample.sampleNo} 有退款时间但无退款金额`,
          details: {
            sampleNo: sample.sampleNo,
            refundedAt: sample.depositRefundedAt,
            sourceRowNumber: sample.sourceRowNumber
          },
          relatedEntities: [{ type: 'sample_flow', id: sample.sampleNo }],
          fixed: false,
          createdAt: dayjs().toISOString()
        });
      }
    }

    return results;
  }

  private async checkFabricUsageTracking(options: CheckOptions): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const samples = this.sampleRepo.findMany({ where: { is_latest: 1 } }) as SampleFlowRecord[];

    for (const sample of samples) {
      if (options.sampleNos && !options.sampleNos.includes(sample.sampleNo)) continue;
      if (options.styleNos && !options.styleNos.includes(sample.styleNo)) continue;

      const transactions = this.fabricTxRepo.findBySampleNo(sample.sampleNo, true);

      if (transactions.length === 0 && sample.status !== 'draft') {
        results.push({
          checkId: uuidv4(),
          type: 'fabric_usage_tracking',
          severity: 'info',
          message: `样衣 ${sample.sampleNo} (${sample.styleName}) 无面料领用记录`,
          details: {
            sampleNo: sample.sampleNo,
            styleNo: sample.styleNo,
            status: sample.status,
            sourceRowNumber: sample.sourceRowNumber
          },
          relatedEntities: [{ type: 'sample_flow', id: sample.sampleNo }],
          fixed: false,
          createdAt: dayjs().toISOString()
        });
      }

      const modifications = this.sizeRepo.findBySampleNo(sample.sampleNo, true);
      
      for (const mod of modifications) {
        const affectedFabrics = mod.affectedFabrics || [];
        
        for (const fabricCode of affectedFabrics) {
          const fabricTxs = transactions.filter(t => 
            t.fabricCode === fabricCode && t.type === 'out'
          );

          if (fabricTxs.length === 0) {
            results.push({
              checkId: uuidv4(),
              type: 'fabric_usage_tracking',
              severity: 'warning',
              message: `尺码修改 ${mod.modificationNo} 影响面料 ${fabricCode} 但无对应领用记录`,
              details: {
                modificationNo: mod.modificationNo,
                sampleNo: sample.sampleNo,
                fabricCode,
                sourceRowNumber: mod.sourceRowNumber
              },
              relatedEntities: [
                { type: 'size_modification', id: mod.modificationNo },
                { type: 'sample_flow', id: sample.sampleNo }
              ],
              fixed: false,
              createdAt: dayjs().toISOString()
            });
          }
        }
      }

      if (modifications.length > 0) {
        const fabricCodes = new Set(transactions.map(t => t.fabricCode));
        
        for (const fabricCode of fabricCodes) {
          const oldFabricTxs = transactions.filter(t => 
            t.fabricCode === fabricCode && t.type === 'out'
          ).sort((a, b) => new Date(a.transactionTime).getTime() - new Date(b.transactionTime).getTime());

          const modTimes = modifications
            .map(m => new Date(m.requestedAt).getTime())
            .sort((a, b) => a - b);

          if (oldFabricTxs.length > 1 && modTimes.length > 0) {
            const firstModTime = modTimes[0];
            const beforeModTxs = oldFabricTxs.filter(t => 
              new Date(t.transactionTime).getTime() < firstModTime
            );
            const afterModTxs = oldFabricTxs.filter(t => 
              new Date(t.transactionTime).getTime() >= firstModTime
            );

            if (beforeModTxs.length > 0 && afterModTxs.length > 0) {
              results.push({
                checkId: uuidv4(),
                type: 'fabric_usage_tracking',
                severity: 'info',
                message: `样衣 ${sample.sampleNo} 面料 ${fabricCode} 在尺码修改前后均有领用，需追踪旧版面料使用情况`,
                details: {
                  sampleNo: sample.sampleNo,
                  fabricCode,
                  beforeModificationCount: beforeModTxs.length,
                  afterModificationCount: afterModTxs.length,
                  modificationCount: modifications.length,
                  modificationTimes: modifications.map(m => m.requestedAt),
                  sourceRowNumbers: {
                    sample: sample.sourceRowNumber,
                    modifications: modifications.map(m => m.sourceRowNumber)
                  }
                },
                relatedEntities: [
                  { type: 'sample_flow', id: sample.sampleNo },
                  ...modifications.map(m => ({ type: 'size_modification' as const, id: m.modificationNo }))
                ],
                fixed: false,
                createdAt: dayjs().toISOString()
              });
            }
          }
        }
      }
    }

    return results;
  }

  private async checkMissingSizeModification(options: CheckOptions): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const samples = this.sampleRepo.findMany({ where: { is_latest: 1 } }) as SampleFlowRecord[];

    for (const sample of samples) {
      if (options.sampleNos && !options.sampleNos.includes(sample.sampleNo)) continue;
      if (options.styleNos && !options.styleNos.includes(sample.styleNo)) continue;

      const modifications = this.sizeRepo.findBySampleNo(sample.sampleNo, true);
      const versions = this.sampleRepo.findBySampleNo(sample.sampleNo, false);

      if (versions.length > 1 && modifications.length === 0) {
        results.push({
          checkId: uuidv4(),
          type: 'missing_size_modification',
          severity: 'warning',
          message: `样衣 ${sample.sampleNo} 有 ${versions.length} 个版本但无尺码修改记录`,
          details: {
            sampleNo: sample.sampleNo,
            versionCount: versions.length,
            versions: versions.map(v => ({
              version: v.version,
              createdAt: v.createdAt,
              sourceRowNumber: v.sourceRowNumber
            }))
          },
          relatedEntities: [{ type: 'sample_flow', id: sample.sampleNo }],
          fixed: false,
          createdAt: dayjs().toISOString()
        });
      }
    }

    return results;
  }

  private async checkRefundMismatch(options: CheckOptions): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const refunds = this.refundRepo.findMany({ where: { is_latest: 1 } }) as RefundRecord[];

    for (const refund of refunds) {
      if (refund.relatedSampleNo) {
        if (options.sampleNos && !options.sampleNos.includes(refund.relatedSampleNo)) continue;

        const samples = this.sampleRepo.findBySampleNo(refund.relatedSampleNo, true);
        if (samples.length === 0) {
          results.push({
            checkId: uuidv4(),
            type: 'refund_mismatch',
            severity: 'error',
            message: `退款 ${refund.refundNo} 关联的样衣 ${refund.relatedSampleNo} 不存在`,
            details: {
              refundNo: refund.refundNo,
              sampleNo: refund.relatedSampleNo,
              refundAmount: refund.refundAmount,
              sourceRowNumber: refund.sourceRowNumber
            },
            relatedEntities: [{ type: 'refund', id: refund.refundNo }],
            fixed: false,
            createdAt: dayjs().toISOString()
          });
        }
      }

      if (refund.status === 'paid' && !refund.paidAt) {
        results.push({
          checkId: uuidv4(),
          type: 'refund_mismatch',
          severity: 'error',
          message: `退款 ${refund.refundNo} 状态为已支付但无支付时间`,
          details: {
            refundNo: refund.refundNo,
            status: refund.status,
            sourceRowNumber: refund.sourceRowNumber
          },
          relatedEntities: [{ type: 'refund', id: refund.refundNo }],
          fixed: false,
          createdAt: dayjs().toISOString()
        });
      }

      if (refund.status === 'approved' && !refund.approvedAt) {
        results.push({
          checkId: uuidv4(),
          type: 'refund_mismatch',
          severity: 'warning',
          message: `退款 ${refund.refundNo} 状态为已审批但无审批时间`,
          details: {
            refundNo: refund.refundNo,
            status: refund.status,
            sourceRowNumber: refund.sourceRowNumber
          },
          relatedEntities: [{ type: 'refund', id: refund.refundNo }],
          fixed: false,
          createdAt: dayjs().toISOString()
        });
      }
    }

    return results;
  }

  private async checkVersionConsistency(options: CheckOptions): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    const samples = this.sampleRepo.findMany({}) as SampleFlowRecord[];
    results.push(...this.checkEntityVersions('sample_flow', samples, s => s.sampleNo, options));

    const sizeMods = this.sizeRepo.findMany({}) as any[];
    results.push(...this.checkEntityVersions('size_modification', sizeMods, s => s.modificationNo, options));

    const fabricTxs = this.fabricTxRepo.findMany({}) as any[];
    results.push(...this.checkEntityVersions('fabric_transaction', fabricTxs, t => t.transactionNo, options));

    const refunds = this.refundRepo.findMany({}) as any[];
    results.push(...this.checkEntityVersions('refund', refunds, r => r.refundNo, options));

    return results;
  }

  private checkEntityVersions(
    entityType: string,
    entities: any[],
    getKey: (e: any) => string,
    options: CheckOptions
  ): CheckResult[] {
    const results: CheckResult[] = [];
    const grouped = new Map<string, any[]>();

    for (const entity of entities) {
      const key = getKey(entity);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(entity);
    }

    for (const [key, versions] of grouped) {
      if (versions.length > 1) {
        const latestCount = versions.filter(v => v.isLatest).length;
        
        if (latestCount !== 1) {
          results.push({
            checkId: uuidv4(),
            type: 'version_consistency',
            severity: 'error',
            message: `${entityType} ${key} 版本一致性错误: 应有1个最新版本，实际有${latestCount}个`,
            details: {
              entityType,
              entityId: key,
              versionCount: versions.length,
              latestVersionCount: latestCount,
              versions: versions.map(v => ({
                version: v.version,
                isLatest: v.isLatest,
                sourceRowNumber: v.sourceRowNumber
              }))
            },
            relatedEntities: [{ type: entityType, id: key }],
            fixed: false,
            createdAt: dayjs().toISOString()
          });
        }

        const versionNumbers = versions.map(v => v.version).sort((a, b) => a - b);
        for (let i = 1; i <= versionNumbers.length; i++) {
          if (!versionNumbers.includes(i)) {
            results.push({
              checkId: uuidv4(),
              type: 'version_consistency',
              severity: 'warning',
              message: `${entityType} ${key} 版本不连续: 缺少版本 ${i}`,
              details: {
                entityType,
                entityId: key,
                expectedVersions: versionNumbers.length,
                missingVersion: i,
                actualVersions: versionNumbers
              },
              relatedEntities: [{ type: entityType, id: key }],
              fixed: false,
              createdAt: dayjs().toISOString()
            });
          }
        }
      }
    }

    return results;
  }

  getCheckResults(includeFixed = false, severity?: CheckResult['severity']): CheckResult[] {
    if (severity) {
      return this.checkRepo.findBySeverity(severity, includeFixed);
    }
    return this.checkRepo.findAll(includeFixed);
  }

  async fixCheck(checkId: string): Promise<FixResult> {
    const check = this.checkRepo.findByCheckId(checkId);
    if (!check) {
      return { checkId, fixed: false, message: 'Check not found' };
    }

    if (check.fixed) {
      return { checkId, fixed: true, message: 'Already fixed' };
    }

    let fixed = false;
    let message = '';

    switch (check.type) {
      case 'version_consistency':
        fixed = await this.fixVersionConsistency(check);
        message = fixed ? 'Version consistency fixed' : 'Could not fix automatically';
        break;
      default:
        message = 'This check requires manual fix';
    }

    if (fixed) {
      this.checkRepo.markFixed(checkId, this.currentUser);
      this.auditRepo.log(
        this.currentUser,
        'fix',
        'check_result',
        checkId,
        undefined,
        { checkType: check.type }
      );
    }

    return { checkId, fixed, message };
  }

  private async fixVersionConsistency(check: CheckResult): Promise<boolean> {
    const { entityType, entityId } = check.details as { entityType: string; entityId: string };
    
    let repo: any;
    switch (entityType) {
      case 'sample_flow':
        repo = this.sampleRepo;
        break;
      default:
        return false;
    }

    const entities = await repo.findMany({ where: { sample_no: entityId } });
    if (entities.length === 0) return false;

    const sorted = entities.sort((a: any, b: any) => b.version - a.version);
    const latest = sorted[0];
    
    let fixed = false;
    for (const entity of entities) {
      if (entity.id !== latest.id && entity.isLatest) {
        await repo.update(entity.id, { isLatest: false }, this.currentUser);
        fixed = true;
      }
    }

    if (!latest.isLatest) {
      await repo.update(latest.id, { isLatest: true }, this.currentUser);
      fixed = true;
    }

    return fixed;
  }
}
