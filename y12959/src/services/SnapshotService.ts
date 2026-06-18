import { tableSnapshots } from '../mock/data';
import type { FieldDiff, SnapshotField, TableSnapshot } from '../types';

export const SnapshotService = {
  get(id: string): TableSnapshot | undefined {
    return tableSnapshots.find((s) => s.id === id);
  },

  compare(beforeId: string, afterId: string): FieldDiff[] {
    const before = tableSnapshots.find((s) => s.id === beforeId);
    const after = tableSnapshots.find((s) => s.id === afterId);
    if (!before || !after) return [];

    const beforeMap = new Map<string, SnapshotField>();
    before.fields.forEach((f) => beforeMap.set(f.name, f));

    const afterMap = new Map<string, SnapshotField>();
    after.fields.forEach((f) => afterMap.set(f.name, f));

    const diffs: FieldDiff[] = [];
    const allNames = new Set([...beforeMap.keys(), ...afterMap.keys()]);

    allNames.forEach((name) => {
      const b = beforeMap.get(name);
      const a = afterMap.get(name);

      if (b && !a) {
        diffs.push({
          field: { ...b, changeType: 'removed' },
          before: b,
          changeType: 'removed',
        });
      } else if (!b && a) {
        diffs.push({
          field: { ...a, changeType: 'added' },
          after: a,
          changeType: 'added',
        });
      } else if (b && a) {
        const changed =
          b.dataType !== a.dataType ||
          b.nullable !== a.nullable ||
          b.defaultValue !== a.defaultValue ||
          b.comment !== a.comment;
        const changeType: SnapshotField['changeType'] = changed ? 'modified' : 'unchanged';
        diffs.push({
          field: {
            ...a,
            changeType,
            oldValue: changed ? b.dataType : undefined,
            newValue: changed ? a.dataType : undefined,
            impactNote: changed ? (a.impactNote ?? b.impactNote) : undefined,
          },
          before: b,
          after: a,
          changeType,
        });
      }
    });

    diffs.sort((x, y) => {
      const rank = (ct?: SnapshotField['changeType']): number => {
        if (ct === 'removed') return 0;
        if (ct === 'added') return 1;
        if (ct === 'modified') return 2;
        return 3;
      };
      const r = rank(x.changeType) - rank(y.changeType);
      if (r !== 0) return r;
      return (x.field.ordinalPosition ?? 0) - (y.field.ordinalPosition ?? 0);
    });

    return diffs;
  },
};
