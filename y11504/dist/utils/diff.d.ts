export interface FieldDiff {
    field: string;
    before: any;
    after: any;
}
export declare const compareObjects: (before: Record<string, any>, after: Record<string, any>, prefix?: string) => FieldDiff[];
export declare const generateTextDiff: (before: string, after: string) => string;
export declare const hasChanges: (before: Record<string, any>, after: Record<string, any>) => boolean;
export declare const extractSensitiveFields: (data: Record<string, any>, sensitiveFields: string[]) => Record<string, any>;
