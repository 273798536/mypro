import { DataRecord } from '../types';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function recordSignature(r: Pick<DataRecord, 'type' | 'data'>): string {
  const { type, data } = r;
  const keyParts: string[] = [type];
  if (type === 'buoy') {
    if (data.buoyId) keyParts.push(`bid:${data.buoyId}`);
    if (data.timestamp) keyParts.push(`ts:${data.timestamp}`);
  } else if (type === 'model') {
    if (data.modelId) keyParts.push(`mid:${data.modelId}`);
    if (data.name) keyParts.push(`n:${data.name}`);
  } else if (type === 'coordinate') {
    if (data.deviceId) keyParts.push(`did:${data.deviceId}`);
    if (data.latitude != null) keyParts.push(`lat:${data.latitude}`);
    if (data.longitude != null) keyParts.push(`lng:${data.longitude}`);
  }
  return keyParts.join('|');
}

export function detectConflicts(existing: DataRecord[], incoming: DataRecord[]): Map<string, string[]> {
  const conflictMap = new Map<string, string[]>();
  const byKey = new Map<string, DataRecord[]>();

  for (const r of [...existing, ...incoming]) {
    const k = recordSignature(r);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(r);
  }

  for (const [, list] of byKey) {
    if (list.length > 1) {
      const ids = list.map(r => r.id);
      for (const r of list) {
        conflictMap.set(r.id, ids.filter(id => id !== r.id));
      }
    }
  }
  return conflictMap;
}

export function parseFileName(name: string): { base: string; ext: string } {
  const idx = name.lastIndexOf('.');
  if (idx === -1) return { base: name, ext: '' };
  return { base: name.slice(0, idx), ext: name.slice(idx + 1).toLowerCase() };
}
