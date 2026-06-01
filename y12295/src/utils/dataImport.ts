import Papa from 'papaparse';
import type { DataPoint } from '../types';
import { reduceTo3D } from './dimensionalityReduction';

export interface ImportConfig {
  vectorFields: string[];
  labelField: string;
  groupField: string;
  confidenceField?: string;
  predictedLabelField?: string;
}

export async function parseCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data as any[]),
      error: (error) => reject(error),
    });
  });
}

export async function parseJSON(file: File): Promise<any[]> {
  const text = await file.text();
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : [data];
}

export function convertToDataPoints(
  rawData: any[],
  config: ImportConfig
): DataPoint[] {
  const vectors: number[][] = [];
  const validIndices: number[] = [];
  
  rawData.forEach((row, index) => {
    const vector = config.vectorFields.map(field => {
      const val = parseFloat(row[field]);
      return isNaN(val) ? 0 : val;
    });
    
    if (vector.every(v => !isNaN(v))) {
      vectors.push(vector);
      validIndices.push(index);
    }
  });
  
  const embeddings = reduceTo3D(vectors);
  
  const points: DataPoint[] = validIndices.map((rawIndex, embIndex) => {
    const row = rawData[rawIndex];
    const confidence = config.confidenceField
      ? parseFloat(row[config.confidenceField]) || 0.5
      : 0.7;
    
    return {
      id: `point-${rawIndex}-${Date.now().toString(36)}`,
      vector: vectors[embIndex],
      embedding: embeddings[embIndex],
      trueLabel: String(row[config.labelField] || '未知'),
      predictedLabel: config.predictedLabelField
        ? String(row[config.predictedLabelField])
        : undefined,
      group: String(row[config.groupField] || '默认'),
      confidence: Math.max(0, Math.min(1, confidence)),
      screenshots: [],
    };
  });
  
  return points;
}

export function autoDetectFields(headers: string[]): Partial<ImportConfig> {
  const config: Partial<ImportConfig> = {};
  
  const vectorPatterns = [
    /^v\d+$/i,
    /^vec\d+$/i,
    /^dim\d+$/i,
    /^feature\d+$/i,
    /^feat\d+$/i,
    /^emb\d+$/i,
    /^x\d+$/i,
  ];
  
  const vectorFields = headers.filter(h => 
    vectorPatterns.some(p => p.test(h)) || /^(x|y|z)$/i.test(h)
  );
  
  if (vectorFields.length >= 2) {
    config.vectorFields = vectorFields;
  }
  
  const labelCandidates = ['label', 'true_label', 'truelabel', 'class', 'category', '标签', '真实标签', '类别'];
  config.labelField = headers.find(h => labelCandidates.includes(h.toLowerCase())) || headers[0];
  
  const groupCandidates = ['group', 'batch', 'split', 'dataset', 'subset', '分组', '批次', '数据集'];
  config.groupField = headers.find(h => groupCandidates.includes(h.toLowerCase())) || headers[0];
  
  const confidenceCandidates = ['confidence', 'score', 'prob', 'probability', '置信度', '分数', '概率'];
  config.confidenceField = headers.find(h => confidenceCandidates.includes(h.toLowerCase()));
  
  const predictedCandidates = ['predicted', 'prediction', 'pred', 'predict', '预测标签', '预测'];
  config.predictedLabelField = headers.find(h => predictedCandidates.includes(h.toLowerCase()));
  
  return config;
}

export function exportDataToJSON(points: DataPoint[], filename: string): void {
  const dataStr = JSON.stringify(points, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function takeScreenshot(
  canvas: HTMLCanvasElement,
  selectedPointIds: string[],
  viewState: { position: [number, number, number]; target: [number, number, number] }
): string {
  return canvas.toDataURL('image/png');
}

export function downloadScreenshot(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${filename}.png`;
  link.click();
}
