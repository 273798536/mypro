export interface ReportOptions {
    wave?: string;
    detail?: boolean;
    export?: boolean;
}
export declare function report(workspacePath: string, options?: ReportOptions): Promise<void>;
