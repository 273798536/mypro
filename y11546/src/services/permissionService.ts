import { UserRole, PermissionAction, ROLE_PERMISSIONS } from '../models/types';
import { UserDAO } from '../db/securityDAO';

export class PermissionService {
  private userDAO: UserDAO;

  constructor(workDir?: string) {
    this.userDAO = new UserDAO(workDir);
  }

  hasPermission(role: UserRole, action: PermissionAction): boolean {
    const permission = ROLE_PERMISSIONS.find(p => p.role === role && p.action === action);
    return permission?.allowed || false;
  }

  async checkUserPermission(username: string, action: PermissionAction): Promise<{ allowed: boolean; reason?: string; user?: any }> {
    const user = await this.userDAO.findByUsername(username);

    if (!user) {
      return { allowed: false, reason: `用户 ${username} 不存在` };
    }

    if (!user.is_active) {
      return { allowed: false, reason: `用户 ${username} 已被禁用` };
    }

    const allowed = this.hasPermission(user.role, action);
    if (!allowed) {
      return {
        allowed: false,
        reason: `角色 ${user.role} 没有 ${action} 权限`,
        user
      };
    }

    return { allowed: true, user };
  }

  getRolePermissions(role: UserRole): PermissionAction[] {
    return ROLE_PERMISSIONS
      .filter(p => p.role === role && p.allowed)
      .map(p => p.action);
  }
}

export const permissionService = new PermissionService();
