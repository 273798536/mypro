import crypto from 'node:crypto';
import { versionRepository, exerciseRepository } from '../db/index.js';
import type { ExerciseVersion, Exercise } from '../../shared/types.js';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function exerciseToPlain(exercise: Exercise): Exercise {
  return JSON.parse(JSON.stringify(exercise));
}

function computeDiff(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
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

export class VersionService {
  getVersions(exerciseId: string): ExerciseVersion[] {
    return versionRepository.findByExerciseId(exerciseId);
  }

  getVersionDetail(exerciseId: string, versionId: string): ExerciseVersion | null {
    const version = versionRepository.findById(versionId);
    if (!version || version.exerciseId !== exerciseId) {
      return null;
    }
    return version;
  }

  rollbackToVersion(exerciseId: string, versionId: string): Exercise | null {
    const targetVersion = versionRepository.findById(versionId);
    if (!targetVersion || targetVersion.exerciseId !== exerciseId) {
      return null;
    }

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

    const diff = computeDiff(
      exerciseToPlain(current) as unknown as Record<string, unknown>,
      exerciseToPlain(updated) as unknown as Record<string, unknown>
    );
    const nextVersionNumber = versionRepository.getNextVersionNumber(exerciseId);

    const rollbackVersion: ExerciseVersion = {
      id: generateId(),
      exerciseId,
      versionNumber: nextVersionNumber,
      snapshot: exerciseToPlain(updated),
      changedBy: 'system',
      changeSummary: `Rollback to version ${targetVersion.versionNumber}`,
      diff,
      createdAt: now(),
    };
    versionRepository.create(rollbackVersion);

    return updated;
  }
}

export const versionService = new VersionService();
