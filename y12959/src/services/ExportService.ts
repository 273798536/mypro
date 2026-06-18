import { exportJobs as mockJobs, users } from '../mock/data';
import { LocalStorageProvider } from './LocalStorageProvider';
import type { ExportFormat, ExportJob, ExportScope } from '../types';

interface ExportJobConfig {
  format: ExportFormat;
  scope: ExportScope;
  filterCriteria?: Record<string, unknown>;
  singleConflictId?: string;
  includeExplanations?: boolean;
  includeCharts?: boolean;
  includeSnapshots?: boolean;
  includeAuditSummary?: boolean;
  createdBy?: string;
}

const sanitizeName = (n: number, ext: string): string => {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `idcr_export_${stamp}_${String(n).padStart(4, '0')}.${ext}`;
};

const extOf = (f: ExportFormat): string => (f === 'xlsx' ? 'xlsx' : f);

const persistedJobs = (): ExportJob[] => {
  const list = LocalStorageProvider.list<ExportJob>('export_jobs');
  return [...mockJobs, ...list];
};

const updateJobs = (job: ExportJob): void => {
  const existing = LocalStorageProvider.list<ExportJob>('export_jobs');
  const idx = existing.findIndex((j) => j.id === job.id);
  if (idx >= 0) {
    existing[idx] = job;
  } else {
    existing.push(job);
  }
  LocalStorageProvider.set('export_jobs', existing);
};

export const ExportService = {
  createJob(config: ExportJobConfig): ExportJob {
    const id = `job_${Date.now().toString(36)}${Math.floor(Math.random() * 0xffff).toString(36)}`;
    const now = new Date().toISOString();
    const seq = persistedJobs().length + 1;
    const job: ExportJob = {
      id,
      format: config.format,
      scope: config.scope,
      filterCriteria: config.filterCriteria,
      singleConflictId: config.singleConflictId,
      includeExplanations: config.includeExplanations ?? true,
      includeCharts: config.includeCharts ?? true,
      includeSnapshots: config.includeSnapshots ?? true,
      includeAuditSummary: config.includeAuditSummary ?? true,
      status: 'queued',
      createdAt: now,
      createdBy: config.createdBy ?? (users[0]?.id ?? 'u_001'),
      fileName: sanitizeName(seq, extOf(config.format)),
      downloadCount: 0,
    };
    updateJobs(job);

    setTimeout(() => {
      const target = persistedJobs().find((j) => j.id === id);
      if (!target) return;
      target.status = 'generating';
      updateJobs(target);
    }, 400);

    setTimeout(() => {
      const target = persistedJobs().find((j) => j.id === id);
      if (!target) return;
      target.status = 'done';
      target.completedAt = new Date().toISOString();
      target.fileSizeKb = Math.floor(Math.random() * 5000) + 200;
      updateJobs(target);
    }, 2200);

    return job;
  },

  listJobs(): ExportJob[] {
    return persistedJobs().sort((a, b) =>
      Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );
  },

  getJob(id: string): ExportJob | undefined {
    return persistedJobs().find((j) => j.id === id);
  },

  generateMockDownload(jobId: string): string | null {
    const job = persistedJobs().find((j) => j.id === jobId);
    if (!job) return null;
    if (job.status !== 'done') return null;
    job.downloadCount += 1;
    updateJobs(job);
    return job.fileName;
  },
};
