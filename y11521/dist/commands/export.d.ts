export declare function handleExport(options: {
    format?: 'csv' | 'json';
    output?: string;
    type?: string;
    includeDirty?: boolean;
}): Promise<void>;
export declare function handleExportDirty(filePath: string): Promise<void>;
