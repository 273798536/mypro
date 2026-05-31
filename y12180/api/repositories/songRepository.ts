import { getDb, generateId, toCamelCase } from '../db';
import type { Song, FilterParams, PaginationParams, PaginatedResponse } from '../../shared/types';

export class SongRepository {
  private db = getDb();

  findAll(params: FilterParams & PaginationParams = {}): PaginatedResponse<Song> {
    const { page = 1, pageSize = 20, search, artist } = params;
    const offset = (page - 1) * pageSize;
    
    const whereClauses: string[] = [];
    const queryParams: unknown[] = [];

    if (search) {
      whereClauses.push('(name LIKE ? OR artist LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (artist) {
      whereClauses.push('artist = ?');
      queryParams.push(artist);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM songs ${whereSql}
    `);
    const { count } = countStmt.get(...queryParams) as { count: number };

    const stmt = this.db.prepare(`
      SELECT * FROM songs ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(...queryParams, pageSize, offset) as Record<string, unknown>[];
    
    const data = rows.map(row => toCamelCase<Song>(row));

    return {
      data,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    };
  }

  findById(id: string): Song | null {
    const stmt = this.db.prepare('SELECT * FROM songs WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? toCamelCase<Song>(row) : null;
  }

  create(song: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>): Song {
    const now = new Date().toISOString();
    const id = generateId('sng');
    
    const stmt = this.db.prepare(`
      INSERT INTO songs (id, name, artist, duration, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, song.name, song.artist, song.duration, song.source, now, now);
    
    return this.findById(id)!;
  }

  bulkCreate(songs: Omit<Song, 'id' | 'createdAt' | 'updatedAt'>[]): Song[] {
    const now = new Date().toISOString();
    const createdSongs: Song[] = [];
    
    const insertStmt = this.db.prepare(`
      INSERT INTO songs (id, name, artist, duration, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((songList: typeof songs) => {
      for (const song of songList) {
        const id = generateId('sng');
        insertStmt.run(id, song.name, song.artist, song.duration, song.source, now, now);
        createdSongs.push({
          ...song,
          id,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    transaction(songs);
    return createdSongs;
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM songs WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  findByNameAndArtist(name: string, artist: string): Song[] {
    const stmt = this.db.prepare(`
      SELECT * FROM songs WHERE name = ? AND artist = ?
    `);
    const rows = stmt.all(name, artist) as Record<string, unknown>[];
    return rows.map(row => toCamelCase<Song>(row));
  }

  getAllArtists(): string[] {
    const stmt = this.db.prepare('SELECT DISTINCT artist FROM songs ORDER BY artist');
    const rows = stmt.all() as { artist: string }[];
    return rows.map(row => row.artist);
  }
}

export default SongRepository;
