import { Request, Response } from 'express';
import { z } from 'zod';
import { permissionService } from '../services/PermissionService';
import type { UserRole } from '../../shared/types';

const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'bi_analyst', 'dev']),
});

const updateRolePermissionsSchema = z.object({
  permissions: z.array(z.string()),
});

export class PermissionController {
  async getRoles(req: Request, res: Response) {
    try {
      const roles = await permissionService.getAllRoles();

      const data = roles.map((role) => ({
        ...role,
        displayInfo: permissionService.getRoleDisplayInfo(role.name),
      }));

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async getUsers(req: Request, res: Response) {
    try {
      const users = await permissionService.getAllUsers();

      const data = users.map((user) => ({
        ...user,
        roleDisplay: permissionService.getRoleDisplayInfo(user.role),
      }));

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async updateUserRole(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { role } = updateUserRoleSchema.parse(req.body);
      const operatorId = req.headers['x-user-id'] as string || 'user_1';

      const user = await permissionService.updateUserRole(userId, role as UserRole, operatorId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: '用户不存在',
        });
      }

      res.json({
        success: true,
        data: {
          ...user,
          roleDisplay: permissionService.getRoleDisplayInfo(user.role),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: error.errors,
        });
      }
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async updateRolePermissions(req: Request, res: Response) {
    try {
      const { roleId } = req.params;
      const { permissions } = updateRolePermissionsSchema.parse(req.body);
      const operatorId = req.headers['x-user-id'] as string || 'user_1';

      const role = await permissionService.updateRolePermissions(roleId, permissions, operatorId);

      if (!role) {
        return res.status(404).json({
          success: false,
          error: '角色不存在',
        });
      }

      res.json({
        success: true,
        data: {
          ...role,
          displayInfo: permissionService.getRoleDisplayInfo(role.name),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: error.errors,
        });
      }
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async getPermissionList(req: Request, res: Response) {
    try {
      const permissions = permissionService.getPermissionList();

      res.json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async getAuditLog(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;

      const result = await permissionService.getAuditLog(page, pageSize);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async getCurrentUser(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string || 'user_2';

      const users = await permissionService.getAllUsers();
      const user = users.find((u) => u.id === userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: '用户不存在',
        });
      }

      const roleDisplay = permissionService.getRoleDisplayInfo(user.role);
      const allPermissions = permissionService.getPermissionList();
      const rolePermissions = await permissionService.getAllRoles();
      const userRole = rolePermissions.find((r) => r.name === user.role);

      let grantedPermissions: string[] = [];
      if (userRole?.permissions.includes('*')) {
        grantedPermissions = allPermissions.map((p) => `${p.resource}:${p.action}`);
      } else {
        grantedPermissions = userRole?.permissions || [];
      }

      res.json({
        success: true,
        data: {
          ...user,
          roleDisplay,
          permissions: allPermissions.map((p) => ({
            ...p,
            granted: grantedPermissions.includes(`${p.resource}:${p.action}`),
          })),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
}

export const permissionController = new PermissionController();
