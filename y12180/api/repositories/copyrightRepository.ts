import { getDb, toCamelCase } from '../db';
import type { Copyright } from '../../shared/types';

export class CopyrightRepository {
  private db = getDb();

  findAll(): Copyright[] {
    const stmt = this.db.prepare('SELECT * FROM copyrights ORDER BY song_name, artist');
    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map(row => toCamelCase<Copyright>(row));
  }

  findById(id: string): Copyright | null {
    const stmt = this.db.prepare('SELECT * FROM copyrights WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? toCamelCase<Copyright>(row) : null;
  }

  findByName(name: string): Copyright[] {
    const stmt = this.db.prepare(`
      SELECT * FROM copyrights WHERE song_name LIKE ?
      ORDER BY song_name, artist
    `);
    const rows = stmt.all(`%${name}%`) as Record<string, unknown>[];
    return rows.map(row => toCamelCase<Copyright>(row));
  }

  findExactMatch(name: string, artist: string): Copyright | null {
    const stmt = this.db.prepare(`
      SELECT * FROM copyrights WHERE song_name = ? AND artist = ?
      LIMIT 1
    `);
    const row = stmt.get(name, artist) as Record<string, unknown> | undefined;
    return row ? toCamelCase<Copyright>(row) : null;
  }

  findByNameFuzzy(name: string): Copyright[] {
    const stmt = this.db.prepare(`
      SELECT * FROM copyrights 
      WHERE REPLACE(REPLACE(REPLACE(song_name, ' ', ''), '，', ''), ',', '') 
      LIKE REPLACE(REPLACE(REPLACE(?, ' ', ''), '，', ''), ',', '')
      ORDER BY song_name, artist
    `);
    const rows = stmt.all(`%${name}%`) as Record<string, unknown>[];
    return rows.map(row => toCamelCase<Copyright>(row));
  }

  findCovers(originalArtist: string): Copyright[] {
    const stmt = this.db.prepare(`
      SELECT * FROM copyrights 
      WHERE is_cover = 1 AND original_artist = ?
      ORDER BY song_name, artist
    `);
    const rows = stmt.all(originalArtist) as Record<string, unknown>[];
    return rows.map(row => toCamelCase<Copyright>(row));
  }

  checkLicenseExpired(copyrightId: string): boolean {
    const stmt = this.db.prepare(`
      SELECT valid_to FROM copyrights WHERE id = ?
    `);
    const row = stmt.get(copyrightId) as { valid_to: string } | undefined;
    if (!row) return true;
    
    const validTo = new Date(row.valid_to);
    const now = new Date();
    return now > validTo;
  }
}

export default CopyrightRepository;
