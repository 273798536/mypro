import { GameMaterials, DefrostSlot, Task, ColdZone, Evaporator, TempLayer } from '@/types';

export function minutesToLabel(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

export function parseMaterialsFromText(text: string, fileName: string): GameMaterials {
  const trimmed = fileName.toLowerCase();
  if (trimmed.endsWith('.json')) return parseJSON(text);
  if (trimmed.endsWith('.csv')) return parseCSV(text);
  try {
    return parseJSON(text);
  } catch {
    return parseCSV(text);
  }
}

function parseJSON(text: string): GameMaterials {
  const obj = JSON.parse(text);
  return {
    zones: (obj.zones ?? []) as ColdZone[],
    evaporators: (obj.evaporators ?? []) as Evaporator[],
    tempLayers: (obj.tempLayers ?? []) as TempLayer[],
    tasks: (obj.tasks ?? []) as Task[],
    defrostSlots: (obj.defrostSlots ?? []) as DefrostSlot[],
    opReports: obj.opReports ?? [],
  };
}

function parseCSV(text: string): GameMaterials {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return emptyMaterials();
  const header = lines[0].split(',').map((s) => s.trim());
  const rows = lines.slice(1).map((l) => l.split(',').map((s) => s.trim()));

  const out: GameMaterials = emptyMaterials();
  const keys = new Set(header);
  const get = (r: string[], k: string) => r[header.indexOf(k)] ?? '';

  rows.forEach((r) => {
    const kind = get(r, 'kind');
    if (kind === 'zone' && keys.has('kind')) {
      out.zones.push({
        id: get(r, 'id') || `z-${r[0]}`,
        name: get(r, 'name'),
        targetTemp: Number(get(r, 'targetTemp')),
        maxTemp: Number(get(r, 'maxTemp')),
        minTemp: Number(get(r, 'minTemp')),
      });
    } else if (kind === 'evaporator') {
      out.evaporators.push({
        id: get(r, 'id'),
        name: get(r, 'name'),
        zoneId: get(r, 'zoneId'),
        powerKw: Number(get(r, 'powerKw')),
        defrostDurationMin: Number(get(r, 'defrostDurationMin')),
        defrostIntervalMin: Number(get(r, 'defrostIntervalMin')),
      });
    } else if (kind === 'layer') {
      out.tempLayers.push({
        id: get(r, 'id'),
        zoneId: get(r, 'zoneId'),
        name: get(r, 'name'),
        tempCeiling: Number(get(r, 'tempCeiling')),
        maxDeviation: Number(get(r, 'maxDeviation')),
      });
    } else if (kind === 'task') {
      out.tasks.push({
        id: get(r, 'id'),
        type: (get(r, 'type') as 'in' | 'out'),
        zoneId: get(r, 'zoneId'),
        scheduledStart: Number(get(r, 'scheduledStart')),
        scheduledEnd: Number(get(r, 'scheduledEnd')),
        penaltyPerMin: Number(get(r, 'penaltyPerMin')),
      });
    } else if (kind === 'defrost') {
      out.defrostSlots.push({
        id: get(r, 'id'),
        evaporatorId: get(r, 'evaporatorId'),
        start: Number(get(r, 'start')),
        end: Number(get(r, 'end')),
        status: 'planned',
      });
    }
  });
  return out;
}

export function emptyMaterials(): GameMaterials {
  return { zones: [], evaporators: [], tempLayers: [], tasks: [], defrostSlots: [], opReports: [] };
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportJSON(obj: any, fileName: string) {
  downloadBlob(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }), fileName);
}

export function exportCSV(rows: Record<string, any>[], fileName: string) {
  if (rows.length === 0) {
    downloadBlob(new Blob([''], { type: 'text/csv' }), fileName);
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  rows.forEach((r) => lines.push(headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')));
  downloadBlob(new Blob([lines.join('\n')], { type: 'text/csv' }), fileName);
}
