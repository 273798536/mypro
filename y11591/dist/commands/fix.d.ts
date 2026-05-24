import { FixType } from '../types';
export interface FixOptions {
    factKey?: string;
    field?: string;
    value?: string;
    type?: FixType;
    reason?: string;
    operator?: string;
    wave?: string;
    split?: boolean;
    list?: boolean;
}
export declare function fix(workspacePath: string, options?: FixOptions): Promise<void>;
