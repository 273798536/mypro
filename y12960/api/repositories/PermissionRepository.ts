import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import type { Role } from '../../shared/types';

interface DbRole {
  id: string;
  name: string;
  description: string;
  permissions: string;
  created_at: string;
}

export class PermissionRepository {
  private mapToRole(dbRecord: DbRole): Role {
    return {
      id: dbRecord.id,
      name: dbRecord.name,
      description: dbRecord.description,
      permissions: JSON.parse(dbRecord.permissions),
      createdAt: dbRecord.created_at,
    };
  }

  async getAllRoles(): Promise<Role[]> {
    const records = db.prepare('SELECT * FROM role ORDER BY created_at').all() as DbRole[];
    return records.map((r) => this.mapToRole(r));
  }

  async getRoleById(id: string): Promise<Role | null> {
    const record = db.prepare('SELECT * FROM role WHERE id = ?').get(id) as DbRole | undefined;
    return record ? this.mapToRole(record) : null;
  }

  async getPermissionsByUserRole(role: string): Promise<string[]> {
    const record = db.prepare('SELECT permissions FROM role WHERE name = ?').get(role) as
      | { permissions: string }
      | undefined;
    return record ? JSON.parse(record.permissions) : [];
  }

  async hasPermission(userRole: string, resource: string, action: string): Promise<boolean> {
    const permissions = await this.getPermissionsByUserRole(userRole);
    if (permissions.includes('*')) return true;
    return permissions.includes(`${resource}:${action}`);
  }

  async updateRolePermissions(roleId: string, permissions: string[]): Promise<Role | null> {
    db.prepare('UPDATE role SET permissions = ? WHERE id = ?').run(
      JSON.stringify(permissions),
      roleId
    );
    return this.getRoleById(roleId);
  }
}

export const permissionRepository = new PermissionRepository();
