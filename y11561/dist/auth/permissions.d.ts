import { UserRole } from '../types';
export declare const ROLE_NAMES: Record<UserRole, string>;
export declare const ROLE_HIERARCHY: Record<UserRole, UserRole[]>;
export interface FieldPermission {
    visible: boolean;
    editable: boolean;
}
export interface ModulePermissions {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    approve: boolean;
    export: boolean;
}
export declare const getModulePermissions: (role: UserRole) => Record<string, ModulePermissions>;
export declare const getCheckinFieldPermissions: (role: UserRole) => Record<string, FieldPermission>;
export declare const getDirtyRecordFieldPermissions: (role: UserRole) => Record<string, FieldPermission>;
export declare const canPerformAction: (role: UserRole, action: string) => boolean;
export declare const hasRole: (userRole: UserRole, requiredRole: UserRole) => boolean;
