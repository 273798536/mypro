import { SnapshotInput } from './schemaService';
import { RunContext } from '../types';
export interface ImportRow {
    database_name: string;
    table_name: string;
    index_name: string;
    index_columns: string;
    covered_columns: string;
    coverage_rate: string | number;
    execution_count?: string | number;
    avg_latency_ms?: string | number;
    is_invalid?: string | boolean;
    invalid_reason?: string;
    source_system: string;
    lock_wait_seconds?: string | number;
}
export interface ImportOptions {
    filePath: string;
    operator: string;
    source: string;
    description?: string;
    parentRunId?: string;
    schemaSnapshots?: Omit<SnapshotInput, 'runId' | 'operator'>[];
    lockWaitThreshold?: number;
}
export interface ImportResult {
    run: RunContext & {
        status: string;
    };
    suggestionsCreated: number;
    anomaliesCreated: number;
    schemaSnapshotsSaved: number;
    schemaDiffsFound: number;
    warnings: string[];
    errors: string[];
}
export declare function importIndexData(options: ImportOptions): ImportResult;
export declare function generateSampleCsv(outputPath: string): void;
export declare function generateSampleSchemaSnapshots(): Omit<SnapshotInput, 'runId' | 'operator'>[];
