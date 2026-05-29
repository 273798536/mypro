import * as XLSX from 'xlsx';
import {
  LiabilityRecord,
  BadRecord,
  ExportConfig,
  LiabilityFilters,
} from '@/types';
import { formatDate, formatDateTime } from '@/utils/date';
import { formatCurrency, formatMiles } from '@/utils/number';

const EXPORT_FIELD_MAP: Record<string, { label: string; key: string; format?: (v: any, r: any) => string | number }> = {
  memberNo: { label: '会员号', key: 'memberNo' },
  memberName: { label: '会员姓名', key: 'memberName' },
  accountType: { label: '账户类型', key: 'accountType' },
  remainingMiles: { label: '剩余里程', key: 'remainingMiles', format: (v) => formatMiles(v) },
  estimatedLiability: { label: '估算负债(元)', key: 'estimatedLiability', format: (v) => formatCurrency(v) },
  liabilityCoefficient: { label: '负债系数', key: 'liabilityCoefficient' },
  probabilityCoefficient: { label: '概率系数', key: 'probabilityCoefficient' },
  businessCategory: { label: '业务类型', key: 'businessCategory' },
  reviewStatus: { label: '复核状态', key: 'reviewStatus' },
  reviewer: { label: '复核人', key: 'reviewer' },
  reviewTime: { label: '复核时间', key: 'reviewTime', format: (v) => v ? formatDateTime(v) : '-' },
  reviewComment: { label: '复核意见', key: 'reviewComment' },
  isExpired: { label: '是否过期', key: 'isExpired', format: (v) => v ? '是' : '否' },
  expireDate: { label: '过期日期', key: 'expireDate', format: (v) => v ? formatDate(v) : '-' },
  latestTransaction: { label: '最新交易', key: 'latestTransaction', format: (_, r) => r.latestTransaction?.description || '-' },
  exchangeOrdersCount: { label: '兑换订单数', key: 'exchangeOrders', format: (v) => Array.isArray(v) ? v.length : 0 },
  expireRecordsCount: { label: '过期记录数', key: 'expireRecords', format: (v) => Array.isArray(v) ? v.length : 0 },
  createTime: { label: '创建时间', key: 'createTime', format: (v) => formatDateTime(v) },
  updateTime: { label: '更新时间', key: 'updateTime', format: (v) => formatDateTime(v) },
};

const BAD_RECORD_FIELD_MAP: Record<string, { label: string; key: string; format?: (v: any) => string }> = {
  sourceType: { label: '数据来源', key: 'sourceType' },
  sourceFile: { label: '来源文件', key: 'sourceFile' },
  rowNumber: { label: '行号', key: 'rowNumber' },
  errorType: { label: '错误类型', key: 'errorType' },
  errorDescription: { label: '错误描述', key: 'errorDescription' },
  repairSuggestion: { label: '修复建议', key: 'repairSuggestion' },
  isProcessed: { label: '处理状态', key: 'isProcessed', format: (v) => v ? '已处理' : '未处理' },
  processor: { label: '处理人', key: 'processor' },
  processTime: { label: '处理时间', key: 'processTime', format: (v) => v ? formatDateTime(v) : '-' },
  importBatchNo: { label: '导入批次', key: 'importBatchNo' },
  createTime: { label: '创建时间', key: 'createTime', format: (v) => formatDateTime(v) },
};

export class ExportService {
  private filterRecords(records: LiabilityRecord[], filters?: LiabilityFilters): LiabilityRecord[] {
    if (!filters) return records;

    return records.filter(record => {
      if (filters.memberNo && !record.memberNo.toLowerCase().includes(filters.memberNo.toLowerCase())) {
        return false;
      }
      if (filters.memberName && !record.memberName.includes(filters.memberName)) {
        return false;
      }
      if (filters.accountType && filters.accountType.length > 0 && !filters.accountType.includes(record.accountType)) {
        return false;
      }
      if (filters.minMiles !== undefined && record.remainingMiles < filters.minMiles) {
        return false;
      }
      if (filters.maxMiles !== undefined && record.remainingMiles > filters.maxMiles) {
        return false;
      }
      if (filters.minLiability !== undefined && record.estimatedLiability < filters.minLiability) {
        return false;
      }
      if (filters.maxLiability !== undefined && record.estimatedLiability > filters.maxLiability) {
        return false;
      }
      if (filters.expireDateFrom && record.expireDate && record.expireDate < filters.expireDateFrom) {
        return false;
      }
      if (filters.expireDateTo && record.expireDate && record.expireDate > filters.expireDateTo) {
        return false;
      }
      if (filters.businessCategory && filters.businessCategory.length > 0 && !filters.businessCategory.includes(record.businessCategory)) {
        return false;
      }
      if (filters.reviewStatus && filters.reviewStatus.length > 0 && !filters.reviewStatus.includes(record.reviewStatus)) {
        return false;
      }
      if (!filters.includeExpired && record.isExpired) {
        return false;
      }
      return true;
    });
  }

  private generateFileName(config: ExportConfig): string {
    const timestamp = formatDate(new Date(), 'yyyyMMdd_HHmmss');
    if (config.fileName) {
      return `${config.fileName}_${timestamp}.${config.format}`;
    }
    return `航司里程兑付负债_${timestamp}.${config.format}`;
  }

  private formatDataForExport(
    records: LiabilityRecord[],
    fields: string[]
  ): Array<Record<string, string | number>> {
    return records.map(record => {
      const row: Record<string, string | number> = {};
      fields.forEach(fieldKey => {
        const fieldConfig = EXPORT_FIELD_MAP[fieldKey];
        if (fieldConfig) {
          const value = (record as any)[fieldConfig.key];
          row[fieldConfig.label] = fieldConfig.format ? fieldConfig.format(value, record) : value;
        }
      });
      return row;
    });
  }

  private formatBadRecordsForExport(
    badRecords: BadRecord[],
    fields: string[]
  ): Array<Record<string, string | number>> {
    return badRecords.map(record => {
      const row: Record<string, string | number> = {};
      fields.forEach(fieldKey => {
        const fieldConfig = BAD_RECORD_FIELD_MAP[fieldKey];
        if (fieldConfig) {
          const value = (record as any)[fieldConfig.key];
          row[fieldConfig.label] = fieldConfig.format ? fieldConfig.format(value) : value;
        }
      });
      return row;
    });
  }

  async exportToExcel(
    records: LiabilityRecord[],
    config: ExportConfig,
    badRecords?: BadRecord[]
  ): Promise<string> {
    const filteredRecords = this.filterRecords(records, config.filters);
    const exportData = this.formatDataForExport(filteredRecords, config.fields);
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    ws['!cols'] = config.fields.map(() => ({ wch: 15 }));
    ws['!autofilter'] = { ref: `A1:${String.fromCharCode(64 + config.fields.length)}1` };
    
    XLSX.utils.book_append_sheet(wb, ws, '兑付负债数据');
    
    if (config.includeBadRecords && badRecords && badRecords.length > 0) {
      const badRecordFields = Object.keys(BAD_RECORD_FIELD_MAP);
      const badExportData = this.formatBadRecordsForExport(badRecords, badRecordFields);
      const badWs = XLSX.utils.json_to_sheet(badExportData);
      badWs['!cols'] = badRecordFields.map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(wb, badWs, '坏行记录');
    }
    
    const fileName = this.generateFileName(config);
    XLSX.writeFile(wb, fileName);
    
    return fileName;
  }

  async exportToCSV(
    records: LiabilityRecord[],
    config: ExportConfig
  ): Promise<string> {
    const filteredRecords = this.filterRecords(records, config.filters);
    const exportData = this.formatDataForExport(filteredRecords, config.fields);
    
    if (exportData.length === 0) {
      throw new Error('没有可导出的数据');
    }
    
    const headers = config.fields.map(f => EXPORT_FIELD_MAP[f]?.label || f).join(',');
    const rows = exportData.map(row => 
      Object.values(row).map(v => {
        if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))) {
          return `"${v.replace(/"/g, '""')}"`;
        }
        return v;
      }).join(',')
    );
    
    const csvContent = [headers, ...rows].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const fileName = this.generateFileName(config);
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return fileName;
  }

  async exportData(
    records: LiabilityRecord[],
    config: ExportConfig,
    badRecords?: BadRecord[]
  ): Promise<string> {
    if (config.format === 'xlsx') {
      return this.exportToExcel(records, config, badRecords);
    } else {
      return this.exportToCSV(records, config);
    }
  }

  getAvailableFields(): Array<{ key: string; label: string; defaultSelected: boolean }> {
    const defaultFields = ['memberNo', 'memberName', 'accountType', 'remainingMiles', 'estimatedLiability', 'businessCategory', 'reviewStatus', 'expireDate', 'isExpired'];
    
    return Object.entries(EXPORT_FIELD_MAP).map(([key, config]) => ({
      key,
      label: config.label,
      defaultSelected: defaultFields.includes(key),
    }));
  }

  getFieldConfig(fieldKey: string): { label: string; key: string; format?: (v: any, r: any) => string | number } | undefined {
    return EXPORT_FIELD_MAP[fieldKey];
  }

  getBadRecordFieldMap() {
    return BAD_RECORD_FIELD_MAP;
  }

  getExportFieldMap() {
    return EXPORT_FIELD_MAP;
  }
}
