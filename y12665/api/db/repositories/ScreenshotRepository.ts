import type Database from 'better-sqlite3';
import type { Screenshot } from '../../../shared/types.js';

export class ScreenshotRepository {
  constructor(private db: Database.Database) {}

  findById(id: string): Screenshot | null {
    const row = this.db.prepare('SELECT * FROM screenshots WHERE id = ?').get(id) as any;
    if (!row) return null;

    const linkRows = this.db
      .prepare('SELECT coordinate_id FROM screenshot_coordinates WHERE screenshot_id = ?')
      .all(id) as any[];

    const linkedCoordinateIds = linkRows.map((r) => r.coordinate_id);

    const screenshot: Screenshot = {
      id: row.id,
      filename: row.filename,
      filePath: row.file_path,
      thumbnailPath: row.thumbnail_path || '',
      timestampMs: row.timestamp_ms,
      reviewStatus: row.review_status,
      reviewNote: row.review_note,
      linkedCoordinateIds,
    };

    if (row.section_axis && row.section_depth !== null) {
      screenshot.sectionPlane = {
        axis: row.section_axis,
        depth: row.section_depth,
      };
    }

    return screenshot;
  }

  updateReviewStatus(
    id: string,
    reviewStatus: 'approved' | 'pending' | 'rejected',
    reviewNote?: string | null
  ): boolean {
    const result = this.db
      .prepare('UPDATE screenshots SET review_status = ?, review_note = ? WHERE id = ?')
      .run(reviewStatus, reviewNote ?? null, id);
    return result.changes > 0;
  }

  findByExerciseId(exerciseId: string): Screenshot[] {
    const rows = this.db
      .prepare('SELECT * FROM screenshots WHERE exercise_id = ? ORDER BY timestamp_ms ASC')
      .all(exerciseId) as any[];

    if (rows.length === 0) return [];

    const screenshotIds = rows.map((r) => r.id);
    const placeholders = screenshotIds.map(() => '?').join(',');
    const linkRows = this.db
      .prepare(
        `SELECT screenshot_id, coordinate_id FROM screenshot_coordinates WHERE screenshot_id IN (${placeholders})`
      )
      .all(...screenshotIds) as any[];

    const linkedMap = new Map<string, string[]>();
    for (const link of linkRows) {
      if (!linkedMap.has(link.screenshot_id)) {
        linkedMap.set(link.screenshot_id, []);
      }
      linkedMap.get(link.screenshot_id)!.push(link.coordinate_id);
    }

    return rows.map((row) => {
      const screenshot: Screenshot = {
        id: row.id,
        filename: row.filename,
        filePath: row.file_path,
        thumbnailPath: row.thumbnail_path || '',
        timestampMs: row.timestamp_ms,
        reviewStatus: row.review_status,
        reviewNote: row.review_note,
        linkedCoordinateIds: linkedMap.get(row.id) || [],
      };
      if (row.section_axis && row.section_depth !== null) {
        screenshot.sectionPlane = {
          axis: row.section_axis,
          depth: row.section_depth,
        };
      }
      return screenshot;
    });
  }
}
