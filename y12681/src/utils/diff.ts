import type { DiffResult } from '@/types';

export function deepDiff(oldObj: unknown, newObj: unknown, prefix = ''): DiffResult {
  const diffs: DiffResult = [];

  if (oldObj === newObj) return diffs;

  if (Array.isArray(oldObj) && Array.isArray(newObj)) {
    const maxLen = Math.max(oldObj.length, newObj.length);
    for (let i = 0; i < maxLen; i++) {
      const path = prefix ? `${prefix}[${i}]` : `[${i}]`;
      if (i >= oldObj.length) {
        diffs.push({ path, oldValue: undefined, newValue: newObj[i] });
      } else if (i >= newObj.length) {
        diffs.push({ path, oldValue: oldObj[i], newValue: undefined });
      } else if (typeof oldObj[i] === 'object' && typeof newObj[i] === 'object' && oldObj[i] !== null && newObj[i] !== null) {
        diffs.push(...deepDiff(oldObj[i], newObj[i], path));
      } else if (oldObj[i] !== newObj[i]) {
        diffs.push({ path, oldValue: oldObj[i], newValue: newObj[i] });
      }
    }
    return diffs;
  }

  if (
    typeof oldObj === 'object' &&
    typeof newObj === 'object' &&
    oldObj !== null &&
    newObj !== null &&
    !Array.isArray(oldObj) &&
    !Array.isArray(newObj)
  ) {
    const oldRecord = oldObj as Record<string, unknown>;
    const newRecord = newObj as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]);

    for (const key of allKeys) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (!(key in oldRecord)) {
        diffs.push({ path, oldValue: undefined, newValue: newRecord[key] });
      } else if (!(key in newRecord)) {
        diffs.push({ path, oldValue: oldRecord[key], newValue: undefined });
      } else if (
        typeof oldRecord[key] === 'object' &&
        typeof newRecord[key] === 'object' &&
        oldRecord[key] !== null &&
        newRecord[key] !== null
      ) {
        diffs.push(...deepDiff(oldRecord[key], newRecord[key], path));
      } else if (oldRecord[key] !== newRecord[key]) {
        diffs.push({ path, oldValue: oldRecord[key], newValue: newRecord[key] });
      }
    }
    return diffs;
  }

  diffs.push({ path: prefix, oldValue: oldObj, newValue: newObj });
  return diffs;
}

export function formatValue(value: unknown): string {
  if (value === undefined) return '(未设置)';
  if (value === null) return '(空)';
  if (typeof value === 'string') return value || '(空字符串)';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[数组 ${value.length} 项]`;
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function getFieldLabel(path: string): string {
  const labels: Record<string, string> = {
    name: '沙盘名称',
    status: '状态',
    inclination: '轨道倾角',
    unit: '单位',
    'cameraView.x': '视角 X 坐标',
    'cameraView.y': '视角 Y 坐标',
    'cameraView.z': '视角 Z 坐标',
    'cameraView.zoom': '视角缩放',
    notes: '备注',
    modelOverlap: '模型重叠',
  };

  if (path.startsWith('screenshots[')) {
    const match = path.match(/screenshots\[(\d+)\]\.?(.*)/);
    if (match) {
      const idx = match[1];
      const field = match[2] || '整体';
      const fieldLabels: Record<string, string> = {
        url: '图片地址',
        description: '描述',
        timestamp: '时间戳',
        judgment: '截图结论',
        '': '整体',
      };
      return `截图 #${Number(idx) + 1} - ${fieldLabels[field] || field}`;
    }
  }

  return labels[path] || path;
}
