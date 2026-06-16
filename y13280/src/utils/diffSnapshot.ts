import type { NoisePointGroup, NameVariant } from "@/types";

export interface GroupSnapshot {
  canonicalName: string;
  status: string;
  variantTexts: string[];
}

export function createGroupSnapshot(
  group: NoisePointGroup,
  variants: NameVariant[]
): string {
  const snapshot: GroupSnapshot = {
    canonicalName: group.canonicalName,
    status: group.status,
    variantTexts: variants.map((v) => v.variantText).sort(),
  };
  return JSON.stringify(snapshot, null, 0);
}

export interface DiffResult {
  removed: string[];
  added: string[];
  statusChanged: { from: string; to: string } | null;
  nameChanged: { from: string; to: string } | null;
}

export function diffSnapshots(before: string, after: string): DiffResult {
  const b: GroupSnapshot = JSON.parse(before);
  const a: GroupSnapshot = JSON.parse(after);
  const bSet = new Set(b.variantTexts);
  const aSet = new Set(a.variantTexts);
  return {
    removed: b.variantTexts.filter((t) => !aSet.has(t)),
    added: a.variantTexts.filter((t) => !bSet.has(t)),
    statusChanged: b.status !== a.status ? { from: b.status, to: a.status } : null,
    nameChanged:
      b.canonicalName !== a.canonicalName
        ? { from: b.canonicalName, to: a.canonicalName }
        : null,
  };
}
