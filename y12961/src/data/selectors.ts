import type { Batch, Material, Route } from "./types";

export const KIND_LABEL: Record<string, string> = {
  backup: "备份记录",
  dict: "数据字典",
  slowlog: "慢查询日志",
};

export const KIND_COLOR: Record<string, string> = {
  backup: "#fbbf24",
  dict: "#38bdf8",
  slowlog: "#a78bfa",
};

export function materialById(batch: Batch, id: string): Material | undefined {
  return batch.materials.find((m) => m.id === id);
}

export interface Kpis {
  total: number;
  pass: number;
  warn: number;
  fail: number;
  critical: number;
  materialCoverage: number;
  materialTotal: number;
}

export function computeKpis(batch: Batch): Kpis {
  const routes = batch.routes;
  const pass = routes.filter((r) => r.status === "pass").length;
  const warn = routes.filter((r) => r.status === "warn").length;
  const fail = routes.filter((r) => r.status === "fail").length;
  const critical = routes.filter((r) => r.severity === "critical").length;
  const okMats = batch.materials.filter((m) => m.coverage === "ok").length;
  return {
    total: routes.length,
    pass,
    warn,
    fail,
    critical,
    materialCoverage: okMats,
    materialTotal: batch.materials.length,
  };
}

export function shardDistribution(batch: Batch) {
  const map = new Map<string, { db: string; routes: number; issues: number }>();
  for (const r of batch.routes) {
    const cur = map.get(r.targetDb) ?? { db: r.targetDb, routes: 0, issues: 0 };
    cur.routes += 1;
    if (r.status !== "pass") cur.issues += 1;
    map.set(r.targetDb, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.db.localeCompare(b.db));
}

export function materialStack(batch: Batch) {
  return batch.materials.map((m) => {
    const rs = batch.routes.filter((r) => r.materialId === m.id);
    return {
      name: KIND_LABEL[m.kind],
      pass: rs.filter((r) => r.status === "pass").length,
      warn: rs.filter((r) => r.status === "warn").length,
      fail: rs.filter((r) => r.status === "fail").length,
    };
  });
}

export function severityDonut(batch: Batch) {
  const rs = batch.routes;
  return [
    { name: "通过", value: rs.filter((r) => r.severity === "info").length, color: "#34d399" },
    { name: "告警", value: rs.filter((r) => r.severity === "warn").length, color: "#fbbf24" },
    { name: "阻断", value: rs.filter((r) => r.severity === "critical").length, color: "#fb7185" },
  ].filter((d) => d.value > 0);
}

export function backupChanged(batch: Batch): boolean {
  const { old: o, new: n } = batch.backupVersions;
  return o.conclusion !== n.conclusion || o.severity !== n.severity;
}

export function schemaHasDiff(batch: Batch): boolean {
  return batch.schemaVersions.after.diffs.length > 0;
}

export interface SchemaRow {
  name: string;
  before?: string;
  after?: string;
  change: "unchanged" | "added" | "modified" | "removed";
  note?: string;
  overrideId?: string;
}

export function schemaRows(batch: Batch): SchemaRow[] {
  const before = batch.schemaVersions.before.columns;
  const after = batch.schemaVersions.after.columns;
  const beforeMap = new Map(before.map((c) => [c.name, c.type]));
  const afterMap = new Map(after.map((c) => [c.name, c.type]));
  const order = [
    ...before.map((c) => c.name),
    ...after.map((c) => c.name).filter((n) => !beforeMap.has(n)),
  ];
  return order.map((name) => {
    const b = beforeMap.get(name);
    const a = afterMap.get(name);
    let change: SchemaRow["change"] = "unchanged";
    if (b && !a) change = "removed";
    else if (!b && a) change = "added";
    else if (b !== a) change = "modified";
    const diff = batch.schemaVersions.after.diffs.find((d) => d.column === name);
    return { name, before: b, after: a, change, note: diff?.note, overrideId: diff?.triggeredByOverrideId };
  });
}

export function overrideTouchedRoutes(batch: Batch, overrideId: string): Route[] {
  return batch.routes.filter(
    (r) => batch.schemaVersions.after.diffs.some((d) => d.triggeredByOverrideId === overrideId) && r.logicTable === batch.schemaVersions.after.table.split("_")[0],
  );
}
