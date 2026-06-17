import db from '../db.js';
import { initDb, isEmpty } from '../db.js';
import { countByStatus } from '../repositories/rampRepo.js';
import { latestChangeLog } from '../repositories/auditRepo.js';
import { seedIfEmpty } from '../seed.js';
import type { ListRunResult, RampStatus } from '../../shared/types.js';

function now(): string {
  return new Date().toISOString();
}

interface RampStateRow {
  id: string;
  current_status: RampStatus;
  is_overriding: number;
}

function hasOldPlanOverride(rampId: string): boolean {
  const row = db
    .prepare(
      `SELECT 1 AS hit FROM (
        SELECT 1 FROM items WHERE ramp_id = ? AND (is_overriding = 1 OR source = 'old_plan_override')
        UNION
        SELECT 1 FROM change_logs WHERE ramp_id = ? AND source = 'old_plan_override'
      ) LIMIT 1`,
    )
    .get(rampId, rampId) as { hit: number } | undefined;
  return Boolean(row);
}

function reconcile(): number {
  const ramps = db
    .prepare('SELECT id, current_status, is_overriding FROM ramps')
    .all() as RampStateRow[];
  let reconciled = 0;
  const update = db.prepare(
    'UPDATE ramps SET current_status = ?, is_overriding = ?, updated_at = ? WHERE id = ?',
  );
  for (const r of ramps) {
    const latest = latestChangeLog(r.id);
    const newStatus: RampStatus = latest ? latest.new_status : 'pending';
    const newOverriding = hasOldPlanOverride(r.id) ? 1 : 0;
    if (r.current_status !== newStatus || r.is_overriding !== newOverriding) {
      update.run(newStatus, newOverriding, now(), r.id);
      reconciled++;
    }
  }
  return reconciled;
}

export function generate(): ListRunResult {
  initDb();
  seedIfEmpty();
  reconcile();
  const counts = countByStatus();
  return {
    ok: true,
    message: '公示清单已生成，当前状态已按改判记录对齐',
    runType: 'generate',
    ...counts,
    reconciled: counts.total,
    runAt: now(),
  };
}

export function rerun(): ListRunResult {
  initDb();
  const reconciled = reconcile();
  const counts = countByStatus();
  return {
    ok: true,
    message: `重跑完成，已按改判记录重新评估，对齐 ${reconciled} 处状态`,
    runType: 'rerun',
    ...counts,
    reconciled,
    runAt: now(),
  };
}
