import crypto from 'node:crypto';
import { exerciseRepository, versionRepository } from '../db/index.js';
import type {
  Exercise,
  ExerciseListQuery,
  PaginatedResult,
  ImportResult,
  ExerciseVersion,
} from '../../shared/types.js';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function exerciseToPlain(exercise: Exercise): Record<string, unknown> {
  return JSON.parse(JSON.stringify(exercise));
}

function computeDiff(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
): Record<string, { old: unknown; new: unknown }> {
  const diff: Record<string, { old: unknown; new: unknown }> = {};
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    if (['createdAt', 'updatedAt', 'id'].includes(key)) continue;
    const oldVal = oldObj[key];
    const newVal = newObj[key];
    const oldStr = JSON.stringify(oldVal);
    const newStr = JSON.stringify(newVal);
    if (oldStr !== newStr) {
      diff[key] = { old: oldVal, new: newVal };
    }
  }
  return diff;
}

export class ExerciseService {
  findAll(query: ExerciseListQuery = {}): PaginatedResult<Exercise> {
    return exerciseRepository.findAll(query);
  }

  findById(id: string): Exercise | null {
    return exerciseRepository.findById(id);
  }

  create(data: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>): Exercise {
    const exercise: Exercise = {
      ...data,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    };
    const created = exerciseRepository.create(exercise);

    const nextVersionNumber = versionRepository.getNextVersionNumber(created.id);
    versionRepository.create({
      id: generateId(),
      exerciseId: created.id,
      versionNumber: nextVersionNumber,
      snapshot: exerciseToPlain(created) as unknown as Exercise,
      changedBy: 'system',
      changeSummary: 'Initial version',
      diff: {},
      createdAt: now(),
    });

    return created;
  }

  update(id: string, data: Partial<Exercise>): Exercise | null {
    const existing = exerciseRepository.findById(id);
    if (!existing) return null;

    const updated = exerciseRepository.update(id, data);
    if (!updated) return null;

    const diff = computeDiff(exerciseToPlain(existing), exerciseToPlain(updated));
    const nextVersionNumber = versionRepository.getNextVersionNumber(id);

    versionRepository.create({
      id: generateId(),
      exerciseId: id,
      versionNumber: nextVersionNumber,
      snapshot: exerciseToPlain(updated) as unknown as Exercise,
      changedBy: 'system',
      changeSummary: 'Updated exercise',
      diff,
      createdAt: now(),
    });

    return updated;
  }

  delete(id: string): boolean {
    return exerciseRepository.delete(id);
  }

  bulkImport(
    exercises: Array<Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>>,
  ): ImportResult {
    const fullExercises: Exercise[] = exercises.map((item) => ({
      ...item,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    }));
    return exerciseRepository.bulkImport(fullExercises);
  }

  listVersions(exerciseId: string): ExerciseVersion[] {
    return versionRepository.findByExerciseId(exerciseId);
  }

  getVersion(exerciseId: string, versionId: string): ExerciseVersion | null {
    const version = versionRepository.findById(versionId);
    if (!version || version.exerciseId !== exerciseId) return null;
    return version;
  }

  rollbackToVersion(exerciseId: string, versionId: string): Exercise | null {
    const targetVersion = versionRepository.findById(versionId);
    if (!targetVersion || targetVersion.exerciseId !== exerciseId) return null;

    const current = exerciseRepository.findById(exerciseId);
    if (!current) return null;

    const snapshot = targetVersion.snapshot;
    const rollbackData: Partial<Exercise> = {
      name: snapshot.name,
      sourceRowNumber: snapshot.sourceRowNumber,
      sourceImageName: snapshot.sourceImageName,
      sourceRemark: snapshot.sourceRemark,
      status: snapshot.status,
      timelineStartMs: snapshot.timelineStartMs,
      timelineEndMs: snapshot.timelineEndMs,
      conclusion: snapshot.conclusion,
      keyframes: snapshot.keyframes,
      coordinates: snapshot.coordinates,
      screenshots: snapshot.screenshots,
    };

    const updated = exerciseRepository.update(exerciseId, rollbackData);
    if (!updated) return null;

    const diff = computeDiff(exerciseToPlain(current), exerciseToPlain(updated));
    const nextVersionNumber = versionRepository.getNextVersionNumber(exerciseId);

    versionRepository.create({
      id: generateId(),
      exerciseId,
      versionNumber: nextVersionNumber,
      snapshot: exerciseToPlain(updated) as unknown as Exercise,
      changedBy: 'system',
      changeSummary: `Rollback to version ${targetVersion.versionNumber}`,
      diff,
      createdAt: now(),
    });

    return updated;
  }
}

export const exerciseService = new ExerciseService();
