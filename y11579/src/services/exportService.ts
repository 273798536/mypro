import ExcelJS from 'exceljs';
import { Ledger, ProcessResult, Role } from '../types';
import { LedgerService } from './ledgerService';
import { maskSensitiveData } from '../utils/diff';
import { UserRepository } from '../db/repositories';

const sensitiveFields = ['phone', 'receiver', 'handoverPerson', 'responsiblePerson'];

export interface ExportOptions {
  maskSensitive?: boolean;
  includeHistory?: boolean;
  includeFailures?: boolean;
  role?: Role;
}

export class ExportService {
  static async exportLedgerToExcel(
    ledgerId: string,
    options: ExportOptions = {}
  ): Promise<Buffer> {
    const ledger = await LedgerService.getFullLedger(ledgerId);
    if (!ledger) throw new Error('台账不存在');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '外协加工对账台账系统';
    workbook.created = new Date();

    const viewData = this.applyRoleView(ledger, options);

    this.addSummarySheet(workbook, viewData, options);
    this.addDeliveryNotesSheet(workbook, viewData.deliveryNotes, options);
    this.addReworkRecordsSheet(workbook, viewData.reworkRecords, options);
    this.addDeductionDetailsSheet(workbook, viewData.deductionDetails, options);
    this.addHandoverPapersSheet(workbook, viewData.handoverPapers, options);
    this.addSmsEvidencesSheet(workbook, viewData.smsEvidences, options);

    if (options.includeHistory) {
      await this.addHistorySheet(workbook, ledgerId);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as Buffer;
  }

  static async exportLedgersReport(
    ledgers: Ledger[],
    options: ExportOptions = {}
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '外协加工对账台账系统';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('台账汇总报表');

    worksheet.columns = [
      { header: '批次号', key: 'batchNo', width: 20 },
      { header: '状态', key: 'status', width: 12 },
      { header: '处理结果', key: 'processResult', width: 15 },
      { header: '处理说明', key: 'processMessage', width: 30 },
      { header: '送货单数', key: 'deliveryCount', width: 10 },
      { header: '返修数', key: 'reworkCount', width: 10 },
      { header: '扣款数', key: 'deductionCount', width: 10 },
      { header: '总扣款金额', key: 'totalDeduction', width: 15 },
      { header: '创建人', key: 'creator', width: 15 },
      { header: '创建时间', key: 'createdAt', width: 20 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    for (const ledger of ledgers) {
      const fullLedger = await LedgerService.getFullLedger(ledger.id);
      if (!fullLedger) continue;

      const totalDeduction = fullLedger.deductionDetails.reduce(
        (sum, d) => sum + d.deductionAmount, 0
      );

      const creator = await UserRepository.findById(ledger.createdBy);

      worksheet.addRow({
        batchNo: ledger.batchNo,
        status: this.translateStatus(ledger.status),
        processResult: this.translateProcessResult(ledger.processResult),
        processMessage: ledger.processMessage || '',
        deliveryCount: fullLedger.deliveryNotes.length,
        reworkCount: fullLedger.reworkRecords.length,
        deductionCount: fullLedger.deductionDetails.length,
        totalDeduction: totalDeduction.toFixed(2),
        creator: creator?.name || ledger.createdBy,
        createdAt: ledger.createdAt
      });
    }

    if (options.includeFailures) {
      this.addFailureAnalysisSheet(workbook, ledgers);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as Buffer;
  }

  private static applyRoleView(ledger: Ledger, options: ExportOptions): Ledger {
    let result = { ...ledger };

    if (options.maskSensitive || ledger.sensitiveFieldsMasked) {
      result = this.maskLedgerData(result);
    }

    if (options.role === Role.AUDITOR) {
      result = this.maskLedgerData(result);
    }

    return result;
  }

  private static maskLedgerData(ledger: Ledger): Ledger {
    return {
      ...ledger,
      deliveryNotes: ledger.deliveryNotes.map(n => maskSensitiveData(n, sensitiveFields)),
      reworkRecords: ledger.reworkRecords.map(r => maskSensitiveData(r, sensitiveFields)),
      deductionDetails: ledger.deductionDetails.map(d => maskSensitiveData(d, sensitiveFields)),
      handoverPapers: ledger.handoverPapers.map(h => maskSensitiveData(h, sensitiveFields)),
      smsEvidences: ledger.smsEvidences.map(s => ({
        ...s,
        sender: maskSensitiveData({ phone: s.sender }, ['phone']).phone,
        receiver: maskSensitiveData({ phone: s.receiver }, ['phone']).phone
      }))
    };
  }

  private static addSummarySheet(
    workbook: ExcelJS.Workbook,
    ledger: Ledger,
    options: ExportOptions
  ): void {
    const worksheet = workbook.addWorksheet('台账概览');

    worksheet.columns = [
      { header: '项目', key: 'item', width: 20 },
      { header: '内容', key: 'value', width: 50 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    const summaryData = [
      { item: '批次号', value: ledger.batchNo },
      { item: '状态', value: this.translateStatus(ledger.status) },
      { item: '处理结果', value: this.translateProcessResult(ledger.processResult) },
      { item: '处理说明', value: ledger.processMessage || '-' },
      { item: '创建时间', value: ledger.createdAt },
      { item: '提交时间', value: ledger.submittedAt || '-' },
      { item: '确认时间', value: ledger.confirmedAt || '-' },
      { item: '送货单数量', value: ledger.deliveryNotes.length },
      { item: '返修记录数量', value: ledger.reworkRecords.length },
      { item: '扣款明细数量', value: ledger.deductionDetails.length },
      { item: '扣款总金额', value: ledger.deductionDetails.reduce((sum, d) => sum + d.deductionAmount, 0).toFixed(2) },
      { item: '门店交接纸数量', value: ledger.handoverPapers.length },
      { item: '短信证据数量', value: ledger.smsEvidences.length },
      { item: '敏感字段脱敏', value: ledger.sensitiveFieldsMasked ? '是' : '否' }
    ];

    for (const row of summaryData) {
      worksheet.addRow(row);
    }
  }

  private static addDeliveryNotesSheet(
    workbook: ExcelJS.Workbook,
    notes: any[],
    options: ExportOptions
  ): void {
    const worksheet = workbook.addWorksheet('外协送货单');

    worksheet.columns = [
      { header: '序号', key: 'no', width: 8 },
      { header: '供应商', key: 'supplier', width: 20 },
      { header: '产品编码', key: 'productCode', width: 15 },
      { header: '产品名称', key: 'productName', width: 20 },
      { header: '数量', key: 'quantity', width: 10 },
      { header: '单位', key: 'unit', width: 8 },
      { header: '送货日期', key: 'deliveryDate', width: 15 },
      { header: '仓库', key: 'warehouse', width: 15 },
      { header: '接收人', key: 'receiver', width: 15 },
      { header: '备注', key: 'remark', width: 25 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    notes.forEach((note, index) => {
      worksheet.addRow({
        no: index + 1,
        supplier: note.supplierName,
        productCode: note.productCode,
        productName: note.productName,
        quantity: note.quantity,
        unit: note.unit,
        deliveryDate: note.deliveryDate,
        warehouse: note.warehouse,
        receiver: note.receiver,
        remark: note.remark || ''
      });
    });
  }

  private static addReworkRecordsSheet(
    workbook: ExcelJS.Workbook,
    records: any[],
    options: ExportOptions
  ): void {
    const worksheet = workbook.addWorksheet('返修记录');

    worksheet.columns = [
      { header: '序号', key: 'no', width: 8 },
      { header: '返修原因', key: 'reason', width: 25 },
      { header: '返修类型', key: 'type', width: 15 },
      { header: '返修数量', key: 'quantity', width: 12 },
      { header: '返修日期', key: 'date', width: 15 },
      { header: '责任人', key: 'person', width: 15 },
      { header: '完成日期', key: 'completeDate', width: 15 },
      { header: '结果', key: 'result', width: 20 },
      { header: '备注', key: 'remark', width: 25 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    records.forEach((record, index) => {
      worksheet.addRow({
        no: index + 1,
        reason: record.reworkReason,
        type: record.reworkType,
        quantity: record.reworkQuantity,
        date: record.reworkDate,
        person: record.responsiblePerson,
        completeDate: record.completionDate || '-',
        result: record.result || '-',
        remark: record.remark || ''
      });
    });
  }

  private static addDeductionDetailsSheet(
    workbook: ExcelJS.Workbook,
    details: any[],
    options: ExportOptions
  ): void {
    const worksheet = workbook.addWorksheet('扣款明细');

    worksheet.columns = [
      { header: '序号', key: 'no', width: 8 },
      { header: '扣款类型', key: 'type', width: 15 },
      { header: '扣款金额', key: 'amount', width: 12 },
      { header: '扣款原因', key: 'reason', width: 30 },
      { header: '扣款日期', key: 'date', width: 15 },
      { header: '操作人', key: 'operator', width: 15 },
      { header: '备注', key: 'remark', width: 25 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    details.forEach((detail, index) => {
      worksheet.addRow({
        no: index + 1,
        type: detail.deductionType,
        amount: detail.deductionAmount.toFixed(2),
        reason: detail.deductionReason,
        date: detail.deductionDate,
        operator: detail.operator,
        remark: detail.remark || ''
      });
    });
  }

  private static addHandoverPapersSheet(
    workbook: ExcelJS.Workbook,
    papers: any[],
    options: ExportOptions
  ): void {
    const worksheet = workbook.addWorksheet('门店交接纸');

    worksheet.columns = [
      { header: '序号', key: 'no', width: 8 },
      { header: '门店', key: 'store', width: 20 },
      { header: '交接日期', key: 'date', width: 15 },
      { header: '交接人', key: 'handover', width: 15 },
      { header: '接收人', key: 'receiver', width: 15 },
      { header: '商品明细', key: 'items', width: 40 },
      { header: '备注', key: 'remark', width: 25 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    papers.forEach((paper, index) => {
      const itemsStr = paper.items.map((i: any) => `${i.productName}×${i.quantity}${i.unit}`).join('; ');
      worksheet.addRow({
        no: index + 1,
        store: paper.storeName,
        date: paper.handoverDate,
        handover: paper.handoverPerson,
        receiver: paper.receiver,
        items: itemsStr,
        remark: paper.remark || ''
      });
    });
  }

  private static addSmsEvidencesSheet(
    workbook: ExcelJS.Workbook,
    evidences: any[],
    options: ExportOptions
  ): void {
    const worksheet = workbook.addWorksheet('短信证据');

    worksheet.columns = [
      { header: '序号', key: 'no', width: 8 },
      { header: '关联类型', key: 'relatedType', width: 15 },
      { header: '发送方', key: 'sender', width: 15 },
      { header: '接收方', key: 'receiver', width: 15 },
      { header: '内容', key: 'content', width: 50 },
      { header: '发送时间', key: 'sendTime', width: 20 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    evidences.forEach((evidence, index) => {
      worksheet.addRow({
        no: index + 1,
        relatedType: evidence.relatedType,
        sender: evidence.sender,
        receiver: evidence.receiver,
        content: evidence.content,
        sendTime: evidence.sendTime
      });
    });
  }

  private static async addHistorySheet(workbook: ExcelJS.Workbook, ledgerId: string): Promise<void> {
    const history = await LedgerService.getChangeHistory(ledgerId);
    const worksheet = workbook.addWorksheet('变更历史');

    worksheet.columns = [
      { header: '序号', key: 'no', width: 8 },
      { header: '字段', key: 'field', width: 20 },
      { header: '变更原因', key: 'reason', width: 25 },
      { header: '变更摘要', key: 'summary', width: 40 },
      { header: '操作人角色', key: 'role', width: 15 },
      { header: '变更时间', key: 'time', width: 20 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      worksheet.addRow({
        no: i + 1,
        field: h.fieldName,
        reason: h.changeReason,
        summary: h.diffSummary || '',
        role: this.translateRole(h.changedByRole),
        time: h.changedAt
      });
    }
  }

  private static addFailureAnalysisSheet(workbook: ExcelJS.Workbook, ledgers: Ledger[]): void {
    const worksheet = workbook.addWorksheet('异常项分析');

    worksheet.columns = [
      { header: '批次号', key: 'batchNo', width: 20 },
      { header: '处理结果', key: 'result', width: 15 },
      { header: '状态', key: 'status', width: 12 },
      { header: '问题说明', key: 'message', width: 40 },
      { header: '建议处理方式', key: 'suggestion', width: 30 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0E0' } };

    const abnormalLedgers = ledgers.filter(l => 
      l.processResult === ProcessResult.PENDING_REVIEW || 
      l.processResult === ProcessResult.UNPROCESSABLE ||
      l.status === 'rejected'
    );

    for (const ledger of abnormalLedgers) {
      let suggestion = '';
      if (ledger.processResult === ProcessResult.PENDING_REVIEW) {
        suggestion = '请财务人员复核后确认或驳回';
      } else if (ledger.processResult === ProcessResult.UNPROCESSABLE) {
        suggestion = '数据异常，需人工核实原始单据后处理';
      } else if (ledger.status === 'rejected') {
        suggestion = `已驳回，原因: ${ledger.rejectReason || '未知'}`;
      }

      worksheet.addRow({
        batchNo: ledger.batchNo,
        result: this.translateProcessResult(ledger.processResult),
        status: this.translateStatus(ledger.status),
        message: ledger.processMessage || ledger.rejectReason || '-',
        suggestion
      });
    }
  }

  private static translateStatus(status?: string): string {
    const map: Record<string, string> = {
      draft: '草稿',
      submitted: '已提交',
      rejected: '已驳回',
      confirmed: '已确认',
      audit: '审计中'
    };
    return map[status || ''] || status || '-';
  }

  private static translateProcessResult(result?: string): string {
    const map: Record<string, string> = {
      normal: '正常',
      pending_review: '待复核',
      unprocessable: '无法处理'
    };
    return map[result || ''] || result || '-';
  }

  private static translateRole(role: string): string {
    const map: Record<string, string> = {
      factory_owner: '工厂老板',
      accountant: '财务',
      auditor: '审计员',
      operator: '操作员'
    };
    return map[role] || role;
  }
}
