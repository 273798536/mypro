import { UserRole, AuditAction, PermissionConfig } from '../models/types';
export declare const rolePermissions: Record<UserRole, PermissionConfig>;
export declare const hrbpFocusFields: string[];
export declare function filterFieldsByRole<T extends Record<string, any>>(data: T, role: UserRole): Partial<T>;
export declare function canPerformAction(role: UserRole, action: AuditAction): boolean;
