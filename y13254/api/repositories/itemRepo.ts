import crypto from 'crypto';
import { db } from '../lib/db';
import type { NoticeItem, ItemStatus, Judgement } from '../../shared/types';

function safeJsonParse<T = any>(val: any, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return JSON.parse(JSON.stringify(parsed ?? fallback));
  } catch {
    return fallback;
  }
}

function rowToItem(row: any): NoticeItem {
  return {
    id: row.id,
    locationId: row.location_id,
    status: row.status as ItemStatus,
    currentRemark: row.current_remark ?? null,
    remarkHistory: safeJsonParse(row.remark_history, []),
    autoJudgement: safeJsonParse(row.auto_judgement, null),
    manualJudgement: safeJsonParse(row.manual_judgement, null),
    apiResponse: safeJsonParse(row.api_response, undefined),
    materialIds: safeJsonParse(row.material_ids, []),
    isCommunityVerified: (row.is_community_verified as 0 | 1) ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export interface CreateItemInput {
  locationId: string;
  status?: ItemStatus;
  currentRemark?: string | null;
  autoJudgement?: Judgement | null;
  manualJudgement?: Judgement | null;
  apiResponse?: any;
  materialIds?: string[];
}

export function createItem(input: CreateItemInput): NoticeItem {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const status = input.status ?? 'pending_review';
  const stmt = db.prepare(`
    INSERT INTO notice_item (
      id, location_id, status, current_remark, remark_history,
      auto_judgement, manual_judgement, api_response, material_ids,
      is_community_verified, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    input.locationId,
    status,
    input.currentRemark ?? null,
    JSON.stringify([]),
    input.autoJudgement
      ? JSON.stringify(JSON.parse(JSON.stringify(input.autoJudgement)))
      : null,
    input.manualJudgement
      ? JSON.stringify(JSON.parse(JSON.stringify(input.manualJudgement)))
      : null,
    input.apiResponse !== undefined
      ? JSON.stringify(JSON.parse(JSON.stringify(input.apiResponse)))
      : null,
    JSON.stringify(JSON.parse(JSON.stringify(input.materialIds ?? []))),
    status === 'community_verified' ? 1 : 0,
    now,
    now
  );
  return getItemById(id)!;
}

export function listItems(): NoticeItem[] {
  const rows = db.prepare('SELECT * FROM notice_item ORDER BY created_at DESC').all();
  return rows.map(rowToItem);
}

export function getItemById(id: string): NoticeItem | null {
  const row = db.prepare('SELECT * FROM notice_item WHERE id = ?').get(id);
  if (!row) return null;
  return rowToItem(row);
}

export function getItemByLocationId(locationId: string): NoticeItem | null {
  const row = db.prepare('SELECT * FROM notice_item WHERE location_id = ? LIMIT 1').get(locationId);
  if (!row) return null;
  return rowToItem(row);
}

export function updateItemStatus(id: string, status: ItemStatus): NoticeItem | null {
  const now = new Date().toISOString();
  const result = db.prepare(`
    UPDATE notice_item SET status = ?, updated_at = ? WHERE id = ?
  `).run(status, now, id);
  if (result.changes === 0) return null;
  return getItemById(id);
}

export function updateItemRemark(
  id: string,
  remark: string,
  changedBy?: string
): NoticeItem | null {
  const item = getItemById(id);
  if (!item) return null;

  const now = new Date().toISOString();
  const historyEntry = {
    remark: item.currentRemark ?? '',
    changedAt: now,
    changedBy: changedBy ?? 'system'
  };
  const newHistory = [historyEntry, ...item.remarkHistory];

  const result = db.prepare(`
    UPDATE notice_item SET current_remark = ?, remark_history = ?, updated_at = ? WHERE id = ?
  `).run(
    remark,
    JSON.stringify(JSON.parse(JSON.stringify(newHistory))),
    now,
    id
  );
  if (result.changes === 0) return null;
  return getItemById(id);
}

export function updateItemApiResponse(id: string, apiResponse: any): NoticeItem | null {
  const now = new Date().toISOString();
  const result = db.prepare(`
    UPDATE notice_item SET api_response = ?, updated_at = ? WHERE id = ?
  `).run(
    JSON.stringify(JSON.parse(JSON.stringify(apiResponse))),
    now,
    id
  );
  if (result.changes === 0) return null;
  return getItemById(id);
}

export function linkMaterials(id: string, materialIds: string[]): NoticeItem | null {
  const now = new Date().toISOString();
  const result = db.prepare(`
    UPDATE notice_item SET material_ids = ?, updated_at = ? WHERE id = ?
  `).run(
    JSON.stringify(JSON.parse(JSON.stringify(materialIds))),
    now,
    id
  );
  if (result.changes === 0) return null;
  return getItemById(id);
}

export function markCommunityVerified(id: string): NoticeItem | null {
  const now = new Date().toISOString();
  const result = db.prepare(`
    UPDATE notice_item SET status = 'community_verified', is_community_verified = 1, updated_at = ? WHERE id = ?
  `).run(now, id);
  if (result.changes === 0) return null;
  return getItemById(id);
}
