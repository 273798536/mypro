import { UserRole } from '../types';
export declare class DataMaskingService {
    private maskEmail;
    private maskPhone;
    private maskName;
    private maskValue;
    maskExportData<T extends Record<string, any>>(data: T, role: UserRole): T;
    maskMaterialDetail<T extends Record<string, any>>(data: T, role: UserRole): T;
    canAccessField(role: UserRole, field: string): boolean;
    filterByRole<T extends Record<string, any>>(data: T, role: UserRole): Partial<T>;
}
export declare const dataMaskingService: DataMaskingService;
