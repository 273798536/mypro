import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { FieldMapping, ImportPreview } from '@/types';

const TARGET_FIELDS: { value: FieldMapping['targetField']; label: string }[] = [
  { value: 'title', label: '歌曲名' },
  { value: 'artist', label: '歌手' },
  { value: 'year', label: '年代' },
  { value: 'genre', label: '流派' },
  { value: 'language', label: '语言' },
  { value: 'region', label: '地区' },
  { value: 'tags', label: '标签' },
];

export { TARGET_FIELDS };

function guessMapping(header: string): FieldMapping['targetField'] {
  const h = header.toLowerCase().trim();
  if (/歌[曲名]/.test(h) || h === 'title' || h === 'song') return 'title';
  if (/歌手|演唱|artist|singer/.test(h)) return 'artist';
  if (/年[代份]|year/.test(h)) return 'year';
  if (/流派|风格|genre|style/.test(h)) return 'genre';
  if (/语言|语种|language|lang/.test(h)) return 'language';
  if (/地区|地域|region|area/.test(h)) return 'region';
  if (/标签|标记|tag|label/.test(h)) return 'tags';
  return null;
}

export function parseCSVFile(file: File): Promise<ImportPreview> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];
        const mappings: FieldMapping[] = headers.map((h) => ({
          sourceField: h,
          targetField: guessMapping(h),
        }));
        resolve({ filename: file.name, headers, rows, mappings });
      },
      error(err: Error) {
        reject(err);
      },
    });
  });
}

export function parseExcelFile(file: File): Promise<ImportPreview> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

        if (jsonData.length === 0) {
          reject(new Error('Excel文件为空'));
          return;
        }

        const headers = Object.keys(jsonData[0]);
        const mappings: FieldMapping[] = headers.map((h) => ({
          sourceField: h,
          targetField: guessMapping(h),
        }));
        resolve({ filename: file.name, headers, rows: jsonData, mappings });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

export function parseFile(file: File): Promise<ImportPreview> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'csv') return parseCSVFile(file);
  if (['xlsx', 'xls'].includes(ext || '')) return parseExcelFile(file);
  return Promise.reject(new Error(`不支持的文件格式: .${ext}`));
}
