import * as fs from 'fs';
import csvParser from 'csv-parser';
import { Parser } from 'json2csv';
import { RefundRecord } from '../models';

export interface ImportRow {
  studentId: string;
  cardNo: string;
  source?: string;
}

class ImportExportService {
  static async parseCSV(filePath: string): Promise<ImportRow[]> {
    return new Promise((resolve, reject) => {
      const results: ImportRow[] = [];
      
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (data: Record<string, string>) => {
          results.push({
            studentId: data.studentId || data['学号'] || data['student_id'] || '',
            cardNo: data.cardNo || data['卡号'] || data['card_no'] || '',
            source: data.source || data['来源'] || 'CSV导入'
          });
        })
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  static async exportToCSV(records: RefundRecord[]): Promise<string> {
    const fields = [
      { label: '记录编号', value: 'recordNo' },
      { label: '批次号', value: 'batchNo' },
      { label: '学号', value: 'studentId' },
      { label: '姓名', value: 'name' },
      { label: '卡号', value: 'cardNo' },
      { label: '原余额', value: 'originalBalance' },
      { label: '自充退款', value: 'selfRechargeRefund' },
      { label: '补贴退款', value: 'subsidyRefund' },
      { label: '不可退金额', value: 'nonRefundableAmount' },
      { label: '实际退款', value: 'actualRefundAmount' },
      { label: '状态', value: 'status' },
      { label: '状态原因', value: 'statusReason' },
      { label: '警告信息', value: 'warnings' },
      { label: '银行卡号', value: 'bankCard' },
      { label: '操作人', value: 'operator' },
      { label: '创建时间', value: 'createdAt' }
    ];

    const json2csvParser = new Parser({ fields });
    return json2csvParser.parse(records.map(r => r.toJSON()));
  }

  static generateExportFilename(batchNo: string): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `退款明细_${batchNo}_${date}.csv`;
  }
}

export default ImportExportService;
