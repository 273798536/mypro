import Papa from 'papaparse';
import type { ProjectionRecord } from '@/types';
import { detectAnomaly } from './dedupUtils';

export interface ParsedRow {
  originalRowNumber: number;
  imageName: string;
  sourceNote: string;
  projectName: string;
  conclusion: string;
  suggestion: string;
  anomalyType: ProjectionRecord['anomalyType'];
  severity: ProjectionRecord['severity'];
  rawSnapshot: Record<string, string | number>;
}

export async function parseCsvFile(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string | number>>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'utf-8',
      complete: (results) => {
        const rows: ParsedRow[] = results.data
          .map((raw, idx) => {
            const rowNum = Number(raw['row'] ?? raw['行号'] ?? raw['originalRowNumber'] ?? idx + 1);
            const imageName = String(raw['image'] ?? raw['图片名'] ?? raw['imageName'] ?? `row_${rowNum}.tif`);
            const sourceNote = String(raw['source'] ?? raw['来源'] ?? raw['sourceNote'] ?? '');
            const projectName = String(raw['project'] ?? raw['项目'] ?? raw['projectName'] ?? '未命名项目');
            const conclusion = String(raw['conclusion'] ?? raw['结论'] ?? '');
            const suggestion = String(raw['suggestion'] ?? raw['处理意见'] ?? '');
            const { anomalyType, severity } = detectAnomaly(raw);
            return {
              originalRowNumber: Number.isFinite(rowNum) ? rowNum : idx + 1,
              imageName,
              sourceNote,
              projectName,
              conclusion,
              suggestion,
              anomalyType,
              severity,
              rawSnapshot: raw,
            };
          })
          .filter((r) => r.imageName);
        resolve(rows);
      },
      error: (err) => reject(err),
    });
  });
}

export function uid(prefix = 'rec'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
