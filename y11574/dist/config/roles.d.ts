import { UserRole, RolePermissions } from '../types';
export declare const rolePermissions: Record<UserRole, RolePermissions>;
export declare const getRolePermissions: (role: UserRole) => RolePermissions;
export declare const hasPermission: (role: UserRole, action: string) => boolean;
export declare const canViewField: (role: UserRole, field: string) => boolean;
