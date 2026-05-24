import { DiffResult, DiffType } from '../models/types';

export class DiffService {
  compareObjects<T extends Record<string, any>>(oldObj: T, newObj: T): Array<{ field: string; old_value: any; new_value: any }> {
    const changes: Array<{ field: string; old_value: any; new_value: any }> = [];
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    const ignoreFields = ['id', 'created_at', 'updated_at', 'import_time', 'source_batch_id'];

    for (const key of allKeys) {
      if (ignoreFields.includes(key)) continue;
      const oldVal = oldObj[key];
      const newVal = newObj[key];
      if (oldVal !== newVal) {
        changes.push({
          field: key,
          old_value: oldVal,
          new_value: newVal,
        });
      }
    }
    return changes;
  }

  compareDatasets<T extends { material_code: string }>(
    oldData: T[],
    newData: T[]
  ): DiffResult<T>[] {
    const results: DiffResult<T>[] = [];
    const oldMap = new Map(oldData.map((item) => [item.material_code, item]));
    const newMap = new Map(newData.map((item) => [item.material_code, item]));

    const allCodes = new Set([...oldMap.keys(), ...newMap.keys()]);

    for (const code of allCodes) {
      const oldItem = oldMap.get(code);
      const newItem = newMap.get(code);

      if (oldItem && newItem) {
        const changes = this.compareObjects(oldItem, newItem);
        if (changes.length > 0) {
          results.push({
            type: 'modified',
            material_code: code,
            old_data: oldItem,
            new_data: newItem,
            changes,
          });
        } else {
          results.push({
            type: 'unchanged',
            material_code: code,
            old_data: oldItem,
            new_data: newItem,
          });
        }
      } else if (newItem && !oldItem) {
        results.push({
          type: 'added',
          material_code: code,
          new_data: newItem,
        });
      } else if (oldItem && !newItem) {
        results.push({
          type: 'removed',
          material_code: code,
          old_data: oldItem,
        });
      }
    }

    return results;
  }

  formatDiffSummary<T>(diffs: DiffResult<T>[]): {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  } {
    return {
      added: diffs.filter((d) => d.type === 'added').length,
      removed: diffs.filter((d) => d.type === 'removed').length,
      modified: diffs.filter((d) => d.type === 'modified').length,
      unchanged: diffs.filter((d) => d.type === 'unchanged').length,
    };
  }
}

export const diffService = new DiffService();
