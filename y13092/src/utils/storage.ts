import type { PersistableState, MaterialImportPayload } from '@/types';

const STORAGE_KEY = 'bridge-tunnel-collision-check-v1';

export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatTimestamp(date?: Date): string {
  const d = date ?? new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

export function loadPersistedState(): PersistableState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistableState;
    if (!parsed || !parsed.session) return null;
    return parsed;
  } catch (e) {
    console.error('[persist] 加载本地数据失败:', e);
    return null;
  }
}

export function savePersistedState(state: PersistableState): void {
  try {
    const withTimestamp: PersistableState = {
      ...state,
      lastPersistedAt: formatTimestamp(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withTimestamp));
  } catch (e) {
    console.error('[persist] 保存本地数据失败:', e);
  }
}

export function clearPersistedState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('[persist] 清除本地数据失败:', e);
  }
}

export function parseImportPayload(
  raw: string,
  fileName: string,
): MaterialImportPayload & { hash: string } {
  const parsed = JSON.parse(raw);
  const hash = hashString(raw);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('导入文件格式无效：必须是JSON对象');
  }

  const payload: MaterialImportPayload = {
    layers: Array.isArray(parsed.layers) ? parsed.layers : [],
    collisions: Array.isArray(parsed.collisions) ? parsed.collisions : [],
    timeSegments: Array.isArray(parsed.timeSegments) ? parsed.timeSegments : [],
    meta: {
      fileName,
      operator: parsed.meta?.operator ?? '导入用户',
    },
  };

  return { ...payload, hash };
}

export interface ExportPayload {
  version: string;
  exportedAt: string;
  exportedBy: string;
  data: Partial<PersistableState>;
}

export function buildExportPayload(
  state: Partial<PersistableState>,
  operator: string,
): ExportPayload {
  return {
    version: '1.0.0',
    exportedAt: formatTimestamp(),
    exportedBy: operator,
    data: state,
  };
}

export function downloadJson(
  payload: ExportPayload | PersistableState,
  filename: string,
): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
