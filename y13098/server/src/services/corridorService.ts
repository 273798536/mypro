import { runQuery, runQueryOne, runExecute } from '../database';
import type { RouteCorridor } from '@shared/types';
import { generateId } from '@shared/utils';

const toCorridor = (row: any): RouteCorridor => ({
  id: row.id,
  name: row.name,
  code: row.code,
  startPoint: row.start_point,
  endPoint: row.end_point,
  length: row.length,
  altitudeMin: row.altitude_min,
  altitudeMax: row.altitude_max,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export async function getAllCorridors(): Promise<RouteCorridor[]> {
  const rows = await runQuery('SELECT * FROM route_corridors ORDER BY created_at DESC');
  return rows.map(toCorridor);
}

export async function getCorridorById(id: string): Promise<RouteCorridor | undefined> {
  const row = await runQueryOne('SELECT * FROM route_corridors WHERE id = ?', [id]);
  return row ? toCorridor(row) : undefined;
}

export async function createCorridor(data: Omit<RouteCorridor, 'id' | 'createdAt' | 'updatedAt'>): Promise<RouteCorridor> {
  const id = generateId();
  const now = new Date().toISOString();
  
  await runExecute(
    `INSERT INTO route_corridors 
     (id, name, code, start_point, end_point, length, altitude_min, altitude_max, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.code, data.startPoint, data.endPoint, data.length, data.altitudeMin, data.altitudeMax, now, now]
  );
  
  const corridor = await getCorridorById(id);
  if (!corridor) throw new Error('Failed to create corridor');
  return corridor;
}

export async function updateCorridor(id: string, data: Partial<Omit<RouteCorridor, 'id' | 'createdAt' | 'updatedAt'>>): Promise<RouteCorridor | undefined> {
  const existing = await getCorridorById(id);
  if (!existing) return undefined;
  
  const updates: string[] = [];
  const params: any[] = [];
  
  if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
  if (data.code !== undefined) { updates.push('code = ?'); params.push(data.code); }
  if (data.startPoint !== undefined) { updates.push('start_point = ?'); params.push(data.startPoint); }
  if (data.endPoint !== undefined) { updates.push('end_point = ?'); params.push(data.endPoint); }
  if (data.length !== undefined) { updates.push('length = ?'); params.push(data.length); }
  if (data.altitudeMin !== undefined) { updates.push('altitude_min = ?'); params.push(data.altitudeMin); }
  if (data.altitudeMax !== undefined) { updates.push('altitude_max = ?'); params.push(data.altitudeMax); }
  
  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);
  
  await runExecute(`UPDATE route_corridors SET ${updates.join(', ')} WHERE id = ?`, params);
  
  return getCorridorById(id);
}

export async function deleteCorridor(id: string): Promise<boolean> {
  const result = await runExecute('DELETE FROM route_corridors WHERE id = ?', [id]);
  return result.changes > 0;
}
