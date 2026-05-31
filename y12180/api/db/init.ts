import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'copyright.db');

export function initDatabase(): Database.Database {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables(db);
  seedData(db);

  return db;
}

function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      artist TEXT NOT NULL,
      duration INTEGER,
      source TEXT NOT NULL DEFAULT 'playlist',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS copyrights (
      id TEXT PRIMARY KEY,
      song_name TEXT NOT NULL,
      artist TEXT NOT NULL,
      authorized_regions TEXT NOT NULL,
      license_type TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      valid_to TEXT NOT NULL,
      is_cover INTEGER NOT NULL DEFAULT 0,
      original_artist TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS match_results (
      id TEXT PRIMARY KEY,
      playlist_song_id TEXT NOT NULL,
      copyright_id TEXT,
      match_status TEXT NOT NULL,
      match_confidence REAL NOT NULL,
      risk_level TEXT NOT NULL,
      risk_reasons TEXT NOT NULL,
      is_cover_detected INTEGER NOT NULL DEFAULT 0,
      region_restrictions TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (playlist_song_id) REFERENCES songs(id) ON DELETE CASCADE,
      FOREIGN KEY (copyright_id) REFERENCES copyrights(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS conflicts (
      id TEXT PRIMARY KEY,
      match_result_id TEXT NOT NULL,
      type TEXT NOT NULL,
      playlist_data TEXT NOT NULL,
      copyright_data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      resolution TEXT,
      resolved_by TEXT,
      resolved_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (match_result_id) REFERENCES match_results(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      match_result_id TEXT NOT NULL,
      reviewer TEXT NOT NULL,
      status TEXT NOT NULL,
      comments TEXT,
      risk_level_override TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (match_result_id) REFERENCES match_results(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_songs_name ON songs(name);
    CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
    CREATE INDEX IF NOT EXISTS idx_copyrights_song_name ON copyrights(song_name);
    CREATE INDEX IF NOT EXISTS idx_copyrights_artist ON copyrights(artist);
    CREATE INDEX IF NOT EXISTS idx_match_results_song_id ON match_results(playlist_song_id);
    CREATE INDEX IF NOT EXISTS idx_match_results_risk ON match_results(risk_level);
    CREATE INDEX IF NOT EXISTS idx_match_results_status ON match_results(match_status);
    CREATE INDEX IF NOT EXISTS idx_conflicts_status ON conflicts(status);
    CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
  `);
}

function seedData(db: Database.Database): void {
  const copyrightCount = db.prepare('SELECT COUNT(*) as count FROM copyrights').get() as { count: number };
  
  if (copyrightCount.count === 0) {
    const now = new Date().toISOString();
    
    const insertCopyright = db.prepare(`
      INSERT INTO copyrights (id, song_name, artist, authorized_regions, license_type, valid_from, valid_to, is_cover, original_artist, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const copyrightData = [
      ['cpy_001', '夜曲', '周杰伦', JSON.stringify(['CN', 'HK', 'TW']), 'exclusive', '2020-01-01', '2027-12-31', 0, null],
      ['cpy_002', '稻香', '周杰伦', JSON.stringify(['CN']), 'non-exclusive', '2021-01-01', '2026-12-31', 0, null],
      ['cpy_003', '告白气球', '周杰伦', JSON.stringify(['CN', 'HK', 'TW', 'SG', 'MY']), 'exclusive', '2019-06-01', '2026-05-31', 0, null],
      ['cpy_004', '七里香', '周杰伦', JSON.stringify(['CN', 'HK']), 'non-exclusive', '2020-01-01', '2025-12-31', 0, null],
      ['cpy_005', '晴天', '周杰伦', JSON.stringify(['CN', 'HK', 'TW', 'JP']), 'exclusive', '2018-01-01', '2025-06-30', 0, null],
      ['cpy_006', '青花瓷', '周杰伦', JSON.stringify(['CN', 'HK', 'TW', 'US', 'CA']), 'exclusive', '2019-01-01', '2028-12-31', 0, null],
      ['cpy_007', '简单爱', '周杰伦', JSON.stringify(['CN']), 'non-exclusive', '2022-01-01', '2024-12-31', 0, null],
      ['cpy_008', '龙卷风', '邓紫棋', JSON.stringify(['CN', 'HK']), 'cover', '2021-03-01', '2026-02-28', 1, '周杰伦'],
      ['cpy_009', '默', '那英', JSON.stringify(['CN', 'HK', 'TW']), 'non-exclusive', '2015-01-01', '2025-12-31', 0, null],
      ['cpy_010', '小幸运', '田馥甄', JSON.stringify(['CN', 'HK', 'TW', 'SG', 'MY']), 'exclusive', '2015-07-01', '2027-06-30', 0, null],
    ];

    const transaction = db.transaction((data: typeof copyrightData) => {
      for (const row of data) {
        insertCopyright.run(...row, now, now);
      }
    });
    transaction(copyrightData);

    const insertSong = db.prepare(`
      INSERT INTO songs (id, name, artist, duration, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const songData = [
      ['sng_001', '夜曲', '周杰伦', 225, 'playlist'],
      ['sng_002', '稻香', '周杰伦', 210, 'playlist'],
      ['sng_003', '告白气球', '周杰伦', 195, 'playlist'],
      ['sng_004', '七里香', '周杰伦', 260, 'playlist'],
      ['sng_005', '晴天', '周杰伦', 280, 'playlist'],
      ['sng_006', '青花瓷', '周杰伦', 230, 'playlist'],
      ['sng_007', '简单爱', '周杰伦', 240, 'playlist'],
      ['sng_008', '龙卷风', '邓紫棋', 245, 'playlist'],
      ['sng_009', '默', '周杰伦', 300, 'playlist'],
      ['sng_010', '小幸运', '田馥甄', 270, 'playlist'],
      ['sng_011', '演员', '薛之谦', 275, 'playlist'],
      ['sng_012', '丑八怪', '薛之谦', 235, 'playlist'],
      ['sng_013', '刚刚好', '薛之谦', 240, 'playlist'],
      ['sng_014', '后来', '刘若英', 320, 'playlist'],
      ['sng_015', '后来', '张智霖', 310, 'playlist'],
    ];

    const songTransaction = db.transaction((data: typeof songData) => {
      for (const row of data) {
        insertSong.run(...row, now, now);
      }
    });
    songTransaction(songData);
  }
}

export default initDatabase;
