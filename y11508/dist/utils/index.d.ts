export declare function formatDate(date: Date | string | null, format?: string): string;
export declare function formatCurrency(amount: number): string;
export declare function generateNo(prefix: string, sequence: number): string;
export declare function delay(ms: number): Promise<void>;
export declare function safeJsonParse(str: string, defaultValue?: any): any;
export declare function chunkArray<T>(arr: T[], size: number): T[][];
