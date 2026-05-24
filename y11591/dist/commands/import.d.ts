import { SourceType } from '../types';
export interface ImportOptions {
    sourceType?: SourceType;
    file?: string;
    operator?: string;
}
export declare function importData(workspacePath: string, options?: ImportOptions): Promise<void>;
