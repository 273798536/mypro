import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { assessRisk } from '../services/riskEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.resolve(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DB_DIR, 'tidal_sampling.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export const initDatabase = (): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sampling_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      area TEXT NOT NULL,
      species TEXT NOT NULL,
      wind_wave_forecast TEXT,
      tide_data TEXT,
      water_quality TEXT,
      risk_level TEXT NOT NULL DEFAULT 'pending',
      risk_factors TEXT NOT NULL DEFAULT '[]',
      confirmed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS risk_assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      risk_factors TEXT NOT NULL DEFAULT '[]',
      affected_conclusions TEXT NOT NULL DEFAULT '[]',
      assessed_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (record_id) REFERENCES sampling_records(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assessment_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (record_id) REFERENCES sampling_records(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_records_risk ON sampling_records(risk_level);
    CREATE INDEX IF NOT EXISTS idx_records_date ON sampling_records(date);
    CREATE INDEX IF NOT EXISTS idx_assessments_record ON risk_assessments(record_id);
    CREATE INDEX IF NOT EXISTS idx_log_record ON assessment_log(record_id);
  `);

  const countStmt = db.prepare('SELECT COUNT(*) as cnt FROM sampling_records');
  const result = countStmt.get() as { cnt: number };

  if (result.cnt === 0) {
    const seedData = [
      {
        date: '2026-06-10',
        area: '东滩A区',
        species: '缢蛏',
        wind_wave_forecast: '东南风3级，浪高0.5m',
        tide_data: '大潮汐，潮差4.2m',
        water_quality: 'pH 8.1, DO 7.2mg/L',
      },
      {
        date: '2026-06-11',
        area: '西滩B区',
        species: '泥蚶',
        wind_wave_forecast: null,
        tide_data: '中潮汐，潮差3.1m',
        water_quality: null,
      },
      {
        date: '2026-06-12',
        area: '南滩C区',
        species: '文蛤',
        wind_wave_forecast: '东北风6级，浪高2.8m，禁航区越界',
        tide_data: '小潮汐，潮差1.8m',
        water_quality: 'pH 7.4, DO 4.1mg/L',
      },
    ];

    const insertStmt = db.prepare(`
      INSERT INTO sampling_records (date, area, species, wind_wave_forecast, tide_data, water_quality)
      VALUES (@date, @area, @species, @wind_wave_forecast, @tide_data, @water_quality)
    `);

    const updateRiskStmt = db.prepare(`
      UPDATE sampling_records SET risk_level = ?, risk_factors = ?, confirmed = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `);

    const insertAssessmentStmt = db.prepare(`
      INSERT INTO risk_assessments (record_id, risk_level, risk_factors, affected_conclusions)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = db.transaction((records) => {
      for (const record of records) {
        const info = insertStmt.run(record);
        const id = Number(info.lastInsertRowid);

        const row = db.prepare('SELECT * FROM sampling_records WHERE id = ?').get(id) as Record<string, unknown>;

        const assessment = assessRisk({
          id,
          date: row.date as string,
          area: row.area as string,
          species: row.species as string,
          wind_wave_forecast: row.wind_wave_forecast as string | null,
          tide_data: row.tide_data as string | null,
          water_quality: row.water_quality as string | null,
        });

        const isNormal = assessment.risk_level === 'normal' && record.wind_wave_forecast && record.water_quality;
        updateRiskStmt.run(assessment.risk_level, JSON.stringify(assessment.risk_factors), isNormal ? 1 : 0, id);
        insertAssessmentStmt.run(id, assessment.risk_level, JSON.stringify(assessment.risk_factors), JSON.stringify(assessment.affected_conclusions));
      }
    });

    insertMany(seedData);
  }
};
