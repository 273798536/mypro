import { DataDiff } from '../types';
export declare function calculateDiff(oldObj: Record<string, unknown> | null, newObj: Record<string, unknown> | null): DataDiff[];
export declare function formatDiff(diffs: DataDiff[]): string;
export declare function objectDifference(object: Record<string, unknown>, base: Record<string, unknown>): Record<string, unknown>;
