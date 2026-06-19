import type {
  PermissionMatrixItem,
  PermissionDiff,
  ChangeType,
} from '@/types';

export function diffMatrix(
  oldMatrix: PermissionMatrixItem[],
  newMatrix: PermissionMatrixItem[]
): PermissionDiff[] {
  const diffs: PermissionDiff[] = [];
  const oldMap = new Map(oldMatrix.map((m) => [m.id, m]));
  const newMap = new Map(newMatrix.map((m) => [m.id, m]));
  const oldKeyMap = new Map(
    oldMatrix.map((m) => [`${m.role}|${m.resource}|${m.user || ''}`, m])
  );
  const newKeyMap = new Map(
    newMatrix.map((m) => [`${m.role}|${m.resource}|${m.user || ''}`, m])
  );

  for (const [key, newItem] of newKeyMap) {
    const oldItem = oldKeyMap.get(key);
    if (!oldItem) {
      diffs.push({
        itemId: newItem.id,
        field: 'operations',
        oldValue: null,
        newValue: newItem,
        changeType: 'add',
      });
    } else {
      if (oldItem.granted !== newItem.granted) {
        diffs.push({
          itemId: newItem.id,
          field: 'granted',
          oldValue: oldItem.granted,
          newValue: newItem.granted,
          changeType: 'modify',
        });
      }
      const oldOps = [...oldItem.operations].sort().join(',');
      const newOps = [...newItem.operations].sort().join(',');
      if (oldOps !== newOps) {
        diffs.push({
          itemId: newItem.id,
          field: 'operations',
          oldValue: oldItem.operations,
          newValue: newItem.operations,
          changeType: 'modify',
        });
      }
    }
  }

  for (const [key, oldItem] of oldKeyMap) {
    if (!newKeyMap.has(key)) {
      diffs.push({
        itemId: oldItem.id,
        field: 'operations',
        oldValue: oldItem,
        newValue: null,
        changeType: 'remove',
      });
    }
  }

  return diffs;
}

export function getItemChangeType(
  itemId: string,
  diffs: PermissionDiff[] | undefined
): ChangeType | 'none' {
  if (!diffs) return 'none';
  const itemDiffs = diffs.filter((d) => d.itemId === itemId);
  if (itemDiffs.length === 0) return 'none';
  if (itemDiffs.some((d) => d.changeType === 'add')) return 'add';
  if (itemDiffs.some((d) => d.changeType === 'remove')) return 'remove';
  return 'modify';
}

export function getDiffRowClass(changeType: ChangeType | 'none' | 'equal'): string {
  const map: Record<string, string> = {
    add: 'diff-add',
    remove: 'diff-remove',
    modify: 'diff-modify',
    none: '',
    equal: '',
  };
  return map[changeType] || '';
}

export function diffText(text1: string, text2: string): { type: ChangeType | 'equal'; content: string }[] {
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  const result: { type: ChangeType | 'equal'; content: string }[] = [];
  const maxLen = Math.max(lines1.length, lines2.length);

  for (let i = 0; i < maxLen; i++) {
    const l1 = lines1[i];
    const l2 = lines2[i];
    if (l1 === undefined && l2 !== undefined) {
      result.push({ type: 'add', content: l2 });
    } else if (l1 !== undefined && l2 === undefined) {
      result.push({ type: 'remove', content: l1 });
    } else if (l1 === l2) {
      result.push({ type: 'equal', content: l1 });
    } else {
      result.push({ type: 'modify', content: `${l1} → ${l2}` });
    }
  }
  return result;
}
