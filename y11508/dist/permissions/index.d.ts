import { Role, RecordStatus } from '../types';
export interface FieldPermission {
    visible: boolean;
    editable: boolean;
}
export interface ActionPermission {
    allowed: boolean;
}
export interface EntityPermissions {
    fields: Record<string, FieldPermission>;
    actions: Record<string, ActionPermission>;
}
export declare const rolePermissions: Record<Role, {
    inspectionRecords: EntityPermissions;
    calibrationCertificates: EntityPermissions;
    maintenanceQuotes: EntityPermissions;
    secondaryConfirms: EntityPermissions;
    devices: EntityPermissions;
    importFailures: EntityPermissions;
    statusLogs: EntityPermissions;
}>;
export declare const statusTransitions: Record<RecordStatus, RecordStatus[]>;
export declare function canTransitionStatus(from: RecordStatus, to: RecordStatus, role: Role): boolean;
export declare function filterFieldsByRole<T extends Record<string, any>>(data: T, role: Role, entityType: keyof typeof rolePermissions[Role.DATA_ENTRY]): Partial<T>;
