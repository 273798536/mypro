import type { TrajectoryRecord } from "@/types";

const STORAGE_KEY = "medical-imaging-trajectories";

export function saveToLocalStorage(record: TrajectoryRecord) {
  const all = getAllFromLocalStorage();
  const existingIndex = all.findIndex((r) => r.id === record.id);
  if (existingIndex >= 0) {
    all[existingIndex] = { ...record, updatedAt: new Date().toISOString() };
  } else {
    all.push(record);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getAllFromLocalStorage(): TrajectoryRecord[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as TrajectoryRecord[];
  } catch {
    return [];
  }
}

export function getFromLocalStorage(id: string): TrajectoryRecord | null {
  const all = getAllFromLocalStorage();
  return all.find((r) => r.id === id) || null;
}

export function deleteFromLocalStorage(id: string) {
  const all = getAllFromLocalStorage().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function checkDuplicate(newRecord: TrajectoryRecord): {
  isDuplicate: boolean; existing?: TrajectoryRecord } {
  const all = getAllFromLocalStorage();
  const byId = all.find((r) => r.id === newRecord.id);
  if (byId) return { isDuplicate: true, existing: byId };

  const bySignature = all.find((r) => {
    if (r.name !== newRecord.name) return false;
    if (r.imageUrl !== newRecord.imageUrl) return false;
    if (r.annotations.length !== newRecord.annotations.length) return false;
    return true;
  });
  if (bySignature) return { isDuplicate: true, existing: bySignature };

  return { isDuplicate: false };
}

export function exportAsJSON(record: TrajectoryRecord): string {
  return JSON.stringify(record, null, 2);
}

export function importFromJSON(jsonStr: string): TrajectoryRecord | null {
  try {
    const parsed = JSON.parse(jsonStr);
    const hasIdentifier = !!parsed.id || !!parsed.name;
    const hasAnnotations = Array.isArray(parsed.annotations);
    if (!hasIdentifier || !hasAnnotations) {
      return null;
    }
    return parsed as TrajectoryRecord;
  } catch {
    return null;
  }
}

export function mergeRecords(
  existing: TrajectoryRecord,
  incoming: TrajectoryRecord
): TrajectoryRecord {
  const mergedAnnotations = [...existing.annotations];
  const existingIds = new Set(existing.annotations.map((a) => a.id));

  for (const ann of incoming.annotations) {
    if (existingIds.has(ann.id)) continue;
    mergedAnnotations.push(ann);
  }

  const operationKeys = new Set(
    existing.operations.map((o) => `${o.timestamp}-${o.type}-${o.description}`)
  );
  const mergedOperations = [...existing.operations];
  for (const op of incoming.operations) {
    const key = `${op.timestamp}-${op.type}-${op.description}`;
    if (!operationKeys.has(key)) {
      mergedOperations.push(op);
    }
  }

  return {
    ...existing,
    annotations: mergedAnnotations,
    operations: mergedOperations,
    updatedAt: new Date().toISOString(),
  };
}
