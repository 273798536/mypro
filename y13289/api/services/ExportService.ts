import * as XLSX from 'xlsx';
import { RecordService } from './RecordService';
import { HistoryRepository } from '../repositories/HistoryRepository';
import type { DeliveryRecord, ExportOptions, FilterCriteria } from '@shared/types';

export class ExportService {
  private recordService = new RecordService();
  private historyRepo = new HistoryRepository();

  async exportToExcel(filters: FilterCriteria, options: ExportOptions): Promise<Buffer> {
    const records = await this.recordService.getAllRecords(filters);

    const exportData: any[] = [];

    for (const record of records) {
      const row: any = {
        '记录编号': record.recordId,
        '菜场名称': record.marketName,
        '卸货地点': record.location,
        '经度': record.coordinates.lng,
        '纬度': record.coordinates.lat,
        '卸货时间': record.deliveryTime,
        '车牌号': record.truckNumber,
        '货物类型': record.goodsType,
        '状态': this.getStatusLabel(record.status),
        '数据来源': record.source === 'excel' ? 'Excel导入' : '手工录入',
        '来源文件': record.sourceFile || '',
      };

      if (options.includeRawData) {
        row['菜场名称(原始)'] = record.marketNameRaw;
        row['卸货地点(原始)'] = record.locationRaw;
        row['经度(原始)'] = record.coordinatesRaw.lng;
        row['纬度(原始)'] = record.coordinatesRaw.lat;
        row['卸货时间(原始)'] = record.deliveryTimeRaw;
        row['车牌号(原始)'] = record.truckNumberRaw;
        row['货物类型(原始)'] = record.goodsTypeRaw;
      }

      if (options.includeIssues && record.issues.length > 0) {
        const unresolvedIssues = record.issues.filter(i => !i.resolved);
        row['问题数量'] = unresolvedIssues.length;
        row['问题描述'] = unresolvedIssues.map(i => `${this.getIssueTypeLabel(i.type)}: ${i.description}`).join('; ');
        row['处理建议'] = unresolvedIssues.map(i => i.suggestion).join('; ');
      }

      if (record.mergeEvidence) {
        row['归并说明'] = `归并了 ${record.mergeEvidence.mergedNames.join('、')}，原因：${record.mergeEvidence.reason}`;
      }

      if (options.includeHistory) {
        const histories = this.historyRepo.getByRecordId(record.id);
        row['修改次数'] = histories.length;
        row['修改记录'] = histories.map(h => `${h.operateTime} ${h.operator} 修改${h.field}: ${h.oldValue} → ${h.newValue}${h.note ? ` (${h.note})` : ''}`).join('\n');
      }

      exportData.push(row);
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(10, Math.min(50, key.length * 2 + 10)),
    }));
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, '卸货清单');

    if (options.filterNote) {
      const noteSheet = XLSX.utils.aoa_to_sheet([
        ['筛选口径说明'],
        [options.filterNote],
        ['导出时间', new Date().toLocaleString('zh-CN')],
      ]);
      noteSheet['!cols'] = [{ wch: 20 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(workbook, noteSheet, '筛选说明');
    }

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async getExportPreview(filters: FilterCriteria): Promise<{ records: DeliveryRecord[]; count: number; filterNote: string }> {
    const records = await this.recordService.getAllRecords(filters);
    const filterNote = this.generateFilterNote(filters, records.length);
    return { records, count: records.length, filterNote };
  }

  private generateFilterNote(filters: FilterCriteria, count: number): string {
    const parts: string[] = [];

    if (filters.status) {
      parts.push(`状态筛选：${this.getStatusLabel(filters.status as any)}`);
    }
    if (filters.source) {
      parts.push(`来源筛选：${filters.source === 'excel' ? 'Excel导入' : '手工录入'}`);
    }
    if (filters.searchText) {
      parts.push(`关键词：${filters.searchText}`);
    }
    if (filters.goodsType) {
      parts.push(`货物类型：${filters.goodsType}`);
    }
    if (filters.dateFrom) {
      parts.push(`日期从：${filters.dateFrom}`);
    }
    if (filters.dateTo) {
      parts.push(`日期至：${filters.dateTo}`);
    }

    parts.push(`共 ${count} 条记录`);
    parts.push(`导出时间：${new Date().toLocaleString('zh-CN')}`);

    return parts.join('；');
  }

  private getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: '待处理',
      cleaned: '已清洗',
      conflict: '有冲突',
      merged: '已归并',
    };
    return map[status] || status;
  }

  private getIssueTypeLabel(type: string): string {
    const map: Record<string, string> = {
      coordinate_offset: '坐标偏移',
      location_inconsistent: '地点不一致',
      name_inconsistent: '名称不一致',
      missing_data: '数据缺失',
      time_conflict: '时间冲突',
    };
    return map[type] || type;
  }
}
