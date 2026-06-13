import type { DeflectionRecord, Snapshot } from '@/types';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function createSnapshot(record: DeflectionRecord, operator: string): Snapshot {
  const version = 1;
  const dataString = JSON.stringify(record);
  const dataHash = simpleHash(dataString);
  const now = new Date().toISOString();

  return {
    id: `snap-${record.id}-${Date.now()}`,
    recordId: record.id,
    imageUrl: '',
    version,
    createdAt: now,
    description: `Snapshot v${version} by ${operator} for beam ${record.beamNumber}`,
    dataHash,
  };
}

export function getNextVersion(recordId: string, snapshots: Snapshot[]): number {
  const related = snapshots.filter((s) => s.recordId === recordId);
  if (related.length === 0) return 1;
  const maxVersion = Math.max(...related.map((s) => s.version));
  return maxVersion + 1;
}
