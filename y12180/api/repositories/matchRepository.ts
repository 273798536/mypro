import { getDb, generateId, toCamelCase } from '../db';
import type { MatchResult, FilterParams, PaginationParams, PaginatedResponse } from '../../shared/types';

export class MatchRepository {
  private db = getDb();

  findAll(params: FilterParams & PaginationParams = {}): PaginatedResponse<MatchResult & { song: unknown; copyright: unknown }> {
    const { page = 1, pageSize = 20, riskLevel, matchStatus, search, artist } = params;
    const offset = (page - 1) * pageSize;
    
    const whereClauses: string[] = ['1=1'];
    const queryParams: unknown[] = [];

    if (riskLevel) {
      whereClauses.push('mr.risk_level = ?');
      queryParams.push(riskLevel);
    }

    if (matchStatus) {
      whereClauses.push('mr.match_status = ?');
      queryParams.push(matchStatus);
    }

    if (search) {
      whereClauses.push('(s.name LIKE ? OR s.artist LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (artist) {
      whereClauses.push('s.artist = ?');
      queryParams.push(artist);
    }

    const whereSql = whereClauses.join(' AND ');

    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM match_results mr
      INNER JOIN songs s ON mr.playlist_song_id = s.id
      LEFT JOIN copyrights c ON mr.copyright_id = c.id
      WHERE ${whereSql}
    `);
    const { count } = countStmt.get(...queryParams) as { count: number };

    const stmt = this.db.prepare(`
      SELECT 
        mr.*,
        s.id as song_id,
        s.name as song_name,
        s.artist as song_artist,
        s.duration as song_duration,
        s.source as song_source,
        s.created_at as song_created_at,
        s.updated_at as song_updated_at,
        c.id as copyright_id,
        c.song_name as copyright_song_name,
        c.artist as copyright_artist,
        c.authorized_regions as copyright_authorized_regions,
        c.license_type as copyright_license_type,
        c.valid_from as copyright_valid_from,
        c.valid_to as copyright_valid_to,
        c.is_cover as copyright_is_cover,
        c.original_artist as copyright_original_artist
      FROM match_results mr
      INNER JOIN songs s ON mr.playlist_song_id = s.id
      LEFT JOIN copyrights c ON mr.copyright_id = c.id
      WHERE ${whereSql}
      ORDER BY mr.created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(...queryParams, pageSize, offset) as Record<string, unknown>[];
    
    const data = rows.map(row => {
      const matchResult = toCamelCase<MatchResult>(row);
      
      const song = {
        id: row.song_id as string,
        name: row.song_name as string,
        artist: row.song_artist as string,
        duration: row.song_duration as number,
        source: row.song_source as 'playlist' | 'library',
        createdAt: row.song_created_at as string,
        updatedAt: row.song_updated_at as string,
      };
      
      let copyright = null;
      if (row.copyright_id) {
        copyright = {
          id: row.copyright_id as string,
          songName: row.copyright_song_name as string,
          artist: row.copyright_artist as string,
          authorizedRegions: typeof row.copyright_authorized_regions === 'string' 
            ? JSON.parse(row.copyright_authorized_regions) 
            : row.copyright_authorized_regions as string[],
          licenseType: row.copyright_license_type as 'exclusive' | 'non-exclusive' | 'cover',
          validFrom: row.copyright_valid_from as string,
          validTo: row.copyright_valid_to as string,
          isCover: row.copyright_is_cover === 1,
          originalArtist: row.copyright_original_artist as string | undefined,
        };
      }
      
      return {
        ...matchResult,
        song,
        copyright,
      };
    });

    return {
      data: data as unknown as (MatchResult & { song: unknown; copyright: unknown })[],
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    };
  }

  findById(id: string): (MatchResult & { song: unknown; copyright: unknown }) | null {
    const stmt = this.db.prepare(`
      SELECT 
        mr.*,
        s.id as song_id,
        s.name as song_name,
        s.artist as song_artist,
        s.duration as song_duration,
        s.source as song_source,
        s.created_at as song_created_at,
        s.updated_at as song_updated_at,
        c.id as copyright_id,
        c.song_name as copyright_song_name,
        c.artist as copyright_artist,
        c.authorized_regions as copyright_authorized_regions,
        c.license_type as copyright_license_type,
        c.valid_from as copyright_valid_from,
        c.valid_to as copyright_valid_to,
        c.is_cover as copyright_is_cover,
        c.original_artist as copyright_original_artist
      FROM match_results mr
      INNER JOIN songs s ON mr.playlist_song_id = s.id
      LEFT JOIN copyrights c ON mr.copyright_id = c.id
      WHERE mr.id = ?
    `);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    
    if (!row) return null;

    const matchResult = toCamelCase<MatchResult>(row);
    
    const song = {
      id: row.song_id as string,
      name: row.song_name as string,
      artist: row.song_artist as string,
      duration: row.song_duration as number,
      source: row.song_source as 'playlist' | 'library',
      createdAt: row.song_created_at as string,
      updatedAt: row.song_updated_at as string,
    };
    
    let copyright = null;
    if (row.copyright_id) {
      copyright = {
        id: row.copyright_id as string,
        songName: row.copyright_song_name as string,
        artist: row.copyright_artist as string,
        authorizedRegions: typeof row.copyright_authorized_regions === 'string' 
          ? JSON.parse(row.copyright_authorized_regions) 
          : row.copyright_authorized_regions as string[],
        licenseType: row.copyright_license_type as 'exclusive' | 'non-exclusive' | 'cover',
        validFrom: row.copyright_valid_from as string,
        validTo: row.copyright_valid_to as string,
        isCover: row.copyright_is_cover === 1,
        originalArtist: row.copyright_original_artist as string | undefined,
      };
    }
    
    return {
      ...matchResult,
      song,
      copyright,
    } as unknown as MatchResult & { song: unknown; copyright: unknown };
  }

  findByPlaylistSongId(songId: string): MatchResult | null {
    const stmt = this.db.prepare('SELECT * FROM match_results WHERE playlist_song_id = ?');
    const row = stmt.get(songId) as Record<string, unknown> | undefined;
    return row ? toCamelCase<MatchResult>(row) : null;
  }

  create(match: Omit<MatchResult, 'id' | 'createdAt' | 'updatedAt'>): MatchResult {
    const now = new Date().toISOString();
    const id = generateId('mat');
    
    const stmt = this.db.prepare(`
      INSERT INTO match_results (
        id, playlist_song_id, copyright_id, match_status, match_confidence,
        risk_level, risk_reasons, is_cover_detected, region_restrictions,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      match.playlistSongId,
      match.copyrightId,
      match.matchStatus,
      match.matchConfidence,
      match.riskLevel,
      JSON.stringify(match.riskReasons),
      match.isCoverDetected ? 1 : 0,
      JSON.stringify(match.regionRestrictions),
      now,
      now
    );
    
    const result = this.findById(id);
    return result as unknown as MatchResult;
  }

  update(id: string, updates: Partial<MatchResult>): MatchResult | null {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.copyrightId !== undefined) {
      fields.push('copyright_id = ?');
      values.push(updates.copyrightId);
    }
    if (updates.matchStatus !== undefined) {
      fields.push('match_status = ?');
      values.push(updates.matchStatus);
    }
    if (updates.matchConfidence !== undefined) {
      fields.push('match_confidence = ?');
      values.push(updates.matchConfidence);
    }
    if (updates.riskLevel !== undefined) {
      fields.push('risk_level = ?');
      values.push(updates.riskLevel);
    }
    if (updates.riskReasons !== undefined) {
      fields.push('risk_reasons = ?');
      values.push(JSON.stringify(updates.riskReasons));
    }
    if (updates.isCoverDetected !== undefined) {
      fields.push('is_cover_detected = ?');
      values.push(updates.isCoverDetected ? 1 : 0);
    }
    if (updates.regionRestrictions !== undefined) {
      fields.push('region_restrictions = ?');
      values.push(JSON.stringify(updates.regionRestrictions));
    }

    fields.push('updated_at = ?');
    values.push(now, id);

    const stmt = this.db.prepare(`
      UPDATE match_results SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    const result = this.findById(id);
    return result as unknown as MatchResult;
  }

  deleteByPlaylistSongId(songId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM match_results WHERE playlist_song_id = ?');
    const result = stmt.run(songId);
    return result.changes > 0;
  }

  deleteAll(): void {
    this.db.exec('DELETE FROM match_results');
  }

  getStats(): {
    total: number;
    byRiskLevel: Record<string, number>;
    byMatchStatus: Record<string, number>;
  } {
    const totalResult = this.db.prepare('SELECT COUNT(*) as count FROM match_results').get() as { count: number };
    
    const byRiskResult = this.db.prepare(`
      SELECT risk_level, COUNT(*) as count 
      FROM match_results 
      GROUP BY risk_level
    `).all() as { risk_level: string; count: number }[];
    
    const byStatusResult = this.db.prepare(`
      SELECT match_status, COUNT(*) as count 
      FROM match_results 
      GROUP BY match_status
    `).all() as { match_status: string; count: number }[];

    const byRiskLevel: Record<string, number> = {};
    for (const row of byRiskResult) {
      byRiskLevel[row.risk_level] = row.count;
    }

    const byMatchStatus: Record<string, number> = {};
    for (const row of byStatusResult) {
      byMatchStatus[row.match_status] = row.count;
    }

    return {
      total: totalResult.count,
      byRiskLevel,
      byMatchStatus,
    };
  }
}

export default MatchRepository;
