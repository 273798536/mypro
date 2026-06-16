import { v4 as uuidv4 } from 'uuid';
import type {
  FirePlan,
  SceneAnnotation,
  ResidentFeedback,
  SitePhoto,
  VersionSnapshot,
  ChangeRecord,
} from '../types';

export function createSnapshot(
  plan: FirePlan,
  annotations: SceneAnnotation[],
  feedbacks: ResidentFeedback[],
  photos: SitePhoto[],
  operator: string,
  message: string,
): VersionSnapshot {
  return {
    id: uuidv4(),
    planId: plan.id,
    version: plan.version,
    data: {
      plan: JSON.parse(JSON.stringify(plan)),
      annotations: JSON.parse(JSON.stringify(annotations)),
      feedbacks: JSON.parse(JSON.stringify(feedbacks)),
      photos: JSON.parse(JSON.stringify(photos)),
    },
    createdAt: Date.now(),
    createdBy: operator,
    message,
  };
}

export function rollbackToSnapshot(snapshot: VersionSnapshot): {
  plan: FirePlan;
  annotations: SceneAnnotation[];
  feedbacks: ResidentFeedback[];
  photos: SitePhoto[];
} {
  return {
    plan: JSON.parse(JSON.stringify(snapshot.data.plan)),
    annotations: JSON.parse(JSON.stringify(snapshot.data.annotations)),
    feedbacks: JSON.parse(JSON.stringify(snapshot.data.feedbacks)),
    photos: JSON.parse(JSON.stringify(snapshot.data.photos)),
  };
}

export interface DiffField {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  changed: boolean;
}

export function diffSnapshots(a: VersionSnapshot, b: VersionSnapshot): DiffField[] {
  const diffs: DiffField[] = [];
  diffObject(a.data, b.data, '', diffs);
  return diffs;
}

function diffObject(
  a: unknown,
  b: unknown,
  path: string,
  diffs: DiffField[],
): void {
  if (a === b) return;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      diffs.push({ path: path || '(root)', oldValue: a, newValue: b, changed: true });
      return;
    }
    for (let i = 0; i < a.length; i++) {
      diffObject(a[i], b[i], path ? `${path}[${i}]` : `[${i}]`, diffs);
    }
    return;
  }

  if (
    a &&
    b &&
    typeof a === 'object' &&
    typeof b === 'object' &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
    for (const key of keys) {
      const av = (a as Record<string, unknown>)[key];
      const bv = (b as Record<string, unknown>)[key];
      diffObject(av, bv, path ? `${path}.${key}` : key, diffs);
    }
    return;
  }

  diffs.push({ path, oldValue: a, newValue: b, changed: true });
}

export function formatChangeForReview(change: ChangeRecord): {
  title: string;
  detail: string;
  timestamp: string;
} {
  const date = new Date(change.timestamp);
  const ts = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;

  let detail = change.description;
  if (change.oldValue !== undefined && change.newValue !== undefined) {
    const oldStr = formatValue(change.oldValue);
    const newStr = formatValue(change.newValue);
    if (oldStr !== newStr) {
      detail += `\n\n变更前：${oldStr}\n变更后：${newStr}`;
    }
  }

  return {
    title: changeTypeLabel(change.type),
    detail,
    timestamp: ts,
  };
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '(空)';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function changeTypeLabel(type: string): string {
  const map: Record<string, string> = {
    create: '方案创建',
    update_annotation: '场景标注变更',
    add_feedback: '新增居民反馈',
    update_feedback: '居民反馈更新',
    add_photo: '补录现场照片',
    update_description: '方案描述更新',
    status_change: '状态变更',
    confirm: '方案确认/冲突解决',
    conflict_detected: '检测到冲突',
  };
  return map[type] || type;
}
