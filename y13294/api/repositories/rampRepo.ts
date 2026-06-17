import db from '../db.js';
import type { Item, RampListItem, RampStatus, RampsQuery, Source } from '../../shared/types.js';

interface RampListRow {
  id: string;
  name: string;
  bridgeName: string;
  address: string;
  lat: number;
  lng: number;
  status: RampStatus;
  isOverriding: number;
  lastChangeSource: Source | null;
  lastChangeAt: string | null;
  lastAffected: string | null;
  changeCount: number;
  sourcesCsv: string | null;
}

interface RampRow {
  id: string;
  name: string;
  bridge_name: string;
  address: string;
  lat: number;
  lng: number;
  current_status: RampStatus;
  is_overriding: number;
  created_at: string;
  updated_at: string;
}

const LIST_SQL = `
SELECT
  r.id, r.name, r.bridge_name AS bridgeName, r.address, r.lat, r.lng,
  r.current_status AS status,
  EXISTS(SELECT 1 FROM items WHERE ramp_id = r.id AND is_overriding = 1) AS isOverriding,
  (SELECT c.source FROM change_logs c WHERE c.ramp_id = r.id ORDER BY c.created_at DESC LIMIT 1) AS lastChangeSource,
  (SELECT c.created_at FROM change_logs c WHERE c.ramp_id = r.id ORDER BY c.created_at DESC LIMIT 1) AS lastChangeAt,
  (SELECT c.affected_summary FROM change_logs c WHERE c.ramp_id = r.id ORDER BY c.created_at DESC LIMIT 1) AS lastAffected,
  (SELECT COUNT(*) FROM change_logs c WHERE c.ramp_id = r.id) AS changeCount,
  (SELECT GROUP_CONCAT(DISTINCT src) FROM (
      SELECT source AS src FROM items WHERE ramp_id = r.id
      UNION
      SELECT source AS src FROM change_logs WHERE ramp_id = r.id
    )) AS sourcesCsv
FROM ramps r
`;

function mapRow(row: RampListRow): RampListItem {
  const sources = (row.sourcesCsv ? row.sourcesCsv.split(',') : [])
    .filter((s): s is Source => Boolean(s));
  return {
    id: row.id,
    name: row.name,
    bridgeName: row.bridgeName,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    sources,
    isOverriding: Boolean(row.isOverriding),
    lastChangeAt: row.lastChangeAt,
    lastChangeSource: row.lastChangeSource,
    lastAffected: row.lastAffected,
    changeCount: row.changeCount,
  };
}

export function listRamps(query: RampsQuery = {}): RampListItem[] {
  const rows = db.prepare(`${LIST_SQL} ORDER BY r.updated_at DESC`).all() as RampListRow[];
  let items = rows.map(mapRow);
  if (query.status) items = items.filter((r) => r.status === query.status);
  if (query.overriding !== undefined)
    items = items.filter((r) => r.isOverriding === query.overriding);
  if (query.source) items = items.filter((r) => r.sources.includes(query.source!));
  return items;
}

export function getRampRow(id: string): RampRow | undefined {
  return db.prepare('SELECT * FROM ramps WHERE id = ?').get(id) as RampRow | undefined;
}

export function getRampListItem(id: string): RampListItem | undefined {
  const row = db.prepare(`${LIST_SQL} WHERE r.id = ?`).get(id) as RampListRow | undefined;
  return row ? mapRow(row) : undefined;
}

export function updateRampStatus(
  id: string,
  status: RampStatus,
  overriding: boolean,
): void {
  db.prepare(
    `UPDATE ramps SET current_status = ?, is_overriding = is_overriding | ?, updated_at = ? WHERE id = ?`,
  ).run(status, overriding ? 1 : 0, new Date().toISOString(), id);
}

export function bumpRamp(id: string): void {
  db.prepare('UPDATE ramps SET updated_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    id,
  );
}

export function countByStatus(): {
  total: number;
  processed: number;
  pending: number;
  overridden: number;
} {
  const rows = db
    .prepare('SELECT current_status AS s, COUNT(*) AS c FROM ramps GROUP BY current_status')
    .all() as { s: RampStatus; c: number }[];
  const out = { total: 0, processed: 0, pending: 0, overridden: 0 };
  for (const r of rows) {
    out[r.s] = r.c;
    out.total += r.c;
  }
  return out;
}

// ---- items ----
interface ItemRow {
  id: string;
  ramp_id: string;
  title: string;
  source: Source;
  content: string | null;
  photo_url: string | null;
  is_overriding: number;
  submitted_at: string;
}

export function insertItem(item: {
  id: string;
  rampId: string;
  title: string;
  source: Source;
  content: string;
  photoUrl: string | null;
  isOverriding: boolean;
  submittedAt: string;
}): void {
  db.prepare(
    `INSERT INTO items (id, ramp_id, title, source, content, photo_url, is_overriding, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    item.id,
    item.rampId,
    item.title,
    item.source,
    item.content,
    item.photoUrl,
    item.isOverriding ? 1 : 0,
    item.submittedAt,
  );
}

export function listItems(rampId: string): Item[] {
  const rows = db
    .prepare('SELECT * FROM items WHERE ramp_id = ? ORDER BY submitted_at DESC')
    .all(rampId) as ItemRow[];
  return rows.map((r) => ({
    id: r.id,
    rampId: r.ramp_id,
    title: r.title,
    source: r.source,
    content: r.content ?? '',
    photoUrl: r.photo_url,
    isOverriding: Boolean(r.is_overriding),
    submittedAt: r.submitted_at,
  }));
}
