import Papa from 'papaparse';
import type { Sample, ModelVersion, AttributeOutput } from '@/types';
import { generateId } from './format';

export interface CsvColumnMapping {
  productId: string;
  productName: string;
  imageUrl?: string;
  category?: string;
  attributes: {
    csvColumn: string;
    attributeName: string;
  }[];
  confidenceColumns?: {
    csvColumn: string;
    attributeName: string;
  }[];
}

export function parseCsvFile(
  file: File,
): Promise<{ data: Record<string, string>[]; headers: string[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        const headers = results.meta.fields || [];
        resolve({ data, headers });
      },
      error: (error) => reject(error),
    });
  });
}

export function csvDataToSamples(
  csvData: Record<string, string>[],
  mapping: CsvColumnMapping,
  modelVersion: ModelVersion,
): Sample[] {
  return csvData.map((row) => {
    const sampleId = generateId('sample');
    const attributes: Record<string, AttributeOutput> = {};

    mapping.attributes.forEach(({ csvColumn, attributeName }) => {
      const value = row[csvColumn] || '';
      const confidenceCol = mapping.confidenceColumns?.find(
        (c) => c.attributeName === attributeName,
      );
      const confidence = confidenceCol
        ? parseFloat(row[confidenceCol.csvColumn]) || 0.5
        : 0.7;

      attributes[attributeName] = {
        name: attributeName,
        versions: {
          [modelVersion.id]: {
            value,
            confidence,
            evidence: `模型${modelVersion.name}输出`,
          },
        },
      };
    });

    return {
      id: sampleId,
      productId: row[mapping.productId] || generateId('prod'),
      productName: row[mapping.productName] || '未命名商品',
      imageUrl: mapping.imageUrl ? row[mapping.imageUrl] : '',
      category: mapping.category ? row[mapping.category] : '未分类',
      isBoundary: false,
      reviewStatus: 'pending',
      attributes,
      notes: [],
      leakRisk: 'none',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });
}

export interface ExportOptions {
  includeHistory?: boolean;
  includeNotes?: boolean;
  includeConfidence?: boolean;
  attributeNames?: string[];
}

export function exportSamplesToCsv(
  samples: Sample[],
  modelVersions: ModelVersion[],
  options: ExportOptions = {},
): string {
  const rows: Record<string, string | number>[] = [];
  const allAttrNames = options.attributeNames || [
    ...new Set(
      samples.flatMap((s) => Object.keys(s.attributes)),
    ),
  ];

  samples.forEach((sample) => {
    const row: Record<string, string | number> = {
      样本ID: sample.id,
      商品ID: sample.productId,
      商品名称: sample.productName,
      类目: sample.category,
      是否边界样本: sample.isBoundary ? '是' : '否',
      复核状态: getStatusText(sample.reviewStatus),
      泄漏风险: getLeakText(sample.leakRisk),
    };

    modelVersions.forEach((mv) => {
      allAttrNames.forEach((attrName) => {
        const attr = sample.attributes[attrName];
        const versionData = attr?.versions[mv.id];
        if (versionData) {
          row[`${mv.name}_${attrName}`] = versionData.value;
          if (options.includeConfidence) {
            row[`${mv.name}_${attrName}_置信度`] = (versionData.confidence * 100).toFixed(1) + '%';
          }
        }
      });
    });

    allAttrNames.forEach((attrName) => {
      const attr = sample.attributes[attrName];
      if (attr?.finalValue || attr?.manualValue) {
        row[`最终判定_${attrName}`] = attr.finalValue || attr.manualValue || '';
      }
    });

    if (options.includeNotes) {
      row['备注'] = sample.notes.map((n) => `[${n.author}] ${n.content}`).join('; ');
    }

    if (options.includeHistory) {
      row['操作次数'] = sample.notes.length + (sample.isBoundary ? 1 : 0);
    }

    rows.push(row);
  });

  return Papa.unparse(rows);
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待复核',
    reviewing: '复核中',
    confirmed: '已确认',
    disputed: '有争议',
  };
  return map[status] || status;
}

function getLeakText(level: string): string {
  const map: Record<string, string> = {
    none: '无风险',
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  };
  return map[level] || level;
}

export function downloadCsv(content: string, filename: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
