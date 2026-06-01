import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');

export class FileStorage<T> {
  private filePath: string;

  constructor(filename: string) {
    this.filePath = path.join(DATA_DIR, filename);
    this.ensureFileExists();
  }

  private ensureFileExists(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  readAll(): T[] {
    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content) as T[];
    } catch {
      return [];
    }
  }

  writeAll(data: T[]): void {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  findById(id: string): T | undefined {
    const all = this.readAll();
    return all.find((item: unknown) => (item as { id: string }).id === id);
  }

  create(item: T): T {
    const all = this.readAll();
    all.push(item);
    this.writeAll(all);
    return item;
  }

  update(id: string, item: Partial<T>): T | undefined {
    const all = this.readAll();
    const index = all.findIndex((i: unknown) => (i as { id: string }).id === id);
    if (index === -1) return undefined;
    all[index] = { ...all[index], ...item } as T;
    this.writeAll(all);
    return all[index];
  }

  delete(id: string): boolean {
    const all = this.readAll();
    const filtered = all.filter((i: unknown) => (i as { id: string }).id !== id);
    if (filtered.length === all.length) return false;
    this.writeAll(filtered);
    return true;
  }
}

export class VersionStorage {
  private versionsDir: string;

  constructor() {
    this.versionsDir = path.join(DATA_DIR, 'versions');
    if (!fs.existsSync(this.versionsDir)) {
      fs.mkdirSync(this.versionsDir, { recursive: true });
    }
  }

  private getVersionPath(id: string): string {
    return path.join(this.versionsDir, `${id}.json`);
  }

  saveVersion(version: unknown): void {
    const v = version as { id: string };
    fs.writeFileSync(this.getVersionPath(v.id), JSON.stringify(version, null, 2), 'utf-8');
  }

  getVersion(id: string): unknown | undefined {
    const filePath = this.getVersionPath(id);
    if (!fs.existsSync(filePath)) return undefined;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return undefined;
    }
  }

  listVersions(): unknown[] {
    if (!fs.existsSync(this.versionsDir)) return [];
    const files = fs.readdirSync(this.versionsDir).filter(f => f.endsWith('.json'));
    return files
      .map(f => {
        try {
          const content = fs.readFileSync(path.join(this.versionsDir, f), 'utf-8');
          return JSON.parse(content);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const dateA = new Date((a as { createdAt: string }).createdAt).getTime();
        const dateB = new Date((b as { createdAt: string }).createdAt).getTime();
        return dateB - dateA;
      });
  }
}
