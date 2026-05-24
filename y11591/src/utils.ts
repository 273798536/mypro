import path from 'path';
import fs from 'fs';
import chalk from 'chalk';

export function getWorkspacePath(cwd: string): string {
  let current = cwd;
  while (true) {
    const wwiDir = path.join(current, '.wwi');
    if (fs.existsSync(wwiDir) && fs.statSync(wwiDir).isDirectory()) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return cwd;
    }
    current = parent;
  }
}

export function isInitialized(workspacePath: string): boolean {
  return fs.existsSync(path.join(workspacePath, '.wwi'));
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function parseNumber(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value.replace(/,/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

export function parseBoolean(value: string | boolean | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;
  const str = String(value).toLowerCase().trim();
  return ['true', '1', 'yes', 'y', '是'].includes(str);
}

export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('zh-CN');
  } catch {
    return dateStr;
  }
}

export function logSuccess(message: string): void {
  console.log(chalk.green(`✓ ${message}`));
}

export function logError(message: string): void {
  console.error(chalk.red(`✗ ${message}`));
}

export function logWarning(message: string): void {
  console.log(chalk.yellow(`⚠ ${message}`));
}

export function logInfo(message: string): void {
  console.log(chalk.blue(`ℹ ${message}`));
}
