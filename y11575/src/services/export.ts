import * as XLSX from 'xlsx';
import {
  ReconciliationReceiptModel,
  StatusTransitionModel,
  OriginalEvidenceModel
} from '../models';
import { StateMachine } from './stateMachine';
import {
  ReconciliationReceipt,
  Operator,
  ReceiptStatus,
  ExportOptions,
  ExportSummary
} from '../types';
import { logger } from '../utils/logger';

export interface FrozenComparison {
  receiptId: string;
  batchNo: string;
  statusBeforeFrozen: string;
  currentStatus: string;
  frozenAt: Date;
  frozenBy: string;
  frozenReason: string;
  unfrozenAt?: Date;
  unfrozenBy?: string;
  unfrozenReason?: string;
}

export interface ManualModification {
  receiptId: string;
  batchNo: string;
  modifiedAt: Date;
  modifiedBy: string;
  originalDeductionAmount: number;
  newDeductionAmount: number;
  originalConfirmedAmount: number;
  newConfirmedAmount: number;
  reason: string;
}

export class ExportService {
  private receiptModel: ReconciliationReceiptModel;
  private transitionModel: StatusTransitionModel;
  private evidenceModel: OriginalEvidenceModel;

  constructor() {
    this.receiptModel = new ReconciliationReceiptModel();
    this.transitionModel = new StatusTransitionModel();
    this.evidenceModel = new OriginalEvidenceModel();
  }

  async generateExport(
    options: ExportOptions,
    operator: Operator
  ): Promise<{
    buffer: Buffer;
    summary: ExportSummary;
    fileName: string;
  }> {
    const receipts = await this.getFilteredReceipts(options);
    const summary = await this.generateSummary(receipts, operator);
    const frozenComparisons = await this.getFrozenComparisons(receipts);
    const manualModifications = await this.getManualModifications(receipts);

    const wb = XLSX.utils.book_new();

    const mainSheet = this.createMainSheet(receipts);
    XLSX.utils.book_append_sheet(wb, mainSheet, '对账异常回执');

    const summarySheet = this.createSummarySheet(summary);
    XLSX.utils.book_append_sheet(wb, summarySheet, '汇总统计');

    const frozenSheet = this.createFrozenSheet(frozenComparisons);
    XLSX.utils.book_append_sheet(wb, frozenSheet, '冻结前后对比');

    const manualSheet = this.createManualSheet(manualModifications);
    XLSX.utils.book_append_sheet(wb, manualSheet, '人工改判记录');

    if (options.includeStatusHistory) {
      const historySheet = await this.createHistorySheet(receipts);
      XLSX.utils.book_append_sheet(wb, historySheet, '状态流转记录');
    }

    if (options.includeOriginalEvidence) {
      const evidenceSheet = await this.createEvidenceSheet(receipts);
      XLSX.utils.book_append_sheet(wb, evidenceSheet, '原始证据追溯');
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: options.format === 'csv' ? 'csv' : 'xlsx' });
    const fileName = `外协加工对账异常回执_${new Date().toISOString().slice(0, 10)}.${options.format === 'csv' ? 'csv' : 'xlsx'}`;

    logger.info(`已生成导出文件，共 ${receipts.length} 条记录，操作人: ${operator.name}`);

    return { buffer: Buffer.from(buffer), summary, fileName };
  }

  private async getFilteredReceipts(options: ExportOptions): Promise<ReconciliationReceipt[]> {
    let receipts = await this.receiptModel.findAll();

    if (options.statusFilter && options.statusFilter.length > 0) {
      receipts = receipts.filter(r => options.statusFilter!.includes(r.status));
    }

    if (options.dateRange) {
      const { start, end } = options.dateRange;
      receipts = receipts.filter(r => {
        const created = r.createdAt;
        return created >= start && created <= end;
      });
    }

    return receipts;
  }

  private async generateSummary(receipts: ReconciliationReceipt[], operator: Operator): Promise<ExportSummary> {
    const byStatus: Record<ReceiptStatus, number> = {} as Record<ReceiptStatus, number>;
    Object.values(ReceiptStatus).forEach(status => {
      byStatus[status as ReceiptStatus] = 0;
    });

    receipts.forEach(r => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });

    return {
      totalReceipts: receipts.length,
      byStatus,
      totalAbnormalAmount: receipts.reduce((sum, r) => sum + r.abnormalAmount, 0),
      totalDeductionAmount: receipts.reduce((sum, r) => sum + r.deductionAmount, 0),
      totalConfirmedAmount: receipts.reduce((sum, r) => sum + r.confirmedAmount, 0),
      frozenCount: receipts.filter(r => r.status === ReceiptStatus.FROZEN).length,
      manualModifiedCount: receipts.filter(r => r.isManualModified).length,
      generatedAt: new Date(),
      generatedBy: operator
    };
  }

  private async getFrozenComparisons(receipts: ReconciliationReceipt[]): Promise<FrozenComparison[]> {
    const frozenReceipts = receipts.filter(r => 
      r.status === ReceiptStatus.FROZEN || r.statusBeforeFrozen
    );

    const comparisons: FrozenComparison[] = [];

    for (const receipt of frozenReceipts) {
      const transitions = await this.transitionModel.findByReceiptId(receipt.id);
      const freezeTransitions = transitions.filter(t => t.toStatus === ReceiptStatus.FROZEN);
      const unfreezeTransitions = transitions.filter(t => t.fromStatus === ReceiptStatus.FROZEN);

      for (const freeze of freezeTransitions) {
        const unfreeze = unfreezeTransitions.find(u => u.timestamp > freeze.timestamp);
        comparisons.push({
          receiptId: receipt.id,
          batchNo: receipt.batchNo,
          statusBeforeFrozen: StateMachine.getStatusName(freeze.fromStatus),
          currentStatus: unfreeze ? StateMachine.getStatusName(unfreeze.toStatus) : StateMachine.getStatusName(ReceiptStatus.FROZEN),
          frozenAt: freeze.timestamp,
          frozenBy: freeze.operator.name,
          frozenReason: freeze.reason,
          unfrozenAt: unfreeze?.timestamp,
          unfrozenBy: unfreeze?.operator.name,
          unfrozenReason: unfreeze?.reason
        });
      }
    }

    return comparisons;
  }

  private async getManualModifications(receipts: ReconciliationReceipt[]): Promise<ManualModification[]> {
    const modifiedReceipts = receipts.filter(r => r.isManualModified);
    const modifications: ManualModification[] = [];

    for (const receipt of modifiedReceipts) {
      const transitions = await this.transitionModel.findByReceiptId(receipt.id);
      const modifyTransitions = transitions.filter(t => t.toStatus === ReceiptStatus.MODIFIED);

      for (const transition of modifyTransitions) {
        const meta = transition.metadata || {};
        modifications.push({
          receiptId: receipt.id,
          batchNo: receipt.batchNo,
          modifiedAt: transition.timestamp,
          modifiedBy: transition.operator.name,
          originalDeductionAmount: meta.originalDeductionAmount || 0,
          newDeductionAmount: meta.newDeductionAmount || receipt.deductionAmount,
          originalConfirmedAmount: meta.originalConfirmedAmount || 0,
          newConfirmedAmount: meta.newConfirmedAmount || receipt.confirmedAmount,
          reason: transition.reason
        });
      }
    }

    return modifications;
  }

  private createMainSheet(receipts: ReconciliationReceipt[]): XLSX.WorkSheet {
    const data = receipts.map(r => ({
      '回执ID': r.id,
      '批次号': r.batchNo,
      '半成品编码': r.semiProductCode,
      '半成品名称': r.semiProductName,
      '供应商ID': r.supplierId,
      '供应商名称': r.supplierName,
      '当前状态': StateMachine.getStatusName(r.status),
      '数量': r.quantity,
      '异常金额': r.abnormalAmount,
      '扣款金额': r.deductionAmount,
      '确认扣款金额': r.confirmedAmount,
      '是否人工改判': r.isManualModified ? '是' : '否',
      '人工改判理由': r.manualReason || '',
      '冻结前状态': r.statusBeforeFrozen ? StateMachine.getStatusName(r.statusBeforeFrozen) : '',
      '冻结时间': r.frozenAt?.toISOString() || '',
      '冻结原因': r.frozenReason || '',
      '创建人': r.createdBy.name,
      '创建时间': r.createdAt.toISOString(),
      '最后更新人': r.updatedBy?.name || '',
      '最后更新时间': r.updatedAt?.toISOString() || ''
    }));

    return XLSX.utils.json_to_sheet(data);
  }

  private createSummarySheet(summary: ExportSummary): XLSX.WorkSheet {
    const data = [
      { '项目': '导出时间', '数值': summary.generatedAt.toLocaleString('zh-CN') },
      { '项目': '导出人', '数值': summary.generatedBy.name },
      { '项目': '导出人角色', '数值': summary.generatedBy.role },
      { '项目': '总记录数', '数值': summary.totalReceipts },
      { '项目': '总异常金额', '数值': summary.totalAbnormalAmount },
      { '项目': '总扣款金额', '数值': summary.totalDeductionAmount },
      { '项目': '总确认扣款金额', '数值': summary.totalConfirmedAmount },
      { '项目': '冻结数量', '数值': summary.frozenCount },
      { '项目': '人工改判数量', '数值': summary.manualModifiedCount },
      { '项目': '', '数值': '' }
    ];

    Object.entries(summary.byStatus).forEach(([status, count]) => {
      data.push({
        '项目': `${StateMachine.getStatusName(status as ReceiptStatus)}数量`,
        '数值': count
      });
    });

    return XLSX.utils.json_to_sheet(data);
  }

  private createFrozenSheet(comparisons: FrozenComparison[]): XLSX.WorkSheet {
    const data = comparisons.map(c => ({
      '回执ID': c.receiptId,
      '批次号': c.batchNo,
      '冻结前状态': c.statusBeforeFrozen,
      '当前状态': c.currentStatus,
      '冻结时间': c.frozenAt.toISOString(),
      '冻结操作人': c.frozenBy,
      '冻结原因': c.frozenReason,
      '解冻时间': c.unfrozenAt?.toISOString() || '',
      '解冻操作人': c.unfrozenBy || '',
      '解冻原因': c.unfrozenReason || ''
    }));

    return XLSX.utils.json_to_sheet(data);
  }

  private createManualSheet(modifications: ManualModification[]): XLSX.WorkSheet {
    const data = modifications.map(m => ({
      '回执ID': m.receiptId,
      '批次号': m.batchNo,
      '改判时间': m.modifiedAt.toISOString(),
      '改判操作人': m.modifiedBy,
      '原扣款金额': m.originalDeductionAmount,
      '新扣款金额': m.newDeductionAmount,
      '扣款金额变更': m.newDeductionAmount - m.originalDeductionAmount,
      '原确认金额': m.originalConfirmedAmount,
      '新确认金额': m.newConfirmedAmount,
      '确认金额变更': m.newConfirmedAmount - m.originalConfirmedAmount,
      '改判理由': m.reason
    }));

    return XLSX.utils.json_to_sheet(data);
  }

  private async createHistorySheet(receipts: ReconciliationReceipt[]): Promise<XLSX.WorkSheet> {
    const allTransitions: any[] = [];

    for (const receipt of receipts) {
      const transitions = await this.transitionModel.findByReceiptId(receipt.id);
      transitions.forEach(t => {
        allTransitions.push({
          '回执ID': t.receiptId,
          '批次号': receipt.batchNo,
          '流转前状态': StateMachine.getStatusName(t.fromStatus),
          '流转后状态': StateMachine.getStatusName(t.toStatus),
          '操作人': t.operator.name,
          '操作人角色': t.operator.role,
          '操作时间': t.timestamp.toISOString(),
          '操作原因': t.reason
        });
      });
    }

    return XLSX.utils.json_to_sheet(allTransitions);
  }

  private async createEvidenceSheet(receipts: ReconciliationReceipt[]): Promise<XLSX.WorkSheet> {
    const allEvidences: any[] = [];

    for (const receipt of receipts) {
      const evidences = await this.evidenceModel.findByReceiptId(receipt.id);
      evidences.forEach(e => {
        allEvidences.push({
          '回执ID': e.receiptId,
          '批次号': receipt.batchNo,
          '数据源类型': e.sourceType,
          '来源文件': e.sourceFile,
          '原始行号': e.originalLineNumber,
          '字段名称': e.fieldName,
          '原始值': e.originalValue,
          '解析值': e.parsedValue,
          '导入批次': e.importBatchId,
          '导入时间': e.importedAt.toISOString()
        });
      });
    }

    return XLSX.utils.json_to_sheet(allEvidences);
  }

  async getDashboardStats(): Promise<{
    statusCounts: Record<ReceiptStatus, number>;
    totalAmounts: {
      abnormal: number;
      deduction: number;
      confirmed: number;
    };
    manualModificationCount: number;
    frozenCount: number;
    recentActivities: any[];
  }> {
    const receipts = await this.receiptModel.findAll();

    const statusCounts: Record<ReceiptStatus, number> = {} as Record<ReceiptStatus, number>;
    Object.values(ReceiptStatus).forEach(status => {
      statusCounts[status as ReceiptStatus] = 0;
    });

    receipts.forEach(r => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    const recentReceipts = receipts
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    return {
      statusCounts,
      totalAmounts: {
        abnormal: receipts.reduce((sum, r) => sum + r.abnormalAmount, 0),
        deduction: receipts.reduce((sum, r) => sum + r.deductionAmount, 0),
        confirmed: receipts.reduce((sum, r) => sum + r.confirmedAmount, 0)
      },
      manualModificationCount: receipts.filter(r => r.isManualModified).length,
      frozenCount: receipts.filter(r => r.status === ReceiptStatus.FROZEN).length,
      recentActivities: recentReceipts.map(r => ({
        receiptId: r.id,
        batchNo: r.batchNo,
        status: StateMachine.getStatusName(r.status),
        supplierName: r.supplierName,
        deductionAmount: r.deductionAmount,
        createdAt: r.createdAt
      }))
    };
  }
}
