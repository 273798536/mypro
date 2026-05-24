export interface InitOptions {
    force?: boolean;
}
export declare function init(targetPath: string, options?: InitOptions): Promise<void>;
