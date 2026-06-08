import type Database from 'better-sqlite3';
import type {
  Exercise,
  Keyframe,
  DeviceCoordinate,
  Screenshot,
  ExerciseListQuery,
  PaginatedResult,
  ImportResult,
  ImportConflict,
} from '../../../shared/types.js';

export class ExerciseRepository {
  constructor(private db: Database.Database) {}

  private mapRowToExercise(row: any, keyframes: Keyframe[], coordinates: DeviceCoordinate[], screenshots: Screenshot[]): Exercise {
    return {
      id: row.id,
      name: row.name,
      sourceRowNumber: row.source_row_number,
      sourceImageName: row.source_image_name,
      sourceRemark: row.source_remark,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      timelineStartMs: row.timeline_start_ms,
      timelineEndMs: row.timeline_end_ms,
      conclusion: row.conclusion || '',
      keyframes,
      coordinates,
      screenshots,
    };
  }

  private loadRelations(exerciseIds: string[]): Map<string, { keyframes: Keyframe[]; coordinates: DeviceCoordinate[]; screenshots: Screenshot[] }> {
    const result = new Map<string, { keyframes: Keyframe[]; coordinates: DeviceCoordinate[]; screenshots: Screenshot[] }>();

    for (const id of exerciseIds) {
      result.set(id, { keyframes: [], coordinates: [], screenshots: [] });
    }

    const keyframeRows = this.db
      .prepare('SELECT * FROM keyframes WHERE exercise_id IN (' + exerciseIds.map(() => '?').join(',') + ') ORDER BY timestamp_ms ASC')
      .all(...exerciseIds) as any[];

    for (const row of keyframeRows) {
      const entry = result.get(row.exercise_id);
      if (entry) {
        entry.keyframes.push({
          id: row.id,
          timestampMs: row.timestamp_ms,
          label: row.label || '',
          params: row.params_json ? JSON.parse(row.params_json) : {},
        });
      }
    }

    const coordinateRows = this.db
      .prepare('SELECT * FROM coordinates WHERE exercise_id IN (' + exerciseIds.map(() => '?').join(',') + ')')
      .all(...exerciseIds) as any[];

    for (const row of coordinateRows) {
      const entry = result.get(row.exercise_id);
      if (entry) {
        entry.coordinates.push({
          id: row.id,
          label: row.label || '',
          x: row.x,
          y: row.y,
          z: row.z,
          sourceRef: row.source_ref || '',
        });
      }
    }

    const screenshotRows = this.db
      .prepare('SELECT * FROM screenshots WHERE exercise_id IN (' + exerciseIds.map(() => '?').join(',') + ') ORDER BY timestamp_ms ASC')
      .all(...exerciseIds) as any[];

    const screenshotIds = screenshotRows.map((r) => r.id);
    const linkedCoordsMap = new Map<string, string[]>();

    if (screenshotIds.length > 0) {
      const linkRows = this.db
        .prepare(
          'SELECT screenshot_id, coordinate_id FROM screenshot_coordinates WHERE screenshot_id IN (' +
            screenshotIds.map(() => '?').join(',') +
            ')'
        )
        .all(...screenshotIds) as any[];

      for (const link of linkRows) {
        if (!linkedCoordsMap.has(link.screenshot_id)) {
          linkedCoordsMap.set(link.screenshot_id, []);
        }
        linkedCoordsMap.get(link.screenshot_id)!.push(link.coordinate_id);
      }
    }

    for (const row of screenshotRows) {
      const entry = result.get(row.exercise_id);
      if (entry) {
        const screenshot: Screenshot = {
          id: row.id,
          filename: row.filename,
          filePath: row.file_path,
          thumbnailPath: row.thumbnail_path || '',
          timestampMs: row.timestamp_ms,
          reviewStatus: row.review_status,
          reviewNote: row.review_note,
          linkedCoordinateIds: linkedCoordsMap.get(row.id) || [],
        };
        if (row.section_axis && row.section_depth !== null) {
          screenshot.sectionPlane = {
            axis: row.section_axis,
            depth: row.section_depth,
          };
        }
        entry.screenshots.push(screenshot);
      }
    }

    return result;
  }

  findById(id: string): Exercise | null {
    const row = this.db.prepare('SELECT * FROM exercises WHERE id = ?').get(id) as any;
    if (!row) return null;

    const relations = this.loadRelations([id]);
    const rel = relations.get(id)!;
    return this.mapRowToExercise(row, rel.keyframes, rel.coordinates, rel.screenshots);
  }

  findAll(query: ExerciseListQuery = {}): PaginatedResult<Exercise> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: any[] = [];

    if (query.status) {
      conditions.push('status = ?');
      params.push(query.status);
    }

    if (query.search) {
      conditions.push('(name LIKE ? OR source_image_name LIKE ? OR source_remark LIKE ?)');
      const searchTerm = `%${query.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = this.db.prepare(`SELECT COUNT(*) as count FROM exercises ${whereClause}`).get(...params) as { count: number };
    const total = countRow.count;

    const rows = this.db
      .prepare(`SELECT * FROM exercises ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, pageSize, offset) as any[];

    const exerciseIds = rows.map((r) => r.id);
    const relations = this.loadRelations(exerciseIds);

    const items = rows.map((row) => {
      const rel = relations.get(row.id)!;
      return this.mapRowToExercise(row, rel.keyframes, rel.coordinates, rel.screenshots);
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  create(exercise: Exercise): Exercise {
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO exercises (id, name, source_row_number, source_image_name, source_remark, status, timeline_start_ms, timeline_end_ms, conclusion, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          exercise.id,
          exercise.name,
          exercise.sourceRowNumber,
          exercise.sourceImageName,
          exercise.sourceRemark,
          exercise.status,
          exercise.timelineStartMs,
          exercise.timelineEndMs,
          exercise.conclusion,
          exercise.createdAt,
          exercise.updatedAt
        );

      const insertKeyframe = this.db.prepare(
        'INSERT INTO keyframes (id, exercise_id, timestamp_ms, label, params_json) VALUES (?, ?, ?, ?, ?)'
      );
      for (const kf of exercise.keyframes) {
        insertKeyframe.run(kf.id, exercise.id, kf.timestampMs, kf.label, JSON.stringify(kf.params));
      }

      const insertCoord = this.db.prepare(
        'INSERT INTO coordinates (id, exercise_id, label, x, y, z, source_ref) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      for (const coord of exercise.coordinates) {
        insertCoord.run(coord.id, exercise.id, coord.label, coord.x, coord.y, coord.z, coord.sourceRef);
      }

      const insertScreenshot = this.db.prepare(
        `INSERT INTO screenshots (id, exercise_id, filename, file_path, thumbnail_path, timestamp_ms, review_status, review_note, section_axis, section_depth)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const insertLink = this.db.prepare(
        'INSERT INTO screenshot_coordinates (screenshot_id, coordinate_id) VALUES (?, ?)'
      );
      for (const s of exercise.screenshots) {
        insertScreenshot.run(
          s.id,
          exercise.id,
          s.filename,
          s.filePath,
          s.thumbnailPath,
          s.timestampMs,
          s.reviewStatus,
          s.reviewNote,
          s.sectionPlane?.axis || null,
          s.sectionPlane?.depth ?? null
        );
        for (const coordId of s.linkedCoordinateIds) {
          insertLink.run(s.id, coordId);
        }
      }
    });

    tx();
    return exercise;
  }

  update(id: string, exercise: Partial<Exercise>): Exercise | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const tx = this.db.transaction(() => {
      if (
        exercise.name !== undefined ||
        exercise.sourceRowNumber !== undefined ||
        exercise.sourceImageName !== undefined ||
        exercise.sourceRemark !== undefined ||
        exercise.status !== undefined ||
        exercise.timelineStartMs !== undefined ||
        exercise.timelineEndMs !== undefined ||
        exercise.conclusion !== undefined
      ) {
        const fields: string[] = [];
        const params: any[] = [];

        if (exercise.name !== undefined) {
          fields.push('name = ?');
          params.push(exercise.name);
        }
        if (exercise.sourceRowNumber !== undefined) {
          fields.push('source_row_number = ?');
          params.push(exercise.sourceRowNumber);
        }
        if (exercise.sourceImageName !== undefined) {
          fields.push('source_image_name = ?');
          params.push(exercise.sourceImageName);
        }
        if (exercise.sourceRemark !== undefined) {
          fields.push('source_remark = ?');
          params.push(exercise.sourceRemark);
        }
        if (exercise.status !== undefined) {
          fields.push('status = ?');
          params.push(exercise.status);
        }
        if (exercise.timelineStartMs !== undefined) {
          fields.push('timeline_start_ms = ?');
          params.push(exercise.timelineStartMs);
        }
        if (exercise.timelineEndMs !== undefined) {
          fields.push('timeline_end_ms = ?');
          params.push(exercise.timelineEndMs);
        }
        if (exercise.conclusion !== undefined) {
          fields.push('conclusion = ?');
          params.push(exercise.conclusion);
        }

        fields.push('updated_at = ?');
        params.push(new Date().toISOString());
        params.push(id);

        this.db.prepare(`UPDATE exercises SET ${fields.join(', ')} WHERE id = ?`).run(...params);
      }

      if (exercise.keyframes) {
        this.db.prepare('DELETE FROM keyframes WHERE exercise_id = ?').run(id);
        const insertKeyframe = this.db.prepare(
          'INSERT INTO keyframes (id, exercise_id, timestamp_ms, label, params_json) VALUES (?, ?, ?, ?, ?)'
        );
        for (const kf of exercise.keyframes) {
          insertKeyframe.run(kf.id, id, kf.timestampMs, kf.label, JSON.stringify(kf.params));
        }
      }

      if (exercise.coordinates) {
        this.db.prepare('DELETE FROM coordinates WHERE exercise_id = ?').run(id);
        const insertCoord = this.db.prepare(
          'INSERT INTO coordinates (id, exercise_id, label, x, y, z, source_ref) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        for (const coord of exercise.coordinates) {
          insertCoord.run(coord.id, id, coord.label, coord.x, coord.y, coord.z, coord.sourceRef);
        }
      }

      if (exercise.screenshots) {
        this.db.prepare('DELETE FROM screenshots WHERE exercise_id = ?').run(id);
        const insertScreenshot = this.db.prepare(
          `INSERT INTO screenshots (id, exercise_id, filename, file_path, thumbnail_path, timestamp_ms, review_status, review_note, section_axis, section_depth)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        const insertLink = this.db.prepare(
          'INSERT INTO screenshot_coordinates (screenshot_id, coordinate_id) VALUES (?, ?)'
        );
        for (const s of exercise.screenshots) {
          insertScreenshot.run(
            s.id,
            id,
            s.filename,
            s.filePath,
            s.thumbnailPath,
            s.timestampMs,
            s.reviewStatus,
            s.reviewNote,
            s.sectionPlane?.axis || null,
            s.sectionPlane?.depth ?? null
          );
          for (const coordId of s.linkedCoordinateIds) {
            insertLink.run(s.id, coordId);
          }
        }
      }
    });

    tx();
    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM exercises WHERE id = ?').run(id);
    return result.changes > 0;
  }

  findDuplicate(data: Partial<Exercise>): Exercise | null {
    const conditions: string[] = [];
    const params: any[] = [];

    if (data.sourceRowNumber !== undefined && data.sourceRowNumber !== null) {
      conditions.push('source_row_number = ?');
      params.push(data.sourceRowNumber);
    }
    if (data.sourceImageName) {
      conditions.push('source_image_name = ?');
      params.push(data.sourceImageName);
    }

    if (conditions.length === 0) return null;

    const row = this.db
      .prepare(`SELECT * FROM exercises WHERE ${conditions.join(' AND ')} LIMIT 1`)
      .get(...params) as any;

    if (!row) return null;

    const relations = this.loadRelations([row.id]);
    const rel = relations.get(row.id)!;
    return this.mapRowToExercise(row, rel.keyframes, rel.coordinates, rel.screenshots);
  }

  bulkImport(exercises: Exercise[]): ImportResult {
    const result: ImportResult = {
      total: exercises.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      duplicates: [],
    };

    const tx = this.db.transaction(() => {
      for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i];
        const existing = this.findDuplicate(exercise);

        if (existing) {
          const conflict: ImportConflict = {
            rowIndex: i,
            existingId: existing.id,
            incomingData: exercise,
          };
          result.duplicates.push(conflict);
          result.skipped++;
        } else {
          this.create(exercise);
          result.inserted++;
        }
      }
    });

    tx();
    return result;
  }
}
