import * as XLSX from 'xlsx';
import batchRepository from '../repositories/BatchRepository';
import documentRepository from '../repositories/DocumentRepository';
import fabricTrackRepository from '../repositories/FabricTrackRepository';
import auditLogRepository from '../repositories/AuditLogRepository';
import reportRepository from '../repositories/ReportRepository';
import type { ReportType } from '../../shared/types';
import { DOCUMENT_TYPE_LABELS, BATCH_STATUS_LABELS } from '../../shared/types';

class ReportService {
  generate(batchId: string, type: ReportType, generatedBy: string) {
    const batch = batchRepository.findById(batchId);
    if (!batch) throw new Error('Batch not found');

    const documents = documentRepository.findByBatchId(batchId);
    const auditLogs = auditLogRepository.findByEntity('BATCH', batchId);
    const fabricTracks = fabricTrackRepository.findByStyleCode(batch.styleCode);

    const documentSummary = documents.map(doc => {
      const allVersions = documentRepository.getAllVersions(doc.id);
      const latestDiff = doc.version > 1 
        ? documentRepository.getDiff(doc.id, doc.version - 1, doc.version)
        : null;
      
      return {
        type: doc.documentType,
        typeLabel: DOCUMENT_TYPE_LABELS[doc.documentType],
        documentNo: doc.documentNo,
        version: doc.version,
        status: doc.status,
        data: doc.data,
        versions: allVersions.map(v => ({
          version: v.version,
          status: v.status,
          updatedAt: v.updatedAt,
          isHistory: v.isHistory
        })),
        latestDiff: latestDiff ? {
          fields: latestDiff.fields,
          modifiedBy: latestDiff.modifiedBy,
          modifiedAt: latestDiff.modifiedAt,
          reason: latestDiff.reason
        } : null
      };
    });

    const freezeSnapshot = auditLogs.find(log => log.action === 'UPDATE' && log.afterData?.frozen === true);
    const beforeFreeze = freezeSnapshot?.beforeData;
    const afterFreeze = freezeSnapshot?.afterData;

    const data = {
      batch: {
        ...batch,
        statusLabel: BATCH_STATUS_LABELS[batch.status]
      },
      documents: documentSummary,
      fabricTracks,
      freezeSnapshot: beforeFreeze && afterFreeze ? {
        before: {
          status: beforeFreeze.status,
          statusLabel: BATCH_STATUS_LABELS[beforeFreeze.status as keyof typeof BATCH_STATUS_LABELS],
          frozen: beforeFreeze.frozen
        },
        after: {
          status: afterFreeze.status,
          statusLabel: BATCH_STATUS_LABELS[afterFreeze.status as keyof typeof BATCH_STATUS_LABELS],
          frozen: afterFreeze.frozen,
          frozenReason: afterFreeze.frozenReason
        },
        reason: freezeSnapshot.reason,
        operatedBy: freezeSnapshot.operatedBy,
        operatedAt: freezeSnapshot.createdAt
      } : null,
      manualReasons: auditLogs
        .filter(log => log.reason)
        .map(log => ({
          action: log.action,
          reason: log.reason,
          operatedBy: log.operatedBy,
          createdAt: log.createdAt
        })),
      statistics: {
        totalDocuments: documents.length,
        documentsByType: documents.reduce((acc, doc) => {
          acc[doc.documentType] = (acc[doc.documentType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        fabricTracksCount: fabricTracks.length
      }
    };

    return reportRepository.create({
      batchId,
      type,
      data,
      generatedBy
    });
  }

  exportToExcel(reportId: string): Buffer {
    const report = reportRepository.findById(reportId);
    if (!report) throw new Error('Report not found');

    const { batch, documents, freezeSnapshot, manualReasons } = report.data;

    const wb = XLSX.utils.book_new();

    const summaryData = [
      ['批次汇总'],
      [],
      ['批次号', batch.batchNo],
      ['款式编码', batch.styleCode],
      ['品牌', batch.brand],
      ['状态', batch.statusLabel],
      ['是否冻结', batch.frozen ? '是' : '否'],
      ['冻结原因', batch.frozenReason || '-'],
      ['创建人', batch.createdBy],
      ['创建时间', batch.createdAt]
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, '批次汇总');

    if (freezeSnapshot) {
      const freezeData = [
        ['冻结前后对比'],
        [],
        ['项目', '冻结前', '冻结后'],
        ['状态', freezeSnapshot.before.statusLabel, freezeSnapshot.after.statusLabel],
        ['是否冻结', freezeSnapshot.before.frozen ? '是' : '否', freezeSnapshot.after.frozen ? '是' : '否'],
        ['冻结原因', '-', freezeSnapshot.after.frozenReason || '-'],
        [],
        ['操作人', freezeSnapshot.operatedBy],
        ['操作时间', freezeSnapshot.operatedAt],
        ['理由', freezeSnapshot.reason]
      ];
      const freezeWs = XLSX.utils.aoa_to_sheet(freezeData);
      XLSX.utils.book_append_sheet(wb, freezeWs, '冻结对比');
    }

    const documentsData = [
      ['单据列表'],
      [],
      ['类型', '单据号', '版本', '状态', '数据来源']
    ];
    documents.forEach((doc: any) => {
      documentsData.push([
        doc.typeLabel,
        doc.documentNo,
        doc.version,
        doc.status,
        `批次: ${batch.batchNo}`
      ]);
    });
    const docsWs = XLSX.utils.aoa_to_sheet(documentsData);
    XLSX.utils.book_append_sheet(wb, docsWs, '单据明细');

    const reasonsData = [
      ['人工操作记录'],
      [],
      ['操作', '理由', '操作人', '时间']
    ];
    manualReasons.forEach((r: any) => {
      reasonsData.push([r.action, r.reason, r.operatedBy, r.createdAt]);
    });
    const reasonsWs = XLSX.utils.aoa_to_sheet(reasonsData);
    XLSX.utils.book_append_sheet(wb, reasonsWs, '人工操作记录');

    const modifiedDocuments = documents.filter((doc: any) => doc.latestDiff && doc.latestDiff.fields.length > 0);
    if (modifiedDocuments.length > 0) {
      const diffData = [
        ['异常修正差异对比'],
        [],
        ['单据类型', '单据号', '版本', '修改字段', '原值', '新值', '变更类型', '修改人', '修改时间', '原因']
      ];
      modifiedDocuments.forEach((doc: any) => {
        doc.latestDiff.fields.forEach((field: any) => {
          diffData.push([
            doc.typeLabel,
            doc.documentNo,
            `v${doc.version}`,
            field.field,
            JSON.stringify(field.oldValue),
            JSON.stringify(field.newValue),
            field.changeType === 'ADD' ? '新增' : field.changeType === 'DELETE' ? '删除' : '修改',
            doc.latestDiff.modifiedBy,
            doc.latestDiff.modifiedAt,
            doc.latestDiff.reason
          ]);
        });
      });
      const diffWs = XLSX.utils.aoa_to_sheet(diffData);
      XLSX.utils.book_append_sheet(wb, diffWs, '差异对比');
    }

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}

export default new ReportService();
