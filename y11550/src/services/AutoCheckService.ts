import { Repository, EntityManager } from 'typeorm';
import { Receipt, StockSnapshot, RefundRecord, FailedRecord, AuditLog, ExceptionRecord } from '../entities';
import { DataSource, ExceptionType, ReceiptStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface CheckResult {
  checkName: string;
  passed: boolean;
  issues: Array<{
    level: 'error' | 'warning' | 'info';
    message: string;
    details?: any;
  }>;
  timestamp: Date;
}

export class AutoCheckService {
  private receiptRepository: Repository<Receipt>;
  private stockSnapshotRepository: Repository<StockSnapshot>;
  private refundRecordRepository: Repository<RefundRecord>;
  private failedRecordRepository: Repository<FailedRecord>;
  private auditLogRepository: Repository<AuditLog>;
  private exceptionRepository: Repository<ExceptionRecord>;
  private entityManager: EntityManager;

  constructor(
    receiptRepository: Repository<Receipt>,
    stockSnapshotRepository: Repository<StockSnapshot>,
    refundRecordRepository: Repository<RefundRecord>,
    failedRecordRepository: Repository<FailedRecord>,
    auditLogRepository: Repository<AuditLog>,
    exceptionRepository: Repository<ExceptionRecord>,
    entityManager: EntityManager
  ) {
    this.receiptRepository = receiptRepository;
    this.stockSnapshotRepository = stockSnapshotRepository;
    this.refundRecordRepository = refundRecordRepository;
    this.failedRecordRepository = failedRecordRepository;
    this.auditLogRepository = auditLogRepository;
    this.exceptionRepository = exceptionRepository;
    this.entityManager = entityManager;
  }

  async runAllChecks(): Promise<CheckResult[]> {
    return Promise.all([
      this.checkDuplicateImports(),
      this.checkExceptionRetention(),
      this.checkDataConsistency(),
      this.checkStockOverflow(),
      this.checkHistoryIntegrity()
    ]);
  }

  async checkDuplicateImports(): Promise<CheckResult> {
    const issues: CheckResult['issues'] = [];

    const duplicateBatchNos = await this.receiptRepository
      .createQueryBuilder('r')
      .select('r.batchNo')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.batchNo')
      .having('COUNT(*) > 1')
      .getRawMany();

    if (duplicateBatchNos.length > 0) {
      issues.push({
        level: 'error',
        message: `发现 ${duplicateBatchNos.length} 个重复批次号`,
        details: duplicateBatchNos
      });
    }

    const duplicateRefunds = await this.refundRecordRepository
      .createQueryBuilder('r')
      .select('r.refundNo')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.refundNo')
      .having('COUNT(*) > 1')
      .getRawMany();

    if (duplicateRefunds.length > 0) {
      issues.push({
        level: 'warning',
        message: `发现 ${duplicateRefunds.length} 个重复退款记录`,
        details: duplicateRefunds
      });
    }

    return {
      checkName: '重复导入检查',
      passed: issues.length === 0,
      issues,
      timestamp: new Date()
    };
  }

  async checkExceptionRetention(): Promise<CheckResult> {
    const issues: CheckResult['issues'] = [];

    const lostExceptions = await this.exceptionRepository.find({
      where: { isRetained: false }
    });

    if (lostExceptions.length > 0) {
      issues.push({
        level: 'error',
        message: `发现 ${lostExceptions.length} 条异常记录未被保留`,
        details: lostExceptions.map(e => ({ id: e.id, type: e.type }))
      });
    }

    const unresolvedAffecting = await this.exceptionRepository.find({
      where: { affectsSummary: true, resolved: false }
    });

    if (unresolvedAffecting.length > 0) {
      issues.push({
        level: 'warning',
        message: `有 ${unresolvedAffecting.length} 条影响汇总的异常未解决`,
        details: unresolvedAffecting.length
      });
    }

    return {
      checkName: '异常保留检查',
      passed: issues.filter(i => i.level === 'error').length === 0,
      issues,
      timestamp: new Date()
    };
  }

  async checkDataConsistency(): Promise<CheckResult> {
    const issues: CheckResult['issues'] = [];

    const receipts = await this.receiptRepository.find({
      relations: ['stockSnapshots']
    });

    for (const receipt of receipts) {
      const calculatedStockBefore = receipt.stockSnapshots?.reduce((sum, s) => sum + s.beforeStock, 0) || 0;
      const calculatedRestock = receipt.stockSnapshots?.reduce((sum, s) => sum + s.restockAmount, 0) || 0;
      const calculatedStockAfter = receipt.stockSnapshots?.reduce((sum, s) => sum + s.afterStock, 0) || 0;

      if (Math.abs(calculatedStockBefore - receipt.totalStockBefore) > 0.01) {
        issues.push({
          level: 'error',
          message: `回执 ${receipt.batchNo} 补货前库存不一致`,
          details: { stored: receipt.totalStockBefore, calculated: calculatedStockBefore }
        });
      }

      if (Math.abs(calculatedRestock - receipt.totalRestockAmount) > 0.01) {
        issues.push({
          level: 'error',
          message: `回执 ${receipt.batchNo} 补货数量不一致`,
          details: { stored: receipt.totalRestockAmount, calculated: calculatedRestock }
        });
      }

      if (Math.abs(calculatedStockAfter - receipt.totalStockAfter) > 0.01) {
        issues.push({
          level: 'error',
          message: `回执 ${receipt.batchNo} 补货后库存不一致`,
          details: { stored: receipt.totalStockAfter, calculated: calculatedStockAfter }
        });
      }
    }

    return {
      checkName: '数据一致性检查',
      passed: issues.length === 0,
      issues,
      timestamp: new Date()
    };
  }

  async checkStockOverflow(): Promise<CheckResult> {
    const issues: CheckResult['issues'] = [];

    const overflowSnapshots = await this.stockSnapshotRepository
      .createQueryBuilder('s')
      .where('s.afterStock > 100')
      .andWhere('s.isHotSlot = :isHot', { isHot: true })
      .getMany();

    if (overflowSnapshots.length > 0) {
      const cabinetGroups = overflowSnapshots.reduce((acc, s) => {
        acc[s.cabinetId] = (acc[s.cabinetId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      issues.push({
        level: 'warning',
        message: `发现 ${overflowSnapshots.length} 个热销格口显示满仓(>100)`,
        details: cabinetGroups
      });
    }

    return {
      checkName: '热销格口满仓检查',
      passed: issues.length === 0,
      issues,
      timestamp: new Date()
    };
  }

  async checkHistoryIntegrity(): Promise<CheckResult> {
    const issues: CheckResult['issues'] = [];

    const receipts = await this.receiptRepository.find();

    for (const receipt of receipts) {
      const auditLogs = await this.auditLogRepository.find({
        where: { receiptId: receipt.id },
        order: { timestamp: 'ASC' }
      });

      if (auditLogs.length === 0) {
        issues.push({
          level: 'warning',
          message: `回执 ${receipt.batchNo} 没有审计日志`,
          details: { receiptId: receipt.id }
        });
        continue;
      }

      const createLog = auditLogs.find(l => l.action === 'create');
      if (!createLog) {
        issues.push({
          level: 'warning',
          message: `回执 ${receipt.batchNo} 缺少创建日志`,
          details: { receiptId: receipt.id }
        });
      }

      if (receipt.statusChangedAt && receipt.previousStatus) {
        const statusChangeLogs = auditLogs.filter(l => l.newStatus !== undefined);
        const lastStatusChange = statusChangeLogs[statusChangeLogs.length - 1];
        
        if (lastStatusChange && lastStatusChange.newStatus !== receipt.status) {
          issues.push({
            level: 'error',
            message: `回执 ${receipt.batchNo} 状态与审计日志不一致`,
            details: {
              currentStatus: receipt.status,
              lastLoggedStatus: lastStatusChange.newStatus
            }
          });
        }
      }
    }

    return {
      checkName: '历史记录完整性检查',
      passed: issues.filter(i => i.level === 'error').length === 0,
      issues,
      timestamp: new Date()
    };
  }

  async checkPermissionInterceptor(
    userId: string,
    userRole: string,
    action: string,
    resourceId?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const rolePermissions: Record<string, string[]> = {
      operator: ['create', 'read', 'update_draft', 'add_attachment'],
      reviewer: ['read', 'review', 'reject'],
      supervisor: ['read', 'review', 'reject', 'freeze', 'settle'],
      admin: ['*']
    };

    const permissions = rolePermissions[userRole] || [];
    
    if (permissions.includes('*')) {
      return { allowed: true };
    }

    if (permissions.includes(action)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `角色 ${userRole} 没有权限执行 ${action} 操作`
    };
  }

  async recordFailedImport(
    source: DataSource,
    errorType: string,
    errorMessage: string,
    rawData: Record<string, any>,
    batchNo?: string,
    importedBy?: string,
    validationErrors?: Record<string, any>[]
  ): Promise<FailedRecord> {
    const failedRecord = this.failedRecordRepository.create({
      id: uuidv4(),
      batchNo,
      source,
      errorType,
      errorMessage,
      rawData,
      validationErrors,
      importedBy,
      createdAt: new Date()
    });

    return this.failedRecordRepository.save(failedRecord);
  }

  async verifyExportConsistency(receiptId: string, exportHash: string): Promise<boolean> {
    const receipt = await this.receiptRepository.findOne({
      where: { id: receiptId },
      relations: ['stockSnapshots', 'exceptions']
    });

    if (!receipt) return false;

    const crypto = require('crypto');
    const currentHash = crypto.createHash('sha256');
    currentHash.update(JSON.stringify({
      id: receipt.id,
      batchNo: receipt.batchNo,
      status: receipt.status,
      isFrozen: receipt.isFrozen,
      totalStockBefore: receipt.totalStockBefore,
      totalRestockAmount: receipt.totalRestockAmount,
      totalStockAfter: receipt.totalStockAfter,
      exceptionCount: receipt.exceptionCount,
      stockSnapshots: receipt.stockSnapshots?.map(s => ({
        slotId: s.slotId,
        afterStock: s.afterStock
      }))
    }));

    const currentHashStr = currentHash.digest('hex');

    return currentHashStr === exportHash;
  }
}
