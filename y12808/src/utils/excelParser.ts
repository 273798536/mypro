import * as XLSX from 'xlsx';
import type { RawSampleRow, CleanIssue } from '@/types';

export function parseExcelFile(file: File): Promise<RawSampleRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
          defval: '',
          raw: false
        }) as Record<string, string>[];

        const rows: RawSampleRow[] = jsonData.map((row) => ({
          barcode: row['条码'] || row['barcode'] || row['样本条码'] || '',
          batchNo: row['批次号'] || row['batchNo'] || row['批次'] || '',
          sampleType: row['样本类型'] || row['sampleType'] || row['类型'] || '',
          name: row['样本名称'] || row['name'] || row['名称'] || '',
          concentration: row['浓度'] || row['concentration'] || '',
          cellCount: row['细胞数'] || row['cellCount'] || row['细胞计数'] || '',
          remark: row['备注'] || row['remark'] || ''
        }));

        resolve(rows);
      } catch (error) {
        reject(new Error('文件解析失败：' + (error as Error).message));
      }
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsArrayBuffer(file);
  });
}

export function parseCSVFile(file: File): Promise<RawSampleRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter((line) => line.trim());

        if (lines.length < 2) {
          reject(new Error('CSV 文件内容不足'));
          return;
        }

        const headers = parseCSVLine(lines[0]);
        const rows: RawSampleRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header.trim()] = values[index] || '';
          });

          rows.push({
            barcode: row['条码'] || row['barcode'] || row['样本条码'] || '',
            batchNo: row['批次号'] || row['batchNo'] || row['批次'] || '',
            sampleType: row['样本类型'] || row['sampleType'] || row['类型'] || '',
            name: row['样本名称'] || row['name'] || row['名称'] || '',
            concentration: row['浓度'] || row['concentration'] || '',
            cellCount: row['细胞数'] || row['cellCount'] || row['细胞计数'] || '',
            remark: row['备注'] || row['remark'] || ''
          });
        }

        resolve(rows);
      } catch (error) {
        reject(new Error('CSV 解析失败：' + (error as Error).message));
      }
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export function detectFileType(file: File): 'excel' | 'csv' | 'unknown' {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return 'excel';
  }
  if (name.endsWith('.csv')) {
    return 'csv';
  }
  return 'unknown';
}
