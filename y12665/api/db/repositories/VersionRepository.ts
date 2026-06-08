import type Database from 'better-sqlite3';
import type { ExerciseVersion, Exercise } from '../../../shared/types.js';

export class VersionRepository {
  constructor(private db: Database.Database) {}

  private mapRowToVersion(row: any): ExerciseVersion {
    return {
      id: row.id,
      exerciseId: row.exercise_id,
      versionNumber: row.version_number,
      snapshot: JSON.parse(row.snapshot_json),
      changedBy: row.changed_by,
      changeSummary: row.change_summary || '',
      diff: row.diff_json ? JSON.parse(row.diff_json) : {},
      createdAt: row.created_at,
    };
  }

  create(version: ExerciseVersion): ExerciseVersion {
    this.db
      .prepare(
        `INSERT INTO exercise_versions (id, exercise_id, version_number, snapshot_json, diff_json, changed_by, change_summary, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        version.id,
        version.exerciseId,
        version.versionNumber,
        JSON.stringify(version.snapshot),
        JSON.stringify(version.diff),
        version.changedBy,
        version.changeSummary,
        version.createdAt
      );
    return version;
  }

  findByExerciseId(exerciseId: string): ExerciseVersion[] {
    const rows = this.db
      .prepare('SELECT * FROM exercise_versions WHERE exercise_id = ? ORDER BY version_number DESC')
      .all(exerciseId) as any[];
    return rows.map((row) => this.mapRowToVersion(row));
  }

  findById(id: string): ExerciseVersion | null {
    const row = this.db.prepare('SELECT * FROM exercise_versions WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRowToVersion(row);
  }

  findByExerciseAndVersion(exerciseId: string, versionNumber: number): ExerciseVersion | null {
    const row = this.db
      .prepare('SELECT * FROM exercise_versions WHERE exercise_id = ? AND version_number = ?')
      .get(exerciseId, versionNumber) as any;
    if (!row) return null;
    return this.mapRowToVersion(row);
  }

  getNextVersionNumber(exerciseId: string): number {
    const row = this.db
      .prepare('SELECT COALESCE(MAX(version_number), 0) as max FROM exercise_versions WHERE exercise_id = ?')
      .get(exerciseId) as { max: number };
    return row.max + 1;
  }

  getSnapshot(id: string): Exercise | null {
    const version = this.findById(id);
    if (!version) return null;
    return version.snapshot;
  }
}
