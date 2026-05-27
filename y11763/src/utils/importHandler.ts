import { Particle, ImportMode, ImportResult } from '../types/particle';
import { validateImportData } from './dataValidator';

export interface ImportOptions {
  mode: ImportMode;
  source: string;
}

export function processImport(
  data: unknown,
  existingParticles: Particle[],
  options: ImportOptions,
  filename: string
): { result: ImportResult; particles: Particle[] } {
  const { valid, errors } = validateImportData(data);
  const now = new Date().toISOString();

  let finalParticles: Particle[] = [];
  let ignoredCount = 0;
  let overwrittenCount = 0;
  let appendedCount = 0;

  switch (options.mode) {
    case 'ignore': {
      const existingIds = new Set(existingParticles.map((p) => p.id));
      const newParticles = valid.filter((p) => {
        if (existingIds.has(p.id)) {
          ignoredCount++;
          return false;
        }
        return true;
      });
      finalParticles = [...existingParticles, ...newParticles];
      appendedCount = newParticles.length;
      break;
    }

    case 'overwrite': {
      overwrittenCount = existingParticles.length;
      finalParticles = valid.map((p) => ({
        ...p,
        createdAt: p.createdAt || now,
        updatedAt: now,
        source: options.source || p.source || filename,
        isVisible: p.isVisible !== undefined ? p.isVisible : true,
      }));
      appendedCount = valid.length;
      break;
    }

    case 'append': {
      const existingIds = new Set(existingParticles.map((p) => p.id));
      const processed = valid.map((p) => {
        if (existingIds.has(p.id)) {
          const newId = `${p.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          return { ...p, id: newId, version: `${p.version || '1.0'}_dup` };
        }
        return p;
      });
      finalParticles = [...existingParticles, ...processed];
      appendedCount = processed.length;
      break;
    }
  }

  finalParticles = finalParticles.map((p) => ({
    ...p,
    createdAt: p.createdAt || now,
    updatedAt: now,
    source: p.source || options.source || filename,
    isVisible: p.isVisible !== undefined ? p.isVisible : true,
  }));

  const result: ImportResult = {
    success: errors.every((e) => e.severity !== 'error'),
    totalRecords: valid.length + errors.filter((e) => e.severity === 'error').length,
    successCount: appendedCount,
    errorCount: errors.length,
    errors,
    importMode: options.mode,
    filename,
    importedAt: now,
  };

  return { result, particles: finalParticles };
}

export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (err) {
        reject(new Error('JSON解析失败'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}
