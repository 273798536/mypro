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

    const styleGroups = new Map<string, SampleFlowRecord[]>();
    for (const sample of samples) {
      if (!styleGroups.has(sample.styleNo)) {
        styleGroups.set(sample.styleNo, []);
      }
      styleGroups.get(sample.styleNo)!.push(sample);
    }

    for (const [styleNo, styleSamples] of styleGroups) {
      if (options.styleNos && !options.styleNos.includes(styleNo)) continue;

      const allFabricTxs: Array<{ tx: FabricTransaction; sample: SampleFlowRecord }> = [];
      const allModifications: any[] = [];

      for (const sample of styleSamples) {
        if (options.sampleNos && !options.sampleNos.includes(sample.sampleNo)) continue;

        const transactions = this.fabricTxRepo.findBySampleNo(sample.sampleNo, true);
        for (const tx of transactions) {
          allFabricTxs.push({ tx, sample });
        }

        const modifications = this.sizeRepo.findBySampleNo(sample.sampleNo, true);
        allModifications.push(...modifications);
      }

      for (const sample of styleSamples) {
        if (options.sampleNos && !options.sampleNos.includes(sample.sampleNo)) continue;

        const sampleTxs = this.fabricTxRepo.findBySampleNo(sample.sampleNo, true);

        if (sampleTxs.length === 0 && sample.status !== 'draft') {
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
            const fabricTxs = sampleTxs.filter(t => 
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
      }

      if (styleSamples.length > 1 && allModifications.length > 0 && allFabricTxs.length > 0) {
        const fabricGroups = new Map<string, Array<{ tx: FabricTransaction; sample: SampleFlowRecord }>>();
        for (const item of allFabricTxs) {
          if (item.tx.type !== 'out') continue;
          if (!fabricGroups.has(item.tx.fabricCode)) {
            fabricGroups.set(item.tx.fabricCode, []);
          }
          fabricGroups.get(item.tx.fabricCode)!.push(item);
        }

        const modTimes = allModifications
          .map(m => new Date(m.requestedAt).getTime())
          .sort((a, b) => a - b);
        const firstModTime = modTimes[0];

        for (const [fabricCode, fabricItems] of fabricGroups) {
          const sampleNos = new Set(fabricItems.map(i => i.sample.sampleNo));
          
          if (sampleNos.size >= 2) {
            const beforeModItems = fabricItems.filter(item => 
              new Date(item.tx.transactionTime).getTime() < firstModTime
            );
            const afterModItems = fabricItems.filter(item => 
              new Date(item.tx.transactionTime).getTime() >= firstModTime
            );

            const beforeSamples = new Set(beforeModItems.map(i => i.sample.sampleNo));
            const afterSamples = new Set(afterModItems.map(i => i.sample.sampleNo));

            const continuedSamples = [...beforeSamples].filter(s => afterSamples.has(s));
            const newSamples = [...afterSamples].filter(s => !beforeSamples.has(s));

            if (newSamples.length > 0 || continuedSamples.length > 0) {
              results.push({
                checkId: uuidv4(),
                type: 'fabric_usage_tracking',
                severity: 'warning',
                message: `款号 ${styleNo} 面料 ${fabricCode} 在多轮修改后仍被继续领用：${continuedSamples.length > 0 ? `样衣 ${continuedSamples.join('、')} 持续领用` : ''}${continuedSamples.length > 0 && newSamples.length > 0 ? '，' : ''}${newSamples.length > 0 ? `样衣 ${newSamples.join('、')} 新增领用` : ''}`,
                details: {
                  styleNo,
                  fabricCode,
                  totalSampleCount: sampleNos.size,
                  sampleNos: [...sampleNos],
                  continuedSampleNos: continuedSamples,
                  newSampleNos: newSamples,
                  beforeModificationCount: beforeModItems.length,
                  afterModificationCount: afterModItems.length,
                  modificationCount: allModifications.length,
                  firstModificationTime: allModifications.find(m => 
                    new Date(m.requestedAt).getTime() === firstModTime
                  )?.requestedAt,
                  sourceRowNumbers: {
                    samples: fabricItems.map(i => ({ 
                      sampleNo: i.sample.sampleNo, 
                      sourceRowNumber: i.sample.sourceRowNumber 
                    })),
                    transactions: fabricItems.map(i => ({
                      txNo: i.tx.transactionNo,
                      sourceRowNumber: i.tx.sourceRowNumber
                    })),
                    modifications: allModifications.map(m => m.sourceRowNumber)
                  }
                },
                relatedEntities: [
                  ...styleSamples.map(s => ({ type: 'sample_flow' as const, id: s.sampleNo })),
                  ...allModifications.map(m => ({ type: 'size_modification' as const, id: m.modificationNo }))
                ],
                fixed: false,
                createdAt: dayjs().toISOString()
              });
            }
          }

          if (fabricItems.length >= 2) {
            const sampleTxsMap = new Map<string, FabricTransaction[]>();
            for (const item of fabricItems) {
              if (!sampleTxsMap.has(item.sample.sampleNo)) {
                sampleTxsMap.set(item.sample.sampleNo, []);
              }
              sampleTxsMap.get(item.sample.sampleNo)!.push(item.tx);
            }

            const txTimes = [...sampleTxsMap.entries()].map(([sampleNo, txs]) => ({
              sampleNo,
              firstTxTime: Math.min(...txs.map(t => new Date(t.transactionTime).getTime()))
            })).sort((a, b) => a.firstTxTime - b.firstTxTime);

            if (txTimes.length >= 2) {
              const sampleVersions = new Map<string, number>();
              for (const sample of styleSamples) {
                const allVersions = this.sampleRepo.findBySampleNo(sample.sampleNo, false);
                sampleVersions.set(sample.sampleNo, allVersions.length);
              }

              const multiVersionSamples = [...sampleVersions.entries()]
                .filter(([, v]) => v >= 2)
                .map(([k]) => k);

              if (multiVersionSamples.length >= 1 && sampleTxsMap.size >= 2) {
                const modifiedSamples = new Set(
                  allModifications.map(m => m.sampleNo)
                );
                const unmodifiedSamples = [...sampleTxsMap.keys()]
                  .filter(s => !modifiedSamples.has(s));

                if (unmodifiedSamples.length > 0) {
                  results.push({
                    checkId: uuidv4(),
                    type: 'fabric_usage_tracking',
                    severity: 'info',
                    message: `款号 ${styleNo} 面料 ${fabricCode} 多版本样衣追踪：样衣 ${multiVersionSamples.join('、')} 有版本变更，样衣 ${unmodifiedSamples.join('、')} 仍领用同款面料`,
                    details: {
                      styleNo,
                      fabricCode,
                      multiVersionSamples,
                      unmodifiedSamples,
                      modificationCount: allModifications.length,
                      sourceRowNumbers: {
                        samples: fabricItems.map(i => ({ 
                          sampleNo: i.sample.sampleNo, 
                          sourceRowNumber: i.sample.sourceRowNumber,
                          versionCount: sampleVersions.get(i.sample.sampleNo) || 1
                        })),
                        transactions: fabricItems.map(i => ({
                          txNo: i.tx.transactionNo,
                          sourceRowNumber: i.tx.sourceRowNumber
                        }))
                      }
                    },
                    relatedEntities: [
                      ...styleSamples.map(s => ({ type: 'sample_flow' as const, id: s.sampleNo }))
                    ],
                    fixed: false,
                    createdAt: dayjs().toISOString()
                  });
                }
              }
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
