import { PermissionConfig, Role } from '../types';
export declare const permissionConfig: PermissionConfig;
export declare function hasPermission(role: Role, action: string): boolean;
export declare function canViewField(role: Role, field: string): boolean;
export declare function canEditField(role: Role, field: string): boolean;
export declare function filterFieldsByRole<T extends Record<string, any>>(role: Role, data: T, mode?: 'view' | 'edit'): Partial<T>;
export declare function getVisibleFields(role: Role): string[];
export declare function getEditableFields(role: Role): string[];
export declare function maskDataByRole<T extends Record<string, any>>(role: Role, data: T): Record<string, any>;
