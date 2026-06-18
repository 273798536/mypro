import { permissionRepository } from '../repositories/PermissionRepository';
import { userRepository } from '../repositories/UserRepository';
import { auditLogRepository } from '../repositories/AuditLogRepository';
import type { UserRole, User } from '../../shared/types';

export class PermissionService {
  async getAllRoles() {
    return permissionRepository.getAllRoles();
  }

  async getAllUsers(): Promise<User[]> {
    return userRepository.findAll();
  }

  async updateUserRole(userId: string, role: UserRole, operatorId: string): Promise<User | null> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    const updated = await userRepository.updateRole(userId, role);

    await auditLogRepository.create({
      userId: operatorId,
      action: 'UPDATE_USER_ROLE',
      resource: 'user',
      details: {
        targetUserId: userId,
        targetUserName: user.displayName,
        oldRole: user.role,
        newRole: role,
      },
    });

    return updated;
  }

  async updateRolePermissions(roleId: string, permissions: string[], operatorId: string) {
    const role = await permissionRepository.getRoleById(roleId);
    if (!role) {
      throw new Error('角色不存在');
    }

    const updated = await permissionRepository.updateRolePermissions(roleId, permissions);

    await auditLogRepository.create({
      userId: operatorId,
      action: 'UPDATE_ROLE_PERMISSIONS',
      resource: 'role',
      details: {
        roleId,
        roleName: role.name,
        oldPermissions: role.permissions,
        newPermissions: permissions,
      },
    });

    return updated;
  }

  async checkPermission(userRole: string, resource: string, action: string): Promise<boolean> {
    return permissionRepository.hasPermission(userRole, resource, action);
  }

  async getAuditLog(page: number = 1, pageSize: number = 50) {
    return auditLogRepository.findAll(page, pageSize);
  }

  getRoleDisplayInfo(role: string) {
    const roleInfo: Record<string, { name: string; color: string; description: string }> = {
      admin: {
        name: '管理员',
        color: '#EF4444',
        description: '拥有系统所有权限',
      },
      bi_analyst: {
        name: 'BI分析师',
        color: '#3B82F6',
        description: '可导入、处理变更记录，导出报告',
      },
      dev: {
        name: '研发团队',
        color: '#10B981',
        description: '可查看变更记录，筛选不可用记录',
      },
    };
    return roleInfo[role] || { name: role, color: '#6B7280', description: '' };
  }

  getPermissionList() {
    return [
      { resource: 'change', action: 'view', name: '查看变更记录', description: '查看变更记录列表和详情' },
      { resource: 'change', action: 'import', name: '导入变更记录', description: '从Excel/CSV导入变更记录' },
      { resource: 'change', action: 'edit', name: '编辑变更记录', description: '修改状态、处理意见' },
      { resource: 'change', action: 'export', name: '导出变更记录', description: '导出变更记录为Excel/PDF' },
      { resource: 'schema', action: 'view', name: '查看Schema版本', description: '查看Schema版本历史' },
      { resource: 'schema', action: 'compare', name: 'Schema对比', description: '对比两个Schema版本的差异' },
      { resource: 'schema', action: 'export', name: '导出对比报告', description: '导出Schema对比报告' },
      { resource: 'permission', action: 'manage', name: '权限管理', description: '管理用户角色和权限' },
    ];
  }
}

export const permissionService = new PermissionService();
