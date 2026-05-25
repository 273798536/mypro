import { v4 as uuidv4 } from 'uuid';
import { getRepository } from '../config/database';
import {
  Declaration,
  TrajectoryNode,
  TaxNotice,
  SupervisorComment,
  ReconciliationResult,
  ReconciliationStatus,
  MismatchType,
  BadDataRecord,
  BadDataType,
  BadDataStatus
} from '../entities';

export interface ReconciliationOptions {
  batchNo?: string;
  declarationIds?: string[];
  packageNos?: string[];
  strictMode?: boolean;
}

export interface ReconciliationStats {
  total: number;
  matched: number;
  mismatched: number;
  partialMatch: number;
  pendingReview: number;
  badData: number;
}

export class ReconciliationService {
  private batchNo: string;

  constructor(options?: ReconciliationOptions) {
    this.batchNo = options?.batchNo || `RECON-${Date.now()}-${uuidv4().slice(0, 8)}`;
  }

  async runReconciliation(options?: ReconciliationOptions): Promise<ReconciliationStats> {
    const declarationRepo = getRepository(Declaration);
    const resultRepo = getRepository(ReconciliationResult);
    
    let declarations: Declaration[];
    
    if (options?.declarationIds?.length) {
      declarations = await declarationRepo.findByIds(options.declarationIds) as Declaration[];
    } else if (options?.packageNos?.length) {
      declarations = await declarationRepo.createQueryBuilder('d')
        .where('d.packageNo IN (:...packageNos)', { packageNos: options.packageNos })
        .getMany() as Declaration[];
    } else {
      declarations = await declarationRepo.find() as Declaration[];
    }

    const stats: ReconciliationStats = {
      total: declarations.length,
      matched: 0,
      mismatched: 0,
      partialMatch: 0,
      pendingReview: 0,
      badData: 0
    };

    for (const declaration of declarations) {
      const result = await this.reconcileSingleDeclaration(declaration, options?.strictMode);
      
      if (result.status === ReconciliationStatus.MATCHED) {
        stats.matched++;
      } else if (result.status === ReconciliationStatus.MISMATCHED) {
        stats.mismatched++;
      } else if (result.status === ReconciliationStatus.PARTIAL_MATCH) {
        stats.partialMatch++;
      } else if (result.status === ReconciliationStatus.PENDING_REVIEW) {
        stats.pendingReview++;
      }

      await resultRepo.save(result);
    }

    return stats;
  }

  private async reconcileSingleDeclaration(
    declaration: Declaration,
    strictMode = false
  ): Promise<ReconciliationResult> {
    const trajectoryRepo = getRepository(TrajectoryNode);
    const taxRepo = getRepository(TaxNotice);
    const commentRepo = getRepository(SupervisorComment);
    
    const trajectoryNodes = await trajectoryRepo.find({
      where: { declarationId: declaration.id },
      order: { occurredAt: 'ASC' }
    });
    
    const taxNotices = await taxRepo.find({
      where: { declarationId: declaration.id }
    });
    
    const supervisorComments = await commentRepo.find({
      where: { declarationId: declaration.id },
      order: { createdAt: 'DESC' }
    });

    const mismatches: MismatchType[] = [];
    const mismatchDetails: Record<string, any> = {};

    if (!declaration.hasAttachment) {
      mismatches.push(MismatchType.MISSING_ATTACHMENT);
      mismatchDetails.missingAttachment = {
        declarationNo: declaration.declarationNo,
        packageNo: declaration.packageNo
      };
    }

    const abnormalNodes = trajectoryNodes.filter(n => n.isAbnormal);
    if (abnormalNodes.length > 0) {
      mismatchDetails.abnormalTrajectory = abnormalNodes.map(n => ({
        nodeId: n.id,
        nodeType: n.nodeType,
        reason: n.abnormalReason
      }));
    }

    const splitPackages = trajectoryNodes.filter(n => n.parentPackageNo);
    const hasSplitPackages = splitPackages.length > 0;
    
    if (hasSplitPackages) {
      mismatches.push(MismatchType.PACKAGE_SPLIT);
      mismatchDetails.packageSplit = {
        originalPackageNo: declaration.packageNo,
        splitCount: splitPackages.length,
        childPackages: splitPackages.map(n => ({
          packageNo: n.parentPackageNo ? declaration.packageNo + '-SPLIT-' + n.id.slice(0, 6) : '',
          nodeId: n.id
        }))
      };

      const expectedTax = this.calculateExpectedTax(declaration);
      const actualTax = taxNotices.reduce((sum, t) => sum + Number(t.taxAmount), 0);
      const taxDiff = actualTax - expectedTax;

      if (Math.abs(taxDiff) > 0.01) {
        mismatches.push(MismatchType.TAX_AMOUNT);
        mismatchDetails.taxMismatch = {
          expected: expectedTax,
          actual: actualTax,
          difference: taxDiff
        };
      }
    }

    const hasManualOverride = supervisorComments.some(c => c.isManualOverride);
    if (hasManualOverride && strictMode) {
      mismatches.push(MismatchType.STATUS_CONFLICT);
      mismatchDetails.manualOverride = supervisorComments
        .filter(c => c.isManualOverride)
        .map(c => ({
          commentId: c.id,
          decision: c.decision,
          reason: c.overrideReason
        }));
    }

    const relatedPackageNos = splitPackages.map(n => 
      n.parentPackageNo ? declaration.packageNo + '-SPLIT-' + n.id.slice(0, 6) : ''
    ).filter(Boolean);

    let status: ReconciliationStatus;
    if (mismatches.length === 0) {
      status = ReconciliationStatus.MATCHED;
    } else if (hasManualOverride) {
      status = ReconciliationStatus.PENDING_REVIEW;
    } else if (mismatches.some(m => 
      m === MismatchType.TAX_AMOUNT || 
      m === MismatchType.PACKAGE_SPLIT
    )) {
      status = ReconciliationStatus.MISMATCHED;
    } else {
      status = ReconciliationStatus.PARTIAL_MATCH;
    }

    const expectedTax = this.calculateExpectedTax(declaration);
    const actualTax = taxNotices.reduce((sum, t) => sum + Number(t.taxAmount), 0);

    return {
      id: uuidv4(),
      declarationId: declaration.id,
      packageNo: declaration.packageNo,
      status,
      mismatchTypes: mismatches,
      mismatchDetails,
      expectedTaxAmount: expectedTax,
      actualTaxAmount: actualTax,
      taxDifference: actualTax - expectedTax,
      hasSplitPackages,
      relatedPackageNos,
      playbackChain: {
        declaration: this.sanitizeForPlayback(declaration),
        trajectoryNodes: trajectoryNodes.map(n => this.sanitizeForPlayback(n)),
        taxNotices: taxNotices.map(t => this.sanitizeForPlayback(t)),
        supervisorComments: supervisorComments.map(c => this.sanitizeForPlayback(c))
      },
      batchNo: this.batchNo,
      createdAt: new Date()
    } as ReconciliationResult;
  }

  private calculateExpectedTax(declaration: Declaration): number {
    const value = Number(declaration.declaredValue);
    const dutyRate = 0.08;
    const vatRate = 0.13;
    
    const duty = value * dutyRate;
    const vat = (value + duty) * vatRate;
    
    return Math.round((duty + vat) * 100) / 100;
  }

  private sanitizeForPlayback(obj: any): any {
    const result = { ...obj };
    delete result.declaration;
    return result;
  }

  async getPlaybackChain(declarationId: string): Promise<any> {
    const resultRepo = getRepository(ReconciliationResult);
    const result = await resultRepo.findOne({
      where: { declarationId },
      order: { createdAt: 'DESC' }
    });

    if (result?.playbackChain) {
      return result.playbackChain;
    }

    const declarationRepo = getRepository(Declaration);
    const trajectoryRepo = getRepository(TrajectoryNode);
    const taxRepo = getRepository(TaxNotice);
    const commentRepo = getRepository(SupervisorComment);

    const declaration = await declarationRepo.findOne({ where: { id: declarationId } });
    if (!declaration) {
      return null;
    }

    const trajectoryNodes = await trajectoryRepo.find({
      where: { declarationId },
      order: { occurredAt: 'ASC' }
    });
    
    const taxNotices = await taxRepo.find({ where: { declarationId } });
    const supervisorComments = await commentRepo.find({
      where: { declarationId },
      order: { createdAt: 'DESC' }
    });

    return {
      declaration: this.sanitizeForPlayback(declaration),
      trajectoryNodes: trajectoryNodes.map(n => this.sanitizeForPlayback(n)),
      taxNotices: taxNotices.map(t => this.sanitizeForPlayback(t)),
      supervisorComments: supervisorComments.map(c => this.sanitizeForPlayback(c))
    };
  }
}

export const reconciliationService = new ReconciliationService();
