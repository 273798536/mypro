import * as fs from 'fs';
import * as path from 'path';
import { SoloAnalysis, ExportPackage } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const ANALYSIS_FILE = path.join(DATA_DIR, 'analyses.json');
const EXPORT_FILE = path.join(DATA_DIR, 'exports.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadAnalyses(): SoloAnalysis[] {
  ensureDataDir();
  if (!fs.existsSync(ANALYSIS_FILE)) {
    return [];
  }
  const data = fs.readFileSync(ANALYSIS_FILE, 'utf-8');
  return JSON.parse(data);
}

export function saveAnalyses(analyses: SoloAnalysis[]): void {
  ensureDataDir();
  fs.writeFileSync(ANALYSIS_FILE, JSON.stringify(analyses, null, 2), 'utf-8');
}

export function addAnalysis(analysis: SoloAnalysis): void {
  const analyses = loadAnalyses();
  analyses.push(analysis);
  saveAnalyses(analyses);
}

export function updateAnalysis(id: string, analysis: SoloAnalysis): boolean {
  const analyses = loadAnalyses();
  const index = analyses.findIndex(a => a.id === id);
  if (index === -1) return false;
  analyses[index] = analysis;
  saveAnalyses(analyses);
  return true;
}

export function getAnalysisById(id: string): SoloAnalysis | undefined {
  const analyses = loadAnalyses();
  return analyses.find(a => a.id === id);
}

export function deleteAnalysis(id: string): boolean {
  const analyses = loadAnalyses();
  const filtered = analyses.filter(a => a.id !== id);
  if (filtered.length === analyses.length) return false;
  saveAnalyses(filtered);
  return true;
}

export function loadExports(): ExportPackage[] {
  ensureDataDir();
  if (!fs.existsSync(EXPORT_FILE)) {
    return [];
  }
  const data = fs.readFileSync(EXPORT_FILE, 'utf-8');
  return JSON.parse(data);
}

export function saveExport(exp: ExportPackage): void {
  const exports = loadExports();
  exports.push(exp);
  ensureDataDir();
  fs.writeFileSync(EXPORT_FILE, JSON.stringify(exports, null, 2), 'utf-8');
}
