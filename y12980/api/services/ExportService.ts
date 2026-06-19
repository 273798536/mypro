import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { LedgerRepository } from '../repositories/LedgerRepository.js';
import type { LedgerRecord, ExportRequest, ExportResult, STATUS_LABELS, ANOMALY_LABELS, SOURCE_TYPE_LABELS } from '../../shared/types.js';

const statusLabels = {
  AVAILABLE: '可用',
  NEEDS_REVIEW: '需DBA复核',
  UNAVAILABLE: '不可用',
} as const;

const anomalyLabels = {
  SLOW_QUERY_CONFLICT: '慢查询冲突',
  SCHEMA_CONFLICT: '表结构冲突',
  BACKUP_GAP: '备份缺口',
  DUPLICATE_IMPORT: '重复导入',
  NONE: '无异常',
} as const;

const sourceTypeLabels = {
  SLOW_QUERY_LOG: '慢查询日志',
  SCHEMA_SNAPSHOT: '表结构快照',
} as const;

export class ExportService {
  private ledgerRepo: LedgerRepository;
  private exportDir: string;

  constructor() {
    this.ledgerRepo = new LedgerRepository();
    this.exportDir = process.cwd() + '/exports';
  }

  async generateExport(request: ExportRequest): Promise<ExportResult> {
    const params: Parameters<LedgerRepository['findPaginated']>[0] = {
      page: 1,
      pageSize: 10000,
    };

    if (request.scope === 'BY_STATUS' && request.status) {
      params.status = request.status;
    }
    if (request.scope === 'BY_DATE') {
      if (request.startDate) params.startDate = request.startDate;
      if (request.endDate) params.endDate = request.endDate;
    }

    const result = this.ledgerRepo.findPaginated(params);
    const records = result.data;

    const exportId = uuidv4();
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `台账导出_${timestamp}_${exportId.slice(0, 8)}.${request.format === 'EXCEL' ? 'xlsx' : 'csv'}`;
    const filePath = `${this.exportDir}/${fileName}`;

    const exportData = records.map(record => ({
      '记录编号': record.recordNo,
      '状态': statusLabels[record.status],
      '异常类型': anomalyLabels[record.anomalyType],
      '来源文件': record.sourceFile,
      '原始行号': record.originalLineNo,
      '来源类型': sourceTypeLabels[record.sourceType],
      '导入批次': record.importBatchId,
      '冲突详情': record.conflictDetails || '',
      '处理意见': record.handlingOpinion || '',
      '业务备注': record.businessNotes || '',
      '来源备注': record.sourceRemark || '',
      '图片名称': record.imageName || '',
      '创建时间': record.createdAt,
      '处理人': record.handledBy || '',
      '处理时间': record.handledAt || '',
    }));

    if (request.format === 'EXCEL') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      ws['!cols'] = [
        { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 30 }, { wch: 10 },
        { wch: 14 }, { wch: 36 }, { wch: 40 }, { wch: 30 }, { wch: 20 },
        { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 12 }, { wch: 22 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, '台账记录');

      if (records.some(r => r.anomalyType === 'BACKUP_GAP' || r.status === 'UNAVAILABLE')) {
        const gapData = records
          .filter(r => r.status === 'UNAVAILABLE')
          .map(record => ({
            '记录编号': record.recordNo,
            '异常类型': anomalyLabels[record.anomalyType],
            '来源文件': record.sourceFile,
            '原始行号': record.originalLineNo,
            '冲突详情': record.conflictDetails || '',
            '不可用原因': record.handlingOpinion || '待DBA确认',
          }));
        
        if (gapData.length > 0) {
          const gapWs = XLSX.utils.json_to_sheet(gapData);
          gapWs['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 30 }, { wch: 10 }, { wch: 40 }, { wch: 30 }];
          XLSX.utils.book_append_sheet(wb, gapWs, '不可用记录清单');
        }
      }

      const summaryData = [
        { '项目': '导出时间', '值': new Date().toLocaleString('zh-CN') },
        { '项目': '导出范围', '值': this.getScopeDescription(request) },
        { '项目': '总记录数', '值': records.length },
        { '项目': '可用记录', '值': records.filter(r => r.status === 'AVAILABLE').length },
        { '项目': '需复核记录', '值': records.filter(r => r.status === 'NEEDS_REVIEW').length },
        { '项目': '不可用记录', '值': records.filter(r => r.status === 'UNAVAILABLE').length },
      ];
      
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      summaryWs['!cols'] = [{ wch: 15 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, summaryWs, '导出汇总');

      XLSX.writeFile(wb, filePath);
    } else {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const csvWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(csvWb, ws, '台账记录');
      XLSX.writeFile(csvWb, filePath);
    }

    return {
      exportId,
      fileName,
      recordCount: records.length,
      downloadUrl: `/api/export/${exportId}/download`,
    };
  }

  private getScopeDescription(request: ExportRequest): string {
    switch (request.scope) {
      case 'ALL': return '全部记录';
      case 'BY_STATUS': return `状态筛选: ${statusLabels[request.status!]}`;
      case 'BY_BATCH': return `批次筛选: ${request.batchId}`;
      case 'BY_DATE': return `时间范围: ${request.startDate || '不限'} 至 ${request.endDate || '不限'}`;
      default: return '全部记录';
    }
  }

  getExportPath(exportId: string): string | null {
    const fs = require('fs');
    if (!fs.existsSync(this.exportDir)) return null;
    
    const files = fs.readdirSync(this.exportDir);
    const match = files.find(f => f.includes(exportId.slice(0, 8)));
    return match ? `${this.exportDir}/${match}` : null;
  }
}
