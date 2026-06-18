import { SchemaSnapshot, SchemaDiff, ColumnDef, IndexDef } from '../types';
export interface SnapshotInput {
    runId: string;
    tableName: string;
    databaseName: string;
    columnDefinitions: ColumnDef[];
    indexDefinitions: IndexDef[];
    operator: string;
}
export declare function saveSchemaSnapshot(input: SnapshotInput): SchemaSnapshot;
export declare function getLatestSnapshot(databaseName: string, tableName: string, beforeRunId?: string): SchemaSnapshot | null;
export declare function getSnapshotByRun(runId: string, databaseName?: string, tableName?: string): SchemaSnapshot[];
export declare function compareSchemas(oldSnap: SchemaSnapshot, newSnap: SchemaSnapshot): SchemaDiff;
export declare function hasSignificantChanges(diff: SchemaDiff): boolean;
export declare function validateAndDiffSchema(runId: string, newSnapshot: SchemaSnapshot, operator: string): SchemaDiff | null;
