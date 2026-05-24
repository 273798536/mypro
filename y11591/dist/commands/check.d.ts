export interface CheckOptions {
    wave?: string;
    export?: boolean;
}
export declare function check(workspacePath: string, options?: CheckOptions): Promise<void>;
