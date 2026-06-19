import type { TableSnapshot } from '@/types';
import { storage, generateId } from '@/utils/storage';
import { getMockSnapshots } from '@/mock/snapshots';

const STORAGE_KEY = 'snapshots';

const getAllSnapshots = (): TableSnapshot[] => {
  return storage.get<TableSnapshot[]>(STORAGE_KEY, []);
};

const saveAllSnapshots = (snapshots: TableSnapshot[]): void => {
  storage.set(STORAGE_KEY, snapshots);
};

export const snapshotService = {
  listByGapId(gapId: string): TableSnapshot[] {
    const snapshots = getAllSnapshots();
    return snapshots
      .filter((s) => s.gapId === gapId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  get(id: string): TableSnapshot | null {
    const snapshots = getAllSnapshots();
    return snapshots.find((s) => s.id === id) || null;
  },

  listAll(): TableSnapshot[] {
    const snapshots = getAllSnapshots();
    return snapshots.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  add(snapshot: Omit<TableSnapshot, 'id' | 'createdAt'>): TableSnapshot {
    const snapshots = getAllSnapshots();
    const newSnapshot: TableSnapshot = {
      ...snapshot,
      id: 'snap_' + generateId(),
      createdAt: new Date().toISOString(),
    };

    snapshots.push(newSnapshot);
    saveAllSnapshots(snapshots);

    return newSnapshot;
  },

  compare(snapshotId1: string, snapshotId2: string) {
    const s1 = this.get(snapshotId1);
    const s2 = this.get(snapshotId2);

    if (!s1 || !s2) return null;

    const addedColumns = s2.schema.columns.filter(
      (c2) => !s1.schema.columns.some((c1) => c1.name === c2.name)
    );
    const removedColumns = s1.schema.columns.filter(
      (c1) => !s2.schema.columns.some((c2) => c2.name === c1.name)
    );
    const modifiedColumns: Array<{
      name: string;
      changes: string[];
    }> = [];

    for (const c1 of s1.schema.columns) {
      const c2 = s2.schema.columns.find((c) => c.name === c1.name);
      if (!c2) continue;

      const changes: string[] = [];
      if (c1.type !== c2.type) changes.push(`类型: ${c1.type} → ${c2.type}`);
      if (c1.nullable !== c2.nullable) changes.push(`可空: ${c1.nullable} → ${c2.nullable}`);
      if (c1.default !== c2.default) changes.push(`默认值: ${c1.default || '无'} → ${c2.default || '无'}`);
      if (c1.comment !== c2.comment) changes.push(`注释变更`);

      if (changes.length > 0) {
        modifiedColumns.push({ name: c1.name, changes });
      }
    }

    const addedIndexes = s2.schema.indexes.filter(
      (i2) => !s1.schema.indexes.some((i1) => i1.name === i2.name)
    );
    const removedIndexes = s1.schema.indexes.filter(
      (i1) => !s2.schema.indexes.some((i2) => i2.name === i1.name)
    );

    return {
      snapshot1: s1,
      snapshot2: s2,
      addedColumns,
      removedColumns,
      modifiedColumns,
      addedIndexes,
      removedIndexes,
    };
  },

  resetToMock(): void {
    saveAllSnapshots(getMockSnapshots());
  },
};
