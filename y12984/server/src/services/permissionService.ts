import { db } from '../db';
import { Permission } from '../types';
import { updateMigrationStatus } from './recordService';
import { getRecord } from './recordService';

export interface CreatePermissionInput {
  record_id: number;
  permission_name: string;
  grantee: string;
  granted_by: string;
}

export function createPermission(input: CreatePermissionInput): number {
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT INTO permissions (record_id, permission_name, grantee, granted_by, granted_at, status)
     VALUES (?, ?, ?, ?, ?, 'active')`
  );
  const result = stmt.run(
    input.record_id,
    input.permission_name,
    input.grantee,
    input.granted_by,
    now
  );

  checkAndUpdateMigrationStatus(input.record_id);

  return result.lastInsertRowid as number;
}

export function getPermissionsByRecord(recordId: number): Permission[] {
  return db.prepare('SELECT * FROM permissions WHERE record_id = ? ORDER BY granted_at DESC').all(recordId) as Permission[];
}

export function deletePermission(id: number): void {
  const perm = db.prepare('SELECT * FROM permissions WHERE id = ?').get(id) as Permission | undefined;
  db.prepare('DELETE FROM permissions WHERE id = ?').run(id);
  if (perm) {
    checkAndUpdateMigrationStatus(perm.record_id);
  }
}

function checkAndUpdateMigrationStatus(recordId: number): void {
  const record = getRecord(recordId);
  if (!record) return;

  const permissionMissing = record.anomalies.some(
    (a) => a.anomaly_type === 'permission_missing' && a.status !== 'resolved'
  );
  const hasPermissions = record.permissions.length > 0;

  if (!permissionMissing && hasPermissions && record.migration_status === 'not_started') {
    updateMigrationStatus(recordId, 'in_progress');
  }
}
