import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import { exportRepository, exerciseRepository } from '../db/index.js';
import type { ExportJob, Exercise, ExerciseListQuery } from '../../shared/types.js';

const EXPORT_DIR = path.resolve(process.cwd(), 'exports');

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function ensureExportDir(): void {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
}

function exercisesToJSON(exercises: Exercise[]): string {
  return JSON.stringify(exercises, null, 2);
}

function exercisesToCSV(exercises: Exercise[]): string {
  const headers = [
    'id',
    'name',
    'sourceRowNumber',
    'sourceImageName',
    'sourceRemark',
    'status',
    'createdAt',
    'updatedAt',
    'timelineStartMs',
    'timelineEndMs',
    'conclusion',
  ];

  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers.join(',')];
  for (const ex of exercises) {
    lines.push(
      headers.map((h) => {
        const key = h as keyof Exercise;
        const val = ex[key];
        if (Array.isArray(val) || typeof val === 'object') {
          return escape(JSON.stringify(val));
        }
        return escape(val);
      }).join(','),
    );
  }
  return lines.join('\n');
}

async function createZipArchive(
  exercises: Exercise[],
  outputPath: string,
  includeJSON: boolean,
  includeCSV: boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    if (includeJSON) {
      archive.append(exercisesToJSON(exercises), { name: 'exercises.json' });
    }
    if (includeCSV) {
      archive.append(exercisesToCSV(exercises), { name: 'exercises.csv' });
    }

    archive.finalize();
  });
}

export class ExportService {
  async createJob(
    format: string,
    filter: Record<string, unknown> | null,
  ): Promise<ExportJob> {
    ensureExportDir();

    const jobId = generateId();
    const job: ExportJob = {
      id: jobId,
      format: format || 'zip',
      filter,
      filePath: null,
      status: 'pending',
      createdAt: now(),
      completedAt: null,
    };
    exportRepository.create(job);

    try {
      exportRepository.updateStatus(jobId, 'processing');

      const query: ExerciseListQuery = {};
      if (filter) {
        if (typeof filter.status === 'string') query.status = filter.status as ExerciseListQuery['status'];
        if (typeof filter.search === 'string') query.search = filter.search;
      }

      const paginated = exerciseRepository.findAll({ ...query, page: 1, pageSize: 10000 });
      const exercises = paginated.items;

      let fileName: string;
      let filePath: string;

      if (format === 'json') {
        fileName = `${jobId}.json`;
        filePath = path.join(EXPORT_DIR, fileName);
        fs.writeFileSync(filePath, exercisesToJSON(exercises));
      } else if (format === 'csv') {
        fileName = `${jobId}.csv`;
        filePath = path.join(EXPORT_DIR, fileName);
        fs.writeFileSync(filePath, exercisesToCSV(exercises));
      } else {
        fileName = `${jobId}.zip`;
        filePath = path.join(EXPORT_DIR, fileName);
        await createZipArchive(exercises, filePath, true, true);
      }

      exportRepository.updateStatus(jobId, 'completed', filePath);
      return exportRepository.findById(jobId)!;
    } catch (err) {
      exportRepository.updateStatus(jobId, 'failed');
      throw err;
    }
  }

  listJobs(): ExportJob[] {
    return exportRepository.findAll();
  }

  getJob(id: string): ExportJob | null {
    return exportRepository.findById(id);
  }
}

export const exportService = new ExportService();
