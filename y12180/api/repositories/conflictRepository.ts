import { getDb, generateId, toCamelCase } from '../db';
import type { Conflict, MatchResult, PaginationParams, PaginatedResponse } from '../../shared/types';

export class ConflictRepository {
  private db = getDb();

  findAll(params: PaginationParams & { status?: string } = {}): PaginatedResponse<Conflict & { matchResult: unknown }> {
    const { page = 1, pageSize = 20, status } = params;
    const offset = (page - 1) * pageSize;
    
    const whereClauses: string[] = ['1=1'];
    const queryParams: unknown[] = [];

    if (status) {
      whereClauses.push('c.status = ?');
      queryParams.push(status);
    }

    const whereSql = whereClauses.join(' AND ');

    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM conflicts c
      INNER JOIN match_results mr ON c.match_result_id = mr.id
      INNER JOIN songs s ON mr.playlist_song_id = s.id
      WHERE ${whereSql}
    `);
    const { count } = countStmt.get(...queryParams) as { count: number };

    const stmt = this.db.prepare(`
      SELECT 
        c.*,
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
      FROM conflicts c
      INNER JOIN match_results mr ON c.match_result_id = mr.id
      INNER JOIN songs s ON mr.playlist_song_id = s.id
      WHERE ${whereSql}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(...queryParams, pageSize, offset) as Record<string, unknown>[];
    
    const data = rows.map(row => {
      const conflict = toCamelCase<Conflict>(row);
      
      const matchResult = {
        id: row.mr_id as string,
        playlistSongId: row.mr_playlist_song_id as string,
        copyrightId: row.mr_copyright_id as string | null,
        matchStatus: row.mr_match_status as MatchResult['matchStatus'],
        matchConfidence: row.mr_match_confidence as number,
        riskLevel: row.mr_risk_level as MatchResult['riskLevel'],
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
        ...conflict,
        playlistData: typeof conflict.playlistData === 'string' ? JSON.parse(conflict.playlistData) : conflict.playlistData,
        copyrightData: typeof conflict.copyrightData === 'string' ? JSON.parse(conflict.copyrightData) : conflict.copyrightData,
        matchResult,
      };
    });

    return {
      data: data as unknown as (Conflict & { matchResult: unknown })[],
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    };
  }

  findById(id: string): (Conflict & { matchResult: unknown }) | null {
    const stmt = this.db.prepare(`
      SELECT 
        c.*,
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
      FROM conflicts c
      INNER JOIN match_results mr ON c.match_result_id = mr.id
      INNER JOIN songs s ON mr.playlist_song_id = s.id
      WHERE c.id = ?
    `);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    
    if (!row) return null;

    const conflict = toCamelCase<Conflict>(row);
    
    const matchResult = {
      id: row.mr_id as string,
      playlistSongId: row.mr_playlist_song_id as string,
      copyrightId: row.mr_copyright_id as string | null,
      matchStatus: row.mr_match_status as MatchResult['matchStatus'],
      matchConfidence: row.mr_match_confidence as number,
      riskLevel: row.mr_risk_level as MatchResult['riskLevel'],
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
      ...conflict,
      playlistData: typeof conflict.playlistData === 'string' ? JSON.parse(conflict.playlistData) : conflict.playlistData,
      copyrightData: typeof conflict.copyrightData === 'string' ? JSON.parse(conflict.copyrightData) : conflict.copyrightData,
      matchResult,
    } as unknown as Conflict & { matchResult: unknown };
  }

  findByMatchResultId(matchResultId: string): Conflict | null {
    const stmt = this.db.prepare('SELECT * FROM conflicts WHERE match_result_id = ?');
    const row = stmt.get(matchResultId) as Record<string, unknown> | undefined;
    if (!row) return null;
    
    const conflict = toCamelCase<Conflict>(row);
    return {
      ...conflict,
      playlistData: typeof conflict.playlistData === 'string' ? JSON.parse(conflict.playlistData) : conflict.playlistData,
      copyrightData: typeof conflict.copyrightData === 'string' ? JSON.parse(conflict.copyrightData) : conflict.copyrightData,
    };
  }

  create(conflict: Omit<Conflict, 'id' | 'createdAt' | 'status'> & { status?: string }): Conflict {
    const now = new Date().toISOString();
    const id = generateId('cfl');
    
    const stmt = this.db.prepare(`
      INSERT INTO conflicts (
        id, match_result_id, type, playlist_data, copyright_data, status,
        resolution, resolved_by, resolved_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      conflict.matchResultId,
      conflict.type,
      JSON.stringify(conflict.playlistData),
      JSON.stringify(conflict.copyrightData),
      conflict.status || 'pending',
      conflict.resolution || null,
      conflict.resolvedBy || null,
      conflict.resolvedAt || null,
      now
    );
    
    const result = this.findById(id);
    return result as unknown as Conflict;
  }

  resolve(id: string, resolution: {
    status: 'resolved_playlist' | 'resolved_copyright' | 'resolved_custom';
    resolution: string;
    resolvedBy: string;
  }): Conflict | null {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      UPDATE conflicts 
      SET status = ?, resolution = ?, resolved_by = ?, resolved_at = ?
      WHERE id = ?
    `);
    stmt.run(resolution.status, resolution.resolution, resolution.resolvedBy, now, id);
    
    const result = this.findById(id);
    return result as unknown as Conflict;
  }

  deleteByMatchResultId(matchResultId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM conflicts WHERE match_result_id = ?');
    const result = stmt.run(matchResultId);
    return result.changes > 0;
  }

  deleteAll(): void {
    const stmt = this.db.prepare('DELETE FROM conflicts');
    stmt.run();
  }
}

export default ConflictRepository;
