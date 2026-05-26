import type {
  AuditEntry,
  Coil,
  MergeStrategy,
  Rail,
  Report,
  Spreader,
  Task,
  Zone,
} from "@/types";
import { makeAuditId, nowISO } from "@/utils/storage";

export type Diff = { field: string; from: unknown; to: unknown }[];

export function diffObjects<T extends Record<string, unknown>>(
  a: T,
  b: T,
): Diff {
  const diff: Diff = [];
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const va = (a as Record<string, unknown>)[k];
    const vb = (b as Record<string, unknown>)[k];
    if (JSON.stringify(va) !== JSON.stringify(vb)) {
      diff.push({ field: k, from: va, to: vb });
    }
  }
  return diff;
}

export function makeAudit(
  source: string,
  strategy: MergeStrategy,
  operator: string,
  diff?: Diff,
): AuditEntry {
  return {
    id: makeAuditId(),
    time: nowISO(),
    source,
    strategy,
    diff,
    operator,
  };
}

function withAudit<T extends { id: string; audit: AuditEntry[] }>(
  item: T,
  audit: AuditEntry,
): T {
  return { ...item, audit: [...item.audit, audit] };
}

export function mergeCoils(
  current: Coil[],
  incoming: Coil[],
  strategy: MergeStrategy,
  source: string,
  operator: string,
): Coil[] {
  const map = new Map(current.map((c) => [c.id, c]));
  for (const inc of incoming) {
    const existing = map.get(inc.id);
    if (strategy === "ignore" && existing) continue;
    if (strategy === "append" && existing) {
      const merged = { ...existing, ...inc, audit: existing.audit };
      const d = diffObjects(existing, merged);
      map.set(inc.id, withAudit(merged, makeAudit(source, strategy, operator, d)));
      continue;
    }
    const d = existing ? diffObjects(existing, inc) : undefined;
    map.set(inc.id, withAudit(inc, makeAudit(source, strategy, operator, d)));
  }
  return Array.from(map.values());
}

export function mergeSpreaders(
  current: Spreader[],
  incoming: Spreader[],
  strategy: MergeStrategy,
  source: string,
  operator: string,
): Spreader[] {
  const map = new Map(current.map((s) => [s.id, s]));
  for (const inc of incoming) {
    const existing = map.get(inc.id);
    if (strategy === "ignore" && existing) continue;
    const d = existing ? diffObjects(existing, inc) : undefined;
    map.set(inc.id, withAudit(inc, makeAudit(source, strategy, operator, d)));
  }
  return Array.from(map.values());
}

export function mergeRails(
  current: Rail[],
  incoming: Rail[],
  strategy: MergeStrategy,
  source: string,
  operator: string,
): Rail[] {
  const map = new Map(current.map((r) => [r.id, r]));
  for (const inc of incoming) {
    const existing = map.get(inc.id);
    if (strategy === "ignore" && existing) continue;
    const d = existing ? diffObjects(existing, inc) : undefined;
    map.set(inc.id, withAudit(inc, makeAudit(source, strategy, operator, d)));
  }
  return Array.from(map.values());
}

export function mergeZones(
  current: Zone[],
  incoming: Zone[],
  strategy: MergeStrategy,
  source: string,
  operator: string,
): Zone[] {
  const map = new Map(current.map((z) => [z.id, z]));
  for (const inc of incoming) {
    const existing = map.get(inc.id);
    if (strategy === "ignore" && existing) continue;
    const d = existing ? diffObjects(existing, inc) : undefined;
    map.set(inc.id, withAudit(inc, makeAudit(source, strategy, operator, d)));
  }
  return Array.from(map.values());
}

export function mergeTasks(
  current: Task[],
  incoming: Task[],
  strategy: MergeStrategy,
  source: string,
  operator: string,
): Task[] {
  const map = new Map(current.map((t) => [t.id, t]));
  for (const inc of incoming) {
    const existing = map.get(inc.id);
    if (strategy === "ignore" && existing) continue;
    const d = existing ? diffObjects(existing, inc) : undefined;
    map.set(inc.id, withAudit(inc, makeAudit(source, strategy, operator, d)));
  }
  return Array.from(map.values());
}

export function mergeReports(
  current: Report[],
  incoming: Report[],
  strategy: MergeStrategy,
): Report[] {
  const map = new Map(current.map((r) => [r.id, r]));
  for (const inc of incoming) {
    const existing = map.get(inc.id);
    if (strategy === "ignore" && existing) continue;
    map.set(inc.id, inc);
  }
  return Array.from(map.values());
}
