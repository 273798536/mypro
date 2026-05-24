import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import xlsx from 'xlsx';

export interface FileReaderOptions {
  sheetName?: string;
  hasHeader?: boolean;
  delimiter?: string;
  encoding?: BufferEncoding;
}

export interface RowData {
  [key: string]: string | number | boolean | null;
}

export class FileReader {
  static async readCSV(
    filePath: string,
    options: FileReaderOptions = {}
  ): Promise<RowData[]> {
    return new Promise((resolve, reject) => {
      const results: RowData[] = [];
      const stream = fs.createReadStream(filePath, {
        encoding: options.encoding || 'utf-8'
      });

      stream
        .pipe(csv({ separator: options.delimiter || ',' }))
        .on('data', (data: Record<string, string>) => {
          const row: RowData = {};
          for (const [key, value] of Object.entries(data)) {
            row[key.trim()] = this.parseValue(value);
          }
          results.push(row);
        })
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  static readExcel(
    filePath: string,
    options: FileReaderOptions = {}
  ): RowData[] {
    const workbook = xlsx.readFile(filePath);
    const sheetName = options.sheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      throw new Error(`Sheet ${sheetName} not found in workbook`);
    }

    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      header: options.hasHeader === false ? 1 : undefined,
      raw: false
    }) as Record<string, unknown>[];

    return jsonData.map(row => {
      const result: RowData = {};
      for (const [key, value] of Object.entries(row)) {
        result[key.trim()] = value as string | number | boolean | null;
      }
      return result;
    });
  }

  static async readAuto(
    filePath: string,
    options: FileReaderOptions = {}
  ): Promise<RowData[]> {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.csv') {
      return this.readCSV(filePath, options);
    } else if (['.xlsx', '.xls', '.xlsm'].includes(ext)) {
      return this.readExcel(filePath, options);
    } else {
      throw new Error(`Unsupported file format: ${ext}`);
    }
  }

  private static parseValue(value: string): string | number | boolean | null {
    const trimmed = value.trim();
    
    if (trimmed === '' || trimmed === 'null' || trimmed === 'NULL') {
      return null;
    }
    
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') {
      return num;
    }
    
    return trimmed;
  }

  static detectFileType(filePath: string): 'csv' | 'excel' | 'unknown' {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.csv') return 'csv';
    if (['.xlsx', '.xls', '.xlsm'].includes(ext)) return 'excel';
    return 'unknown';
  }

  static getSheetNames(filePath: string): string[] {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.xlsx', '.xls', '.xlsm'].includes(ext)) {
      return [];
    }
    const workbook = xlsx.readFile(filePath);
    return workbook.SheetNames;
  }
}
