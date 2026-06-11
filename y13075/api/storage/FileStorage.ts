import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const REPORTS_DIR = path.join(DATA_DIR, 'reports');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDir(DATA_DIR);
ensureDir(REPORTS_DIR);

export function getReportsDir() {
  return REPORTS_DIR;
}

export function readJSON<T>(file: string, fallback: T): T {
  const fullPath = path.join(DATA_DIR, file);
  if (!fs.existsSync(fullPath)) {
    return fallback;
  }
  try {
    const raw = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`[FileStorage] 读取 ${file} 失败，使用 fallback:`, err);
    return fallback;
  }
}

export function writeJSON(file: string, data: any): void {
  const fullPath = path.join(DATA_DIR, file);
  const tmpPath = fullPath + '.tmp';
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, fullPath);
  } catch (err) {
    console.error(`[FileStorage] 写入 ${file} 失败:`, err);
    if (fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
    throw err;
  }
}

export function writeReport(fileName: string, content: string): string {
  const fullPath = path.join(REPORTS_DIR, fileName);
  fs.writeFileSync(fullPath, content, 'utf-8');
  return fullPath;
}

export function listReports(): Array<{ name: string; createdAt: string; size: number }> {
  const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.md'));
  return files.map(name => {
    const stat = fs.statSync(path.join(REPORTS_DIR, name));
    return { name, createdAt: stat.birthtime.toISOString(), size: stat.size };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
