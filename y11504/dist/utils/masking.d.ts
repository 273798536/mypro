import { SensitiveFieldLevel } from '../types/enums';
export declare const SENSITIVE_FIELDS: Record<string, SensitiveFieldLevel>;
export declare const maskPhone: (phone: string) => string;
export declare const maskName: (name: string) => string;
export declare const maskAddress: (address: string) => string;
export declare const maskString: (str: string, visibleStart?: number, visibleEnd?: number) => string;
export declare const applyMasking: (data: Record<string, any>, level: SensitiveFieldLevel) => Record<string, any>;
