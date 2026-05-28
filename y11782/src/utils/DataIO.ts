import * as fs from 'fs';
import * as path from 'path';
import { DataBundle, HistoryRecord } from '../models/types';

export class DataIO {
  private dataDir: string;
  private historyDir: string;
  private reportsDir: string;

  constructor(
    dataDir: string = path.join(process.cwd(), 'data'),
    reportsDir: string = path.join(process.cwd(), 'reports')
  ) {
    this.dataDir = dataDir;
    this.historyDir = path.join(dataDir, 'history');
    this.reportsDir = reportsDir;
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [this.dataDir, this.historyDir, this.reportsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  importFromFile(filePath: string): DataBundle {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`文件不存在: ${absolutePath}`);
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const data = JSON.parse(content) as DataBundle;
    this.validateDataBundle(data);
    return data;
  }

  exportToFile(data: DataBundle, filePath: string): void {
    const absolutePath = path.resolve(filePath);
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(absolutePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  saveHistory(history: HistoryRecord[]): void {
    const filePath = path.join(this.historyDir, 'history.json');
    fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf-8');
  }

  loadHistory(): HistoryRecord[] {
    const filePath = path.join(this.historyDir, 'history.json');
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as HistoryRecord[];
  }

  appendHistory(record: HistoryRecord): void {
    const history = this.loadHistory();
    history.push(record);
    this.saveHistory(history);
  }

  saveSnapshot(data: DataBundle, tag: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `snapshot_${tag}_${timestamp}.json`;
    const filePath = path.join(this.historyDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return filePath;
  }

  listSnapshots(): string[] {
    if (!fs.existsSync(this.historyDir)) {
      return [];
    }
    return fs.readdirSync(this.historyDir)
      .filter(f => f.startsWith('snapshot_') && f.endsWith('.json'))
      .sort()
      .reverse();
  }

  loadSnapshot(fileName: string): DataBundle {
    const filePath = path.join(this.historyDir, fileName);
    return this.importFromFile(filePath);
  }

  saveReport(report: unknown, fileName: string, format: 'json' | 'html' = 'json'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fullFileName = `${fileName}_${timestamp}.${format}`;
    const filePath = path.join(this.reportsDir, fullFileName);

    if (format === 'json') {
      fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
    } else {
      fs.writeFileSync(filePath, report as string, 'utf-8');
    }

    return filePath;
  }

  listReports(): string[] {
    if (!fs.existsSync(this.reportsDir)) {
      return [];
    }
    return fs.readdirSync(this.reportsDir)
      .filter(f => f.endsWith('.json') || f.endsWith('.html'))
      .sort()
      .reverse();
  }

  private validateDataBundle(data: unknown): asserts data is DataBundle {
    if (typeof data !== 'object' || data === null) {
      throw new Error('数据格式错误：应该是一个对象');
    }

    const bundle = data as Record<string, unknown>;

    const requiredFields = ['courses', 'prerequisites', 'semesterPlans', 'alternativeCourses', 'studentGrades'];
    for (const field of requiredFields) {
      if (!Array.isArray(bundle[field])) {
        throw new Error(`数据格式错误：${field} 应该是一个数组`);
      }
    }

    if (bundle.courses && Array.isArray(bundle.courses)) {
      bundle.courses.forEach((course, index) => {
        const c = course as Record<string, unknown>;
        if (!c.id || !c.name || c.credits === undefined) {
          throw new Error(`课程数据错误：第 ${index + 1} 门课程缺少必要字段（id, name, credits）`);
        }
      });
    }

    if (bundle.prerequisites && Array.isArray(bundle.prerequisites)) {
      bundle.prerequisites.forEach((prereq, index) => {
        const p = prereq as Record<string, unknown>;
        if (!p.courseId || !p.prerequisiteId) {
          throw new Error(`先修关系错误：第 ${index + 1} 条缺少必要字段（courseId, prerequisiteId）`);
        }
      });
    }
  }

  getDataDir(): string {
    return this.dataDir;
  }

  getReportsDir(): string {
    return this.reportsDir;
  }

  getHistoryDir(): string {
    return this.historyDir;
  }
}

export const dataIO = new DataIO();
