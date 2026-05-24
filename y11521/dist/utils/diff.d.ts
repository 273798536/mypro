import { DiffResult } from '../types';
export declare function compareObjects(oldObj: Record<string, any>, newObj: Record<string, any>): DiffResult[];
export declare function formatDiff(diffs: DiffResult[]): string;
export declare function printDiff(diffs: DiffResult[]): void;
export declare function createSnapshot<T extends Record<string, any>>(data: T): T;
export declare function deepClone<T>(obj: T): T;
