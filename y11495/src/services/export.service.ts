import * as XLSX from 'xlsx';
import prisma from '../utils/prisma';
import { UserContext, BatchStatus, AuditAction, ExceptionStatus } from '../types';
import { AuditService } from './audit.service';
import { parseJson } from '../utils/json';

export class ExportService {
  static async exportBatchReport(batchId: string, context: UserContext) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        sourceFiles: true,
        invoices: {
          include: {
            sourceFile: true,
          },
        },
        travelApps: true,
        payments: true,
        exceptions: {
          include: {
            invoices: {
              include: {
                invoice: true,
              },
            },
          },
        },
        statusHistories: {
          orderBy: { changedAt: 'asc' },
        },
      },
    });

    if (!batch) {
      throw new Error('批次不存在');
    }

    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet([{
      '批次编号': batch.batchNo,
      '批次标题': batch.title,
      '批次描述': batch.description || '',
      '稽核周期开始': batch.periodStart?.toISOString().split('T')[0] || '',
      '稽核周期结束': batch.periodEnd?.toISOString().split('T')[0] || '',
      '当前状态': batch.status,
      '冻结状态': batch.status === BatchStatus.FROZEN ? '已冻结' : '未冻结',
      '冻结原因': batch.frozenReason || '',
      '冻结时间': batch.frozenAt?.toISOString() || '',
      '创建时间': batch.createdAt.toISOString(),
      '发票总数': batch.invoices.length,
      '发票总金额': batch.invoices.reduce((sum, i) => sum + i.totalAmount, 0),
      '异常总数': batch.exceptions.length,
      '待处理异常': batch.exceptions.filter(e => e.status === ExceptionStatus.DETECTED).length,
      '已确认异常': batch.exceptions.filter(e => e.status === ExceptionStatus.CONFIRMED).length,
      '已改判异常': batch.exceptions.filter(e => e.status === ExceptionStatus.OVERRULED).length,
      '已驳回异常': batch.exceptions.filter(e => e.status === ExceptionStatus.DISMISSED).length,
    }]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, '批次汇总');

    const statusHistorySheet = XLSX.utils.json_to_sheet(
      batch.statusHistories.map(h => ({
        '旧状态': h.oldStatus || '初始',
        '新状态': h.newStatus,
        '变更原因': h.reason || '',
        '变更时间': h.changedAt.toISOString(),
      }))
    );
    XLSX.utils.book_append_sheet(workbook, statusHistorySheet, '状态历史');

    const invoicesSheet = XLSX.utils.json_to_sheet(
      batch.invoices.map(i => ({
        '发票号码': i.invoiceNo,
        '发票类型': i.invoiceType,
        '开票日期': i.invoiceDate.toISOString().split('T')[0],
        '销售方': i.sellerName,
        '购买方': i.buyerName || '',
        '总金额': i.totalAmount,
        '税额': i.taxAmount,
        '价税合计': i.totalAmount,
        '酒店名称': i.hotelName || '',
        '入住日期': i.checkInDate?.toISOString().split('T')[0] || '',
        '离店日期': i.checkOutDate?.toISOString().split('T')[0] || '',
        '入住人': i.guestNames || '',
        '来源文件': i.sourceFile?.fileName || '',
        '来源行号': i.sourceRowNo,
      }))
    );
    XLSX.utils.book_append_sheet(workbook, invoicesSheet, '发票明细');

    const exceptionsSheet = XLSX.utils.json_to_sheet(
      batch.exceptions.map(e => ({
        '异常类型': e.exceptionType,
        '严重程度': e.severity === 3 ? '高' : e.severity === 2 ? '中' : '低',
        '描述': e.description,
        '当前状态': e.status,
        '检测时间': e.detectedAt.toISOString(),
        '检测人': e.detectedBy,
        '确认时间': e.confirmedAt?.toISOString() || '',
        '确认人': e.confirmedBy || '',
        '确认备注': e.confirmedNote || '',
        '改判时间': e.overruledAt?.toISOString() || '',
        '改判人': e.overruledBy || '',
        '改判理由': e.overruleReason || '',
        '驳回时间': e.dismissedAt?.toISOString() || '',
        '驳回人': e.dismissedBy || '',
        '驳回理由': e.dismissReason || '',
        '关联发票号': e.invoices.map(ie => ie.invoice.invoiceNo).join('; '),
      }))
    );
    XLSX.utils.book_append_sheet(workbook, exceptionsSheet, '异常明细');

    const fileName = `稽核报告_${batch.batchNo}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const exportRecord = await prisma.exportRecord.create({
      data: {
        batchId,
        exportedBy: context.userId,
        fileName,
        fileType: 'XLSX',
        statusBefore: batch.status,
      },
    });

    await AuditService.log(AuditAction.BATCH_EXPORT, context, batchId, {
      exportId: exportRecord.id,
      fileType: 'XLSX',
      fileName,
    });

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return {
      buffer,
      fileName,
      exportId: exportRecord.id,
    };
  }

  static async getFinanceDashboard(batchId: string) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        invoices: true,
        exceptions: {
          orderBy: { severity: 'desc' },
        },
        statusHistories: {
          orderBy: { changedAt: 'desc' },
        },
        exportRecords: {
          orderBy: { exportedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!batch) {
      throw new Error('批次不存在');
    }

    const beforeFreezeStatus = batch.statusHistories
      .find(h => h.newStatus === BatchStatus.FROZEN)?.oldStatus || 'N/A';

    const afterFreezeStatus = batch.statusHistories
      .find(h => h.oldStatus === BatchStatus.FROZEN)?.newStatus || '仍在冻结';

    return {
      batchId: batch.id,
      batchNo: batch.batchNo,
      title: batch.title,
      currentStatus: batch.status,
      freezeStatus: {
        isFrozen: batch.status === BatchStatus.FROZEN,
        beforeFreezeStatus,
        afterFreezeStatus,
        frozenAt: batch.frozenAt,
        frozenReason: batch.frozenReason,
        frozenBy: batch.frozenBy,
      },
      summary: {
        totalInvoices: batch.invoices.length,
        totalAmount: batch.invoices.reduce((sum, i) => sum + i.totalAmount, 0),
        totalExceptions: batch.exceptions.length,
        exceptionsByStatus: {
          detected: batch.exceptions.filter(e => e.status === ExceptionStatus.DETECTED).length,
          confirmed: batch.exceptions.filter(e => e.status === ExceptionStatus.CONFIRMED).length,
          overruled: batch.exceptions.filter(e => e.status === ExceptionStatus.OVERRULED).length,
          dismissed: batch.exceptions.filter(e => e.status === ExceptionStatus.DISMISSED).length,
        },
        exceptionsByType: batch.exceptions.reduce((acc, e) => {
          acc[e.exceptionType] = (acc[e.exceptionType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        highSeverityCount: batch.exceptions.filter(e => e.severity === 3).length,
        mediumSeverityCount: batch.exceptions.filter(e => e.severity === 2).length,
        lowSeverityCount: batch.exceptions.filter(e => e.severity === 1).length,
      },
      manualDecisions: batch.exceptions
        .filter(e => e.status === ExceptionStatus.OVERRULED || e.status === ExceptionStatus.DISMISSED)
        .map(e => ({
          exceptionId: e.id,
          exceptionType: e.exceptionType,
          severity: e.severity,
          description: e.description,
          decision: e.status,
          reason: e.overruleReason || e.dismissReason || '',
          decidedBy: e.overruledBy || e.dismissedBy || '',
          decidedAt: e.overruledAt || e.dismissedAt,
        })),
      recentExports: batch.exportRecords,
    };
  }
}
