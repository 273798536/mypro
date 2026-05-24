import { PermissionConfig } from '../types';
export declare const PERMISSIONS: PermissionConfig;
export declare function checkPermission(role: string, action: string): boolean;
export declare function filterFieldsByRole(role: string, data: Record<string, any>): Record<string, any>;
