import { LedgerStatus } from '../types';
export declare function canTransition(from: LedgerStatus, to: LedgerStatus, role: string): boolean;
export declare function getAllowedNextStates(currentStatus: LedgerStatus, role: string): LedgerStatus[];
export declare function isSensitiveField(fieldName: string): boolean;
export declare function maskSensitiveData(value: string, fieldName: string): string;
