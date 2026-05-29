import { z } from 'zod';
import {
  MemberAccount,
  MileageTransaction,
  ExchangeOrder,
  ExpireCalendar,
  LiabilityRecord,
  BadRecord,
  EstimateDetail,
  TraceNode,
  AccountType,
  Activity,
  BusinessCategory,
  SourceType,
  ErrorType,
  ValidationResult,
} from '@/types';
import { generateId, isDateExpired, formatDate, formatDateTime } from '@/utils/date';

const MemberAccountSchema = z.object({
  memberNo: z.string().min(1, '会员号不能为空'),
  memberName: z.string().min(1, '会员姓名不能为空'),
  accountType: z.enum(['普通', '银卡', '金卡', '白金卡']),
  totalMiles: z.number().int().min(0, '累计里程不能为负'),
  usedMiles: z.number().int().min(0, '已兑换里程不能为负'),
  remainingMiles: z.number().int().min(0, '剩余里程不能为负'),
  expireDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式错误'),
  lastTransactionDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式错误'),
}).refine(
  (data) => data.totalMiles >= data.usedMiles,
  { message: '已兑换里程不能大于累计里程', path: ['usedMiles'] }
).refine(
  (data) => data.remainingMiles === data.totalMiles - data.usedMiles,
  { message: '剩余里程计算错误', path: ['remainingMiles'] }
);

const MileageTransactionSchema = z.object({
  memberNo: z.string().min(1, '会员号不能为空'),
  transactionType: z.enum(['累积', '兑换', '过期', '退回', '调整']),
  businessType: z.enum(['正常', '升舱', '活动赠送', '系统调整']),
  miles: z.number().int(),
  transactionDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式错误'),
  description: z.string().min(1, '交易描述不能为空'),
  operator: z.string().min(1, '操作人不能为空'),
  status: z.enum(['待处理', '已完成', '已取消']),
});

const ExchangeOrderSchema = z.object({
  orderNo: z.string().min(1, '订单号不能为空'),
  memberNo: z.string().min(1, '会员号不能为空'),
  exchangeType: z.enum(['机票', '升舱', '礼品', '积分']),
  miles: z.number().int().positive('兑换里程必须为正数'),
  amount: z.number().min(0, '兑付金额不能为负'),
  applyDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式错误'),
  status: z.enum(['待审核', '已审核', '已兑付', '已退回']),
});

const ExpireCalendarSchema = z.object({
  memberNo: z.string().min(1, '会员号不能为空'),
  batchNo: z.string().min(1, '批次号不能为空'),
  expireDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式错误'),
  milesToExpire: z.number().int().min(0, '应过期里程不能为负'),
  actualExpiredMiles: z.number().int().min(0, '实际过期里程不能为负'),
  isExpired: z.boolean(),
  expireReason: z.string().min(1, '过期原因不能为空'),
  processStatus: z.enum(['未处理', '已冲回', '已豁免']),
}).refine(
  (data) => data.actualExpiredMiles <= data.milesToExpire,
  { message: '实际过期里程不能大于应过期里程', path: ['actualExpiredMiles'] }
);

export class DataValidator {
  private detectEmptyRow(row: any): boolean {
    if (!row || typeof row !== 'object') return true;
    const values = Object.values(row);
    return values.length === 0 || values.every(v => v === null || v === undefined || v === '');
  }

  private detectMissingColumns(row: any, requiredColumns: string[]): string[] {
    const missing: string[] = [];
    requiredColumns.forEach(col => {
      if (row[col] === undefined || row[col] === null || row[col] === '') {
        missing.push(col);
      }
    });
    return missing;
  }

  private detectFormatErrors<T>(row: any, schema: z.ZodSchema<T>): z.ZodIssue[] {
    const result = schema.safeParse(row);
    if (!result.success) {
      return result.error.issues;
    }
    return [];
  }

  private detectDataAnomalies(row: any, sourceType: SourceType): string[] {
    const anomalies: string[] = [];
    
    if (sourceType === '会员账户') {
      if (row.totalMiles !== undefined && row.usedMiles !== undefined) {
        if (Number(row.usedMiles) > Number(row.totalMiles)) {
          anomalies.push('已使用里程大于累计里程');
        }
      }
      if (row.expireDate && row.lastTransactionDate) {
        if (new Date(row.expireDate) < new Date(row.lastTransactionDate)) {
          anomalies.push('过期日期早于最后交易日期');
        }
      }
    }
    
    if (sourceType === '里程流水') {
      if (row.expireDate && row.transactionDate) {
        if (new Date(row.expireDate) < new Date(row.transactionDate)) {
          anomalies.push('过期日期早于交易日期');
        }
      }
    }
    
    if (sourceType === '兑换订单') {
      if (row.miles !== undefined && Number(row.miles) <= 0) {
        anomalies.push('兑换里程为非正数');
      }
    }
    
    if (sourceType === '过期日历') {
      if (row.actualExpiredMiles !== undefined && row.milesToExpire !== undefined) {
        if (Number(row.actualExpiredMiles) > Number(row.milesToExpire)) {
          anomalies.push('实际过期里程大于应过期里程');
        }
      }
    }
    
    return anomalies;
  }

  private createBadRecord(
    row: any,
    sourceType: SourceType,
    sourceFile: string,
    rowNumber: number,
    errorType: ErrorType,
    errorDescription: string,
    batchNo: string
  ): BadRecord {
    const suggestionMap: Record<ErrorType, string> = {
      '空行': '删除空行或补充完整数据',
      '缺列': '补充缺失的关键字段后重新导入',
      '格式错误': '修正字段格式后重新导入',
      '数据异常': '核对数据逻辑关系，修正后重新导入',
    };

    return {
      id: generateId('BAD'),
      sourceType,
      sourceFile,
      rowNumber,
      errorType,
      errorDescription,
      originalData: { ...row },
      repairSuggestion: suggestionMap[errorType],
      isProcessed: false,
      importBatchNo: batchNo,
      createTime: formatDateTime(new Date()),
    };
  }

  private validateRows<T>(
    rows: any[],
    sourceType: SourceType,
    sourceFile: string,
    batchNo: string,
    schema: z.ZodSchema<T>,
    requiredColumns: string[]
  ): ValidationResult<T> {
    const validData: T[] = [];
    const badRecords: BadRecord[] = [];
    const errorTypeCount: Record<string, number> = {
      '空行': 0,
      '缺列': 0,
      '格式错误': 0,
      '数据异常': 0,
    };

    rows.forEach((row, index) => {
      const rowNumber = index + 1;

      if (this.detectEmptyRow(row)) {
        badRecords.push(this.createBadRecord(
          row, sourceType, sourceFile, rowNumber, '空行', '整行数据为空', batchNo
        ));
        errorTypeCount['空行']++;
        return;
      }

      const missingColumns = this.detectMissingColumns(row, requiredColumns);
      if (missingColumns.length > 0) {
        badRecords.push(this.createBadRecord(
          row, sourceType, sourceFile, rowNumber, '缺列',
          `缺少关键字段: ${missingColumns.join(', ')}`, batchNo
        ));
        errorTypeCount['缺列']++;
        return;
      }

      const formatErrors = this.detectFormatErrors(row, schema);
      if (formatErrors.length > 0) {
        badRecords.push(this.createBadRecord(
          row, sourceType, sourceFile, rowNumber, '格式错误',
          formatErrors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '), batchNo
        ));
        errorTypeCount['格式错误']++;
        return;
      }

      const anomalies = this.detectDataAnomalies(row, sourceType);
      if (anomalies.length > 0) {
        badRecords.push(this.createBadRecord(
          row, sourceType, sourceFile, rowNumber, '数据异常',
          anomalies.join('; '), batchNo
        ));
        errorTypeCount['数据异常']++;
        return;
      }

      validData.push(row as T);
    });

    return {
      valid: badRecords.length === 0,
      data: validData,
      badRecords,
      stats: {
        totalRows: rows.length,
        validRows: validData.length,
        badRows: badRecords.length,
        errorTypeCount,
      },
    };
  }

  validateMemberAccount(rows: any[], sourceFile: string, batchNo: string): ValidationResult<any> {
    const requiredColumns = ['memberNo', 'memberName', 'accountType', 'totalMiles', 'usedMiles', 'remainingMiles', 'expireDate', 'lastTransactionDate'];
    return this.validateRows(rows, '会员账户', sourceFile, batchNo, MemberAccountSchema, requiredColumns);
  }

  validateMileageTransaction(rows: any[], sourceFile: string, batchNo: string): ValidationResult<any> {
    const requiredColumns = ['memberNo', 'transactionType', 'businessType', 'miles', 'transactionDate', 'description', 'operator', 'status'];
    return this.validateRows(rows, '里程流水', sourceFile, batchNo, MileageTransactionSchema, requiredColumns);
  }

  validateExchangeOrder(rows: any[], sourceFile: string, batchNo: string): ValidationResult<any> {
    const requiredColumns = ['orderNo', 'memberNo', 'exchangeType', 'miles', 'amount', 'applyDate', 'status'];
    return this.validateRows(rows, '兑换订单', sourceFile, batchNo, ExchangeOrderSchema, requiredColumns);
  }

  validateExpireCalendar(rows: any[], sourceFile: string, batchNo: string): ValidationResult<any> {
    const requiredColumns = ['memberNo', 'batchNo', 'expireDate', 'milesToExpire', 'actualExpiredMiles', 'isExpired', 'expireReason', 'processStatus'];
    return this.validateRows(rows, '过期日历', sourceFile, batchNo, ExpireCalendarSchema, requiredColumns);
  }
}

export class BusinessRuleEngine {
  private coefficientMap: Record<AccountType, number> = {
    '普通': 0.08,
    '银卡': 0.1,
    '金卡': 0.12,
    '白金卡': 0.15,
  };

  private probabilityMap: Record<AccountType, number> = {
    '普通': 0.4,
    '银卡': 0.6,
    '金卡': 0.75,
    '白金卡': 0.9,
  };

  isUpgradeRefund(transaction: MileageTransaction): boolean {
    if (transaction.businessType === '升舱' && transaction.transactionType === '退回') {
      return true;
    }
    if (transaction.remark?.includes('升舱退回') || transaction.description.includes('升舱退回')) {
      return true;
    }
    return false;
  }

  isActivityDoublePoints(transaction: MileageTransaction, activities: Activity[]): boolean {
    if (transaction.businessType !== '活动赠送') return false;
    
    const transDate = new Date(transaction.transactionDate);
    const isInActivityPeriod = activities.some(activity => {
      const start = new Date(activity.startDate);
      const end = new Date(activity.endDate);
      return transDate >= start && transDate <= end && activity.multiplier === 2;
    });
    
    const hasDoubleKeyword = transaction.description.includes('双倍') || 
                            transaction.description.includes('活动') ||
                            transaction.description.includes('赠送');
    
    return isInActivityPeriod && hasDoubleKeyword;
  }

  isMileageExpired(account: MemberAccount, expireCalendar?: ExpireCalendar): boolean {
    if (expireCalendar?.isExpired) return true;
    return isDateExpired(account.expireDate) && account.remainingMiles > 0;
  }

  classifyBusinessCategory(
    account: MemberAccount,
    latestTransaction: MileageTransaction | null,
    expireCalendar: ExpireCalendar[] | null,
    activities: Activity[]
  ): { category: BusinessCategory; isExpired: boolean } {
    const hasExpireRecord = expireCalendar?.some(e => e.isExpired) || false;
    
    if (this.isMileageExpired(account, expireCalendar?.find(e => e.isExpired)) || hasExpireRecord) {
      return { category: '里程过期', isExpired: true };
    }
    
    if (latestTransaction && this.isUpgradeRefund(latestTransaction)) {
      return { category: '升舱退回', isExpired: false };
    }
    
    if (latestTransaction && this.isActivityDoublePoints(latestTransaction, activities)) {
      return { category: '活动双倍', isExpired: false };
    }
    
    return { category: '正常', isExpired: false };
  }

  calculateEstimatedLiability(remainingMiles: number, accountType: AccountType): EstimateDetail {
    const liabilityCoefficient = this.coefficientMap[accountType];
    const probabilityCoefficient = this.probabilityMap[accountType];
    const estimatedLiability = remainingMiles * liabilityCoefficient * probabilityCoefficient;

    return {
      formula: '剩余里程 × 单位里程负债系数 × 兑换概率系数',
      parameters: {
        remainingMiles,
        liabilityCoefficient,
        probabilityCoefficient,
      },
      calculationProcess: `${remainingMiles.toLocaleString()} × ${liabilityCoefficient} × ${probabilityCoefficient} = ${estimatedLiability.toFixed(2)}`,
      calculator: '系统自动估算',
      calculateTime: formatDateTime(new Date()),
    };
  }

  generateTraceChain(record: LiabilityRecord): TraceNode[] {
    const nodes: TraceNode[] = [];

    nodes.push({
      id: generateId('TRACE'),
      type: 'estimate',
      title: '负债估算',
      description: `估算负债 ${record.estimatedLiability.toFixed(2)} 元`,
      time: record.estimateDetail.calculateTime,
      operator: record.estimateDetail.calculator,
      status: 'normal',
      data: {
        formula: record.estimateDetail.formula,
        parameters: record.estimateDetail.parameters,
        calculationProcess: record.estimateDetail.calculationProcess,
        estimatedLiability: record.estimatedLiability,
      },
    });

    if (record.exchangeOrders.length > 0) {
      record.exchangeOrders.forEach((order, index) => {
        const statusMap: Record<string, 'normal' | 'warning' | 'error'> = {
          '待审核': 'warning',
          '已审核': 'normal',
          '已兑付': 'normal',
          '已退回': 'error',
        };
        nodes.push({
          id: generateId('TRACE'),
          type: 'exchange',
          title: `兑换订单 ${order.orderNo}`,
          description: `${order.exchangeType}兑换，里程 ${order.miles.toLocaleString()}，金额 ¥${order.amount.toFixed(2)}`,
          time: order.applyDate,
          operator: order.auditor,
          status: statusMap[order.status] || 'normal',
          data: {
            orderNo: order.orderNo,
            exchangeType: order.exchangeType,
            miles: order.miles,
            amount: order.amount,
            status: order.status,
            rejectReason: order.rejectReason,
          },
        });
      });
    }

    if (record.expireRecords.length > 0) {
      record.expireRecords.forEach((expire) => {
        const statusMap: Record<string, 'normal' | 'warning' | 'error'> = {
          '未处理': 'error',
          '已冲回': 'normal',
          '已豁免': 'warning',
        };
        nodes.push({
          id: generateId('TRACE'),
          type: 'expire',
          title: `里程过期 ${expire.batchNo}`,
          description: `过期里程 ${expire.actualExpiredMiles.toLocaleString()}，${expire.expireReason}`,
          time: expire.expireDate,
          operator: expire.processor,
          status: statusMap[expire.processStatus] || 'error',
          data: {
            batchNo: expire.batchNo,
            milesToExpire: expire.milesToExpire,
            actualExpiredMiles: expire.actualExpiredMiles,
            expireReason: expire.expireReason,
            processStatus: expire.processStatus,
          },
        });
      });
    }

    if (record.reviewStatus !== '未复核') {
      nodes.push({
        id: generateId('TRACE'),
        type: 'review',
        title: `复核完成`,
        description: record.reviewComment || '复核通过',
        time: record.reviewTime || '',
        operator: record.reviewer,
        status: 'normal',
        data: {
          reviewStatus: record.reviewStatus,
          reviewComment: record.reviewComment,
        },
      });
    }

    return nodes.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }
}

export class DataRefreshService {
  incrementalRefresh<T extends { [key: string]: any }>(
    newData: T[],
    existingData: T[],
    primaryKey: string[]
  ): {
    added: T[];
    updated: T[];
    unchanged: T[];
    deleted: T[];
  } {
    const getKey = (item: T): string => primaryKey.map(k => item[k]).join('||');
    
    const existingMap = new Map<string, T>();
    existingData.forEach(item => existingMap.set(getKey(item), item));
    
    const newMap = new Map<string, T>();
    newData.forEach(item => newMap.set(getKey(item), item));
    
    const added: T[] = [];
    const updated: T[] = [];
    const unchanged: T[] = [];
    const deleted: T[] = [];
    
    newData.forEach(item => {
      const key = getKey(item);
      const existing = existingMap.get(key);
      if (!existing) {
        added.push(item);
      } else if (JSON.stringify(existing) !== JSON.stringify(item)) {
        updated.push(item);
      } else {
        unchanged.push(item);
      }
    });
    
    existingData.forEach(item => {
      const key = getKey(item);
      if (!newMap.has(key)) {
        deleted.push(item);
      }
    });
    
    return { added, updated, unchanged, deleted };
  }

  compareBeforeAfter<T>(before: T, after: T): Record<string, { before: any; after: any }> {
    const changes: Record<string, { before: any; after: any }> = {};
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    
    allKeys.forEach(key => {
      const beforeVal = (before as any)[key];
      const afterVal = (after as any)[key];
      if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
        changes[key] = { before: beforeVal, after: afterVal };
      }
    });
    
    return changes;
  }
}
