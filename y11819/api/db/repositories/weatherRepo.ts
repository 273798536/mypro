import { getDb } from '../index.js';
import type { WeatherRow } from '../types.js';

export function insertWeather(record: Omit<WeatherRow, 'id' | 'created_at'> & { id?: string }): string {
  const db = getDb();
  const id = record.id || crypto.randomUUID();
  db.prepare(`
    INSERT INTO weather_exemption (id, berth_id, vessel_name, port, weather_start, weather_end, weather_type, evidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, record.berth_id, record.vessel_name, record.port, record.weather_start, record.weather_end, record.weather_type, record.evidence);
  return id;
}

export function getAllWeathers(): WeatherRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM weather_exemption ORDER BY created_at DESC').all() as WeatherRow[];
}

export function getWeathersByBerthId(berthId: string): WeatherRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM weather_exemption WHERE berth_id = ?').all(berthId) as WeatherRow[];
}

export function getWeathersByVesselAndPort(vesselName: string, port: string): WeatherRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM weather_exemption WHERE vessel_name = ? AND port = ?').all(vesselName, port) as WeatherRow[];
}

export function updateWeather(id: string, updates: Partial<WeatherRow>): boolean {
  const db = getDb();
  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
  if (fields.length === 0) return false;
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (updates as Record<string, unknown>)[f]);
  const result = db.prepare(`UPDATE weather_exemption SET ${setClause} WHERE id = ?`).run(...values, id);
  return result.changes > 0;
}

export function deleteAllWeathers(): void {
  const db = getDb();
  db.prepare('DELETE FROM weather_exemption').run();
}
