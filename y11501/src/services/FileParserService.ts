import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import { DataSourceType } from '../types';

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, any>;
}

export class FileParserService {
  async parseFile(filePath: string, sourceType: DataSourceType): Promise<ParsedRow[]> {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.csv') {
      return this.parseCsv(filePath);
    } else if (ext === '.xlsx' || ext === '.xls') {
      return this.parseExcel(filePath, sourceType);
    } else {
      throw new Error(`不支持的文件格式: ${ext}`);
    }
  }

  private parseCsv(filePath: string): Promise<ParsedRow[]> {
    return new Promise((resolve, reject) => {
      const results: ParsedRow[] = [];
      let rowNumber = 1;

      fs.createReadStream(filePath, { encoding: 'utf-8' })
        .pipe(csv())
        .on('data', (data: Record<string, any>) => {
          rowNumber++;
          results.push({
            rowNumber,
            data: this.normalizeData(data)
          });
        })
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  private parseExcel(filePath: string, sourceType: DataSourceType): ParsedRow[] {
    const workbook = XLSX.readFile(filePath);
    const sheetName = this.getSheetNameForSource(sourceType, workbook.SheetNames);
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) {
      return [];
    }

    const headers = jsonData[0].map((h: any) => String(h || '').trim());
    const results: ParsedRow[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const data: Record<string, any> = {};

      for (let j = 0; j < headers.length; j++) {
        if (headers[j]) {
          data[headers[j]] = this.normalizeValue(row[j]);
        }
      }

      const hasData = Object.values(data).some(v => v !== null && v !== undefined && v !== '');
      if (hasData) {
        results.push({
          rowNumber: i + 1,
          data
        });
      }
    }

    return results;
  }

  private getSheetNameForSource(sourceType: DataSourceType, sheetNames: string[]): string {
    if (sheetNames.length === 0) {
      throw new Error('Excel文件中没有工作表');
    }

    const keywords: Record<DataSourceType, string[]> = {
      [DataSourceType.REPAIR_ORDER]: ['维修', '工单', 'repair', 'order'],
      [DataSourceType.SPARE_PART_SCAN]: ['备件', '扫码', 'spare', 'part', 'scan'],
      [DataSourceType.CUSTOMER_RECEIPT]: ['签收', '客户', 'receipt', 'customer'],
      [DataSourceType.MANUAL_PRICE_ADJUST]: ['改价', '调价', 'price', 'adjust'],
      [DataSourceType.SHIFT_RECORD]: ['班次', '考勤', 'shift', 'record']
    };

    const targetKeywords = keywords[sourceType] || [];
    
    for (const sheetName of sheetNames) {
      const lowerName = sheetName.toLowerCase();
      if (targetKeywords.some(kw => lowerName.includes(kw.toLowerCase()))) {
        return sheetName;
      }
    }

    return sheetNames[0];
  }

  private normalizeData(data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      result[this.normalizeKey(key)] = this.normalizeValue(value);
    }
    return result;
  }

  private normalizeKey(key: string): string {
    return String(key || '')
      .trim()
      .replace(/[\s\u3000]+/g, '_')
      .toLowerCase();
  }

  private normalizeValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '' || trimmed === '-' || trimmed === '/' || trimmed === 'N/A') {
        return null;
      }
      return trimmed;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (value instanceof Date) {
      return value;
    }

    return String(value);
  }

  detectSourceType(filePath: string): DataSourceType | null {
    const fileName = path.basename(filePath).toLowerCase();
    const patterns: Record<DataSourceType, RegExp[]> = {
      [DataSourceType.REPAIR_ORDER]: [/repair/, /维修/, /工单/],
      [DataSourceType.SPARE_PART_SCAN]: [/spare/, /part/, /scan/, /备件/, /扫码/],
      [DataSourceType.CUSTOMER_RECEIPT]: [/receipt/, /customer/, /签收/, /客户/],
      [DataSourceType.MANUAL_PRICE_ADJUST]: [/price/, /adjust/, /改价/, /调价/],
      [DataSourceType.SHIFT_RECORD]: [/shift/, /attendance/, /班次/, /考勤/]
    };

    for (const [type, regexList] of Object.entries(patterns) as [DataSourceType, RegExp[]][]) {
      if (regexList.some(regex => regex.test(fileName))) {
        return type;
      }
    }

    return null;
  }
}
