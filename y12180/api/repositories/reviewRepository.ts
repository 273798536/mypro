import { getDb, generateId, toCamelCase } from '../db';
import type { Review, PaginationParams, PaginatedResponse } from '../../shared/types';

export class ReviewRepository {
  private db = getDb();

  findAll(params: PaginationParams & { status?: string } = {}): PaginatedResponse<Review & { matchResult: unknown }> {
    const { page = 1, pageSize = 20, status } = params;
    const offset = (page - 1) * pageSize;
    
    const whereClauses: string[] = ['1=1'];
    const queryParams: unknown[] = [];

    if (status) {
      whereClauses.push('r.status = ?');
      queryParams.push(status);
    }

    const whereSql = whereClauses.join(' AND ');

    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM reviews r
      INNER JOIN match_results mr ON r.match_result_id = mr.id
      INNER JOIN songs s ON mr.playlist_song_id = s.id
      WHERE ${whereSql}
    `);
    const { count } = countStmt.get(...queryParams) as { count: number };

    const stmt = this.db.prepare(`
      SELECT 
        r.*,
        mr.id as mr_id,
        mr.playlist_song_id as mr_playlist_song_id,
        mr.copyright_id as mr_copyright_id,
        mr.match_status as mr_match_status,
        mr.match_confidence as mr_match_confidence,
        mr.risk_level as mr_risk_level,
        mr.risk_reasons as mr_risk_reasons,
        mr.is_cover_detected as mr_is_cover_detected,
        mr.region_restrictions as mr_region_restrictions,
        mr.created_at as mr_created_at,
        mr.updated_at as mr_updated_at,
        s.id as song_id,
        s.name as song_name,
        s.artist as song_artist
      FROM reviews r
      INNER JOIN match_results mr ON r.match_result_id = mr.id
      INNER JOIN songs s ON mr.playlist_song_id = s.id
      WHERE ${whereSql}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(...queryParams, pageSize, offset) as Record<string, unknown>[];
    
    const data = rows.map(row => {
      const review = toCamelCase<Review>(row);
      
      const matchResult = {
        id: row.mr_id as string,
        playlistSongId: row.mr_playlist_song_id as string,
        copyrightId: row.mr_copyright_id as string | null,
        matchStatus: row.mr_match_status as 'full' | 'partial' | 'none' | 'conflict',
        matchConfidence: row.mr_match_confidence as number,
        riskLevel: row.mr_risk_level as 'high' | 'medium' | 'low' | 'none',
        riskReasons: typeof row.mr_risk_reasons === 'string' ? JSON.parse(row.mr_risk_reasons) : row.mr_risk_reasons,
        isCoverDetected: row.mr_is_cover_detected === 1,
        regionRestrictions: typeof row.mr_region_restrictions === 'string' ? JSON.parse(row.mr_region_restrictions) : row.mr_region_restrictions,
        createdAt: row.mr_created_at as string,
        updatedAt: row.mr_updated_at as string,
        song: {
          id: row.song_id as string,
          name: row.song_name as string,
          artist: row.song_artist as string,
        },
      };
      
      return {
        ...review,
        matchResult,
      };
    });

    return {
      data: data as unknown as (Review & { matchResult: unknown })[],
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    };
  }

  findById(id: string): (Review & { matchResult: unknown }) | null {
    const stmt = this.db.prepare(`
      SELECT 
        r.*,
        mr.id as mr_id,
        mr.playlist_song_id as mr_playlist_song_id,
        mr.copyright_id as mr_copyright_id,
        mr.match_status as mr_match_status,
        mr.match_confidence as mr_match_confidence,
        mr.risk_level as mr_risk_level,
        mr.risk_reasons as mr_risk_reasons,
        mr.is_cover_detected as mr_is_cover_detected,
        mr.region_restrictions as mr_region_restrictions,
        mr.created_at as mr_created_at,
        mr.updated_at as mr_updated_at,
        s.id as song_id,
        s.name as song_name,
        s.artist as song_artist
      FROM reviews r
      INNER JOIN match_results mr ON r.match_result_id = mr.id
      INNER JOIN songs s ON mr.playlist_song_id = s.id
      WHERE r.id = ?
    `);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    
    if (!row) return null;

    const review = toCamelCase<Review>(row);
    
    const matchResult = {
      id: row.mr_id as string,
      playlistSongId: row.mr_playlist_song_id as string,
      copyrightId: row.mr_copyright_id as string | null,
      matchStatus: row.mr_match_status as 'full' | 'partial' | 'none' | 'conflict',
      matchConfidence: row.mr_match_confidence as number,
      riskLevel: row.mr_risk_level as 'high' | 'medium' | 'low' | 'none',
      riskReasons: typeof row.mr_risk_reasons === 'string' ? JSON.parse(row.mr_risk_reasons) : row.mr_risk_reasons,
      isCoverDetected: row.mr_is_cover_detected === 1,
      regionRestrictions: typeof row.mr_region_restrictions === 'string' ? JSON.parse(row.mr_region_restrictions) : row.mr_region_restrictions,
      createdAt: row.mr_created_at as string,
      updatedAt: row.mr_updated_at as string,
      song: {
        id: row.song_id as string,
        name: row.song_name as string,
        artist: row.song_artist as string,
      },
    };
    
    return {
      ...review,
      matchResult,
    } as unknown as Review & { matchResult: unknown };
  }

  findByMatchResultId(matchResultId: string): Review | null {
    const stmt = this.db.prepare('SELECT * FROM reviews WHERE match_result_id = ? ORDER BY created_at DESC LIMIT 1');
    const row = stmt.get(matchResultId) as Record<string, unknown> | undefined;
    return row ? toCamelCase<Review>(row) : null;
  }

  create(review: Omit<Review, 'id' | 'createdAt'>): Review {
    const now = new Date().toISOString();
    const id = generateId('rev');
    
    const stmt = this.db.prepare(`
      INSERT INTO reviews (
        id, match_result_id, reviewer, status, comments, risk_level_override, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      review.matchResultId,
      review.reviewer,
      review.status,
      review.comments || null,
      review.riskLevelOverride || null,
      now
    );
    
    const result = this.findById(id);
    return result as unknown as Review;
  }

  update(id: string, updates: Partial<Review>): Review | null {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.comments !== undefined) {
      fields.push('comments = ?');
      values.push(updates.comments);
    }
    if (updates.riskLevelOverride !== undefined) {
      fields.push('risk_level_override = ?');
      values.push(updates.riskLevelOverride);
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE reviews SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    const result = this.findById(id);
    return result as unknown as Review;
  }
}

export default ReviewRepository;
