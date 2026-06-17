export type MaterialKind = "backup" | "dict" | "slowlog";
export type Coverage = "ok" | "partial" | "missing";
export type RouteStatus = "pass" | "warn" | "fail";
export type Severity = "info" | "warn" | "critical";
export type OverrideStatus = "approved" | "pending" | "rejected";
export type DiffType = "added" | "modified" | "removed";

export interface Material {
  id: string;
  kind: MaterialKind;
  name: string;
  source: string;
  caliber: string;
  rows: number;
  coverage: Coverage;
  note: string;
}

export interface Route {
  id: string;
  logicTable: string;
  shardKey: string;
  rule: string;
  targetDb: string;
  targetTable: string;
  status: RouteStatus;
  severity: Severity;
  materialId: string;
  issue: string;
  evidenceLine?: string;
}

export interface SchemaColumnDiff {
  column: string;
  type: DiffType;
  before?: string;
  after?: string;
  note: string;
  triggeredByOverrideId?: string;
}

export interface SchemaColumn {
  name: string;
  type: string;
}

export interface SchemaVersion {
  version: string;
  capturedAt: string;
  table: string;
  columns: SchemaColumn[];
  diffs: SchemaColumnDiff[];
}

export interface PermissionOverride {
  id: string;
  applicant: string;
  approver: string;
  requestedAt: string;
  decidedAt: string;
  why: string;
  change: string;
  scope: string;
  status: OverrideStatus;
}

export interface FkChain {
  id: string;
  from: string;
  to: string;
  fromDb: string;
  toDb: string;
  broken: boolean;
  stuckMaterialId: string;
  evidenceLine: string;
  detail: string;
}

export interface BackupVersion {
  id: string;
  label: "old" | "new";
  conclusion: string;
  severity: Severity;
  changedAt: string;
  changedBy: string;
  rationale: string;
  impact: string[];
}

export interface BadDataSample {
  rowId: string;
  table: string;
  field: string;
  value: string;
  expected: string;
  actual: string;
  reason: string;
  looksLike: string;
}

export interface Batch {
  id: string;
  label: string;
  generatedAt: string;
  generatedBy: string;
  cluster: string;
  materials: Material[];
  routes: Route[];
  schemaVersions: { before: SchemaVersion; after: SchemaVersion };
  overrides: PermissionOverride[];
  fkChains: FkChain[];
  backupVersions: { old: BackupVersion; new: BackupVersion };
  badData?: BadDataSample;
}
