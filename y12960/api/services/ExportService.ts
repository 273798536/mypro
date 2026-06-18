import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import type { ChangeRecord, SchemaCompareResult, SchemaField } from '../../shared/types';

export class ExportService {
  async exportChangesToExcel(records: ChangeRecord[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('数据字典变更记录');

    worksheet.columns = [
      { header: '记录编号', key: 'recordNo', width: 20 },
      { header: '表名', key: 'tableName', width: 25 },
      { header: '字段名', key: 'fieldName', width: 25 },
      { header: '变更类型', key: 'changeType', width: 12 },
      { header: '状态', key: 'status', width: 12 },
      { header: '异常数', key: 'anomalyCount', width: 10 },
      { header: '工单编号', key: 'ticketNo', width: 18 },
      { header: '业务描述', key: 'businessDesc', width: 30 },
      { header: '申请人', key: 'requester', width: 15 },
      { header: '原类型', key: 'beforeType', width: 20 },
      { header: '新类型', key: 'afterType', width: 20 },
      { header: '处理意见', key: 'handlingOpinion', width: 40 },
      { header: '创建时间', key: 'createdAt', width: 22 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A5F' },
    };
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

    records.forEach((record) => {
      worksheet.addRow({
        recordNo: record.recordNo,
        tableName: record.tableName,
        fieldName: record.fieldName,
        changeType: this.getChangeTypeText(record.changeType),
        status: this.getStatusText(record.status),
        anomalyCount: record.anomalies.length,
        ticketNo: record.sourceInfo.ticketNo,
        businessDesc: record.sourceInfo.businessDesc,
        requester: record.sourceInfo.requester,
        beforeType: record.schemaBefore.type,
        afterType: record.schemaAfter.type,
        handlingOpinion: record.handlingOpinion,
        createdAt: record.createdAt,
      });
    });

    const anomaliesSheet = workbook.addWorksheet('异常详情');
    anomaliesSheet.columns = [
      { header: '记录编号', key: 'recordNo', width: 20 },
      { header: '表名', key: 'tableName', width: 25 },
      { header: '字段名', key: 'fieldName', width: 25 },
      { header: '异常类型', key: 'anomalyType', width: 18 },
      { header: '严重程度', key: 'severity', width: 12 },
      { header: '异常描述', key: 'description', width: 50 },
    ];

    const anomaliesHeader = anomaliesSheet.getRow(1);
    anomaliesHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    anomaliesHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A5F' },
    };

    records.forEach((record) => {
      record.anomalies.forEach((anomaly) => {
        anomaliesSheet.addRow({
          recordNo: record.recordNo,
          tableName: record.tableName,
          fieldName: record.fieldName,
          anomalyType: this.getAnomalyTypeText(anomaly.type),
          severity: this.getSeverityText(anomaly.severity),
          description: anomaly.description,
        });
      });
    });

    const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
    return buffer;
  }

  async exportSchemaCompareToExcel(result: SchemaCompareResult): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    const summarySheet = workbook.addWorksheet('对比概览');
    summarySheet.addRow(['表名', result.tableName]);
    summarySheet.addRow(['版本对比', `${result.version1} -> ${result.version2}`]);
    summarySheet.addRow(['']);
    summarySheet.addRow(['统计项', '数量']);
    summarySheet.addRow(['总字段数', result.statistics.total]);
    summarySheet.addRow(['新增字段', result.statistics.added]);
    summarySheet.addRow(['删除字段', result.statistics.deleted]);
    summarySheet.addRow(['修改字段', result.statistics.modified]);

    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(4).font = { bold: true };
    summarySheet.getColumn(1).width = 20;
    summarySheet.getColumn(2).width = 40;

    if (result.addedFields.length > 0) {
      const addedSheet = workbook.addWorksheet('新增字段');
      this.addSchemaFieldSheet(addedSheet, result.addedFields, '00FF00');
    }

    if (result.deletedFields.length > 0) {
      const deletedSheet = workbook.addWorksheet('删除字段');
      this.addSchemaFieldSheet(deletedSheet, result.deletedFields, 'FF0000');
    }

    if (result.modifiedFields.length > 0) {
      const modifiedSheet = workbook.addWorksheet('修改字段');
      modifiedSheet.columns = [
        { header: '字段名', key: 'name', width: 25 },
        { header: '变更属性', key: 'property', width: 15 },
        { header: '原值', key: 'oldValue', width: 25 },
        { header: '新值', key: 'newValue', width: 25 },
      ];

      const headerRow = modifiedSheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF59E0B' },
      };

      result.modifiedFields.forEach(({ field, changes }) => {
        changes.forEach((change) => {
          modifiedSheet.addRow({
            name: field.name,
            property: change.property,
            oldValue: String(change.oldValue ?? ''),
            newValue: String(change.newValue ?? ''),
          });
        });
      });
    }

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  private addSchemaFieldSheet(
    sheet: ExcelJS.Worksheet,
    fields: SchemaField[],
    headerColor: string
  ) {
    sheet.columns = [
      { header: '字段名', key: 'name', width: 25 },
      { header: '类型', key: 'type', width: 20 },
      { header: '可空', key: 'nullable', width: 8 },
      { header: '默认值', key: 'defaultValue', width: 20 },
      { header: '注释', key: 'comment', width: 40 },
      { header: '长度', key: 'length', width: 8 },
      { header: '精度', key: 'precision', width: 8 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${headerColor}` },
    };

    fields.forEach((field) => {
      sheet.addRow({
        name: field.name,
        type: field.type,
        nullable: field.nullable ? '是' : '否',
        defaultValue: field.defaultValue,
        comment: field.comment,
        length: field.length || '',
        precision: field.precision || '',
      });
    });
  }

  async exportToPDF(records: ChangeRecord[], title: string): Promise<Buffer> {
    const doc = new jsPDF();
    let yOffset = 20;

    doc.setFontSize(18);
    doc.text(title, 105, yOffset, { align: 'center' });
    yOffset += 15;

    doc.setFontSize(12);
    doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, 14, yOffset);
    yOffset += 10;
    doc.text(`记录总数: ${records.length}`, 14, yOffset);
    yOffset += 10;

    const availableCount = records.filter((r) => r.status === 'AVAILABLE').length;
    const pendingCount = records.filter((r) => r.status === 'PENDING_REVIEW').length;
    const unavailableCount = records.filter((r) => r.status === 'UNAVAILABLE').length;

    doc.text(`可用: ${availableCount} | 待复核: ${pendingCount} | 不可用: ${unavailableCount}`, 14, yOffset);
    yOffset += 15;

    records.forEach((record, index) => {
      if (yOffset > 270) {
        doc.addPage();
        yOffset = 20;
      }

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`${index + 1}. ${record.recordNo} - ${record.tableName}.${record.fieldName}`, 14, yOffset);
      yOffset += 7;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.text(`变更类型: ${this.getChangeTypeText(record.changeType)}`, 20, yOffset);
      yOffset += 5;
      doc.text(`状态: ${this.getStatusText(record.status)}`, 20, yOffset);
      yOffset += 5;
      doc.text(`工单: ${record.sourceInfo.ticketNo} | 申请人: ${record.sourceInfo.requester}`, 20, yOffset);
      yOffset += 5;
      doc.text(`业务描述: ${record.sourceInfo.businessDesc}`, 20, yOffset);
      yOffset += 5;

      if (record.anomalies.length > 0) {
        doc.setTextColor(239, 68, 68);
        doc.text(`异常 (${record.anomalies.length}项):`, 20, yOffset);
        yOffset += 5;
        record.anomalies.forEach((a) => {
          doc.text(`- ${this.getAnomalyTypeText(a.type)}: ${a.description}`, 25, yOffset);
          yOffset += 5;
        });
        doc.setTextColor(0, 0, 0);
      }

      if (record.handlingOpinion) {
        doc.setTextColor(59, 130, 246);
        doc.text(`处理意见: ${record.handlingOpinion}`, 20, yOffset);
        yOffset += 5;
        doc.setTextColor(0, 0, 0);
      }

      yOffset += 5;
    });

    return Buffer.from(doc.output('arraybuffer'));
  }

  private getChangeTypeText(type: string): string {
    const map: Record<string, string> = {
      ADD: '新增',
      MODIFY: '修改',
      DELETE: '删除',
      RENAME: '重命名',
    };
    return map[type] || type;
  }

  private getStatusText(status: string): string {
    const map: Record<string, string> = {
      AVAILABLE: '可用',
      PENDING_REVIEW: '待复核',
      UNAVAILABLE: '不可用',
    };
    return map[status] || status;
  }

  private getAnomalyTypeText(type: string): string {
    const map: Record<string, string> = {
      NULL_VALUE: '空值问题',
      DUPLICATE: '重复记录',
      MIXED_NOTES: '备注混写',
      BACKUP_GAP: '备份缺口',
      OTHER: '其他问题',
    };
    return map[type] || type;
  }

  private getSeverityText(severity: string): string {
    const map: Record<string, string> = {
      LOW: '低',
      MEDIUM: '中',
      HIGH: '高',
    };
    return map[severity] || severity;
  }
}

export const exportService = new ExportService();
