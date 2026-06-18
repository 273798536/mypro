import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { DashboardState, Sample, Batch } from './types';

const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = 'state.json';
const BACKUP_DIR = '.backups';

const EMPTY_STATE: DashboardState = {
  version: 2,
  lastUpdated: new Date(0).toISOString(),
  samples: {},
  batches: {},
  tags: { missing_ref: [], late_attachment: [], manual_override: [], replayed: [] },
  counters: { sampleCount: 0, batchCount: 0 },
};

export class Store {
  readonly dataDir: string;
  private statePath: string;
  private backupDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir ?? DEFAULT_DATA_DIR;
    this.statePath = path.join(this.dataDir, STATE_FILE);
    this.backupDir = path.join(this.dataDir, BACKUP_DIR);
    this.ensureDirs();
  }

  private ensureDirs(): void {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    if (!fs.existsSync(this.backupDir)) fs.mkdirSync(this.backupDir, { recursive: true });
  }

  load(): DashboardState {
    if (!fs.existsSync(this.statePath)) {
      return JSON.parse(JSON.stringify(EMPTY_STATE));
    }
    try {
      const raw = fs.readFileSync(this.statePath, 'utf-8');
      const parsed = JSON.parse(raw) as DashboardState;
      if (!parsed.version || parsed.version < 2) {
        return this.migrate(parsed);
      }
      return parsed;
    } catch (e) {
      const backup = this.findLatestBackup();
      if (backup) {
        const raw = fs.readFileSync(backup, 'utf-8');
        return JSON.parse(raw) as DashboardState;
      }
      return JSON.parse(JSON.stringify(EMPTY_STATE));
    }
  }

  private migrate(old: any): DashboardState {
    const base: DashboardState = JSON.parse(JSON.stringify(EMPTY_STATE));
    if (old.samples) base.samples = old.samples;
    if (old.batches) base.batches = old.batches;
    if (old.tags) base.tags = old.tags;
    if (old.counters) base.counters = old.counters;
    base.lastUpdated = old.lastUpdated ?? new Date().toISOString();
    return base;
  }

  private findLatestBackup(): string | null {
    if (!fs.existsSync(this.backupDir)) return null;
    const files = fs.readdirSync(this.backupDir)
      .filter(f => f.startsWith('state-') && f.endsWith('.json'))
      .sort()
      .reverse();
    return files.length > 0 ? path.join(this.backupDir, files[0]) : null;
  }

  save(state: DashboardState): { ok: boolean; backupPath?: string; error?: string } {
    state.lastUpdated = new Date().toISOString();
    const serialised = JSON.stringify(state, null, 2);
    const hash = crypto.createHash('sha256').update(serialised).digest('hex').slice(0, 10);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `state-${ts}-${hash}.json`);

    try {
      if (fs.existsSync(this.statePath)) {
        fs.copyFileSync(this.statePath, backupPath);
      }
      const tmp = `${this.statePath}.tmp`;
      fs.writeFileSync(tmp, serialised, 'utf-8');
      fs.renameSync(tmp, this.statePath);
      return { ok: true, backupPath };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? String(e) };
    }
  }

  transaction<T>(fn: (state: DashboardState) => T): T {
    const state = this.load();
    const result = fn(state);
    const saveResult = this.save(state);
    if (!saveResult.ok) {
      throw new Error(`Store transaction save failed: ${saveResult.error}`);
    }
    return result;
  }

  getSample(sampleId: string): Sample | undefined {
    return this.load().samples[sampleId];
  }

  listSamples(opts?: { tag?: string; verdictLevel?: string }): Sample[] {
    const state = this.load();
    let list = Object.values(state.samples);
    if (opts?.tag) {
      const ids = new Set(state.tags[opts.tag] ?? []);
      list = list.filter(s => ids.has(s.sampleId));
    }
    if (opts?.verdictLevel) {
      list = list.filter(s => s.verdict?.level === opts.verdictLevel);
    }
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getBatch(batchId: string): Batch | undefined {
    return this.load().batches[batchId];
  }

  listBatches(): Batch[] {
    return Object.values(this.load().batches)
      .sort((a, b) => b.runAt.localeCompare(a.runAt));
  }
}
