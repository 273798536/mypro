import { UserRole, MaterialRecord } from '../types';
export declare function canPerformAction(role: UserRole, action: string): boolean;
export declare function canViewField(role: UserRole, field: string): boolean;
export declare function canEditField(role: UserRole, field: string): boolean;
export declare function filterRecordByRole(record: MaterialRecord, role: UserRole): Partial<MaterialRecord>;
export declare function filterRecordsByRole(records: MaterialRecord[], role: UserRole): Partial<MaterialRecord>[];
export declare function getRoleName(role: UserRole): string;
export declare function assertPermission(role: UserRole, action: string): void;
