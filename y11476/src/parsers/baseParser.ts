import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import csv from 'csv-parser';
import * as xlsx from 'xlsx';
import { ParseResult, ParsedRecord, SourceType } from '../models/types';

export abstract class BaseParser<T extends ParsedRecord> {
  protected sourceType: SourceType;

  constructor(sourceType: SourceType) {
    this.sourceType = sourceType;
  }

  abstract parseRow(row: Record<string, string>, lineNumber: number): ParseResult<T>;

  getFileHash(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async parseCSV(filePath: string): Promise<{ results: ParseResult<T>[]; fileHash: string }> {
    const results: ParseResult<T>[] = [];
    const fileHash = this.getFileHash(filePath);
    let lineNumber = 1;

    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath)
        .pipe(csv());

      stream.on('data', (row) => {
        lineNumber++;
        const rawData = JSON.stringify(row);
        try {
          const result = this.parseRow(row, lineNumber);
          results.push({
            ...result,
            rawData
          });
        } catch (error) {
          results.push({
            success: false,
            error: `解析异常: ${(error as Error).message}`,
            lineNumber,
            rawData
          });
        }
      });

      stream.on('end', () => {
        resolve({ results, fileHash });
      });

      stream.on('error', (error) => {
        reject(new Error(`读取CSV文件失败: ${error.message}`));
      });
    });
  }

  parseExcel(filePath: string): { results: ParseResult<T>[]; fileHash: string } {
    const fileHash = this.getFileHash(filePath);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet) as Record<string, string>[];
    
    const results: ParseResult<T>[] = [];
    
    rows.forEach((row, index) => {
      const lineNumber = index + 2;
      const rawData = JSON.stringify(row);
      try {
        const result = this.parseRow(row, lineNumber);
        results.push({
          ...result,
          rawData
        });
      } catch (error) {
        results.push({
          success: false,
          error: `解析异常: ${(error as Error).message}`,
          lineNumber,
          rawData
        });
      }
    });

    return { results, fileHash };
  }

  async parseFile(filePath: string): Promise<{ results: ParseResult<T>[]; fileHash: string; fileName: string }> {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);

    if (ext === '.csv') {
      const { results, fileHash } = await this.parseCSV(filePath);
      return { results, fileHash, fileName };
    } else if (ext === '.xlsx' || ext === '.xls') {
      const { results, fileHash } = this.parseExcel(filePath);
      return { results, fileHash, fileName };
    } else {
      throw new Error(`不支持的文件格式: ${ext}，仅支持 .csv, .xlsx, .xls`);
    }
  }
}
