export interface HistoryOptions {
    wave?: string;
    factKey?: string;
    limit?: number;
    type?: 'import' | 'fix' | 'all';
}
export declare function history(workspacePath: string, options?: HistoryOptions): Promise<void>;
