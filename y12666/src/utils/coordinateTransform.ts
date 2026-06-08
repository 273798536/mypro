import type { Turbine, CoordinateSystem } from '@/types';

const WGS84_TO_UTM_SCALE = 111000;

export function wgs84ToUtm(lat: number, lon: number, refLat = 30, refLon = 120): { x: number; y: number } {
  const x = (lon - refLon) * WGS84_TO_UTM_SCALE * Math.cos((refLat * Math.PI) / 180);
  const y = (lat - refLat) * WGS84_TO_UTM_SCALE;
  return { x, y };
}

export function normalizeTurbineToLocal(turbine: Turbine): { x: number; y: number } {
  switch (turbine.coordinateSystem) {
    case 'UTM50N':
    case 'LOCAL':
      return { x: turbine.x, y: turbine.y };
    case 'WGS84': {
      const converted = wgs84ToUtm(turbine.y, turbine.x);
      return { x: converted.x, y: converted.y };
    }
    default:
      return { x: turbine.x, y: turbine.y };
  }
}

export function extractNoteFromRaw(rawNote?: string): { clean: string; note: string } {
  if (!rawNote) return { clean: '', note: '' };
  const noteMatch = rawNote.match(/备注[：:](.*)$/);
  if (noteMatch) {
    const note = noteMatch[1].trim();
    const clean = rawNote.replace(noteMatch[0], '').trim();
    return { clean, note };
  }
  return { clean: rawNote, note: '' };
}

export function parseCoordinateOffset(note: string): { dx: number; dy: number } | null {
  const dxMatch = note.match(/([+-]?\d+(?:\.\d+)?)\s*m[^-+]*[xX横轴东西]/) ||
    note.match(/[xX横轴东西][^+-]*([+-]?\d+(?:\.\d+)?)\s*m/);
  const dyMatch = note.match(/([+-]?\d+(?:\.\d+)?)\s*m[^-+]*[yY纵轴南北]/) ||
    note.match(/[yY纵轴南北][^+-]*([+-]?\d+(?:\.\d+)?)\s*m/);
  const genericMatch = note.match(/偏移\s*([+-]?\d+(?:\.\d+)?)\s*m[,\s]*([+-]?\d+(?:\.\d+)?)\s*m/);

  if (genericMatch) {
    return { dx: parseFloat(genericMatch[1]), dy: parseFloat(genericMatch[2]) };
  }
  if (dxMatch || dyMatch) {
    return {
      dx: dxMatch ? parseFloat(dxMatch[1]) : 0,
      dy: dyMatch ? parseFloat(dyMatch[1]) : 0,
    };
  }
  return null;
}

export function applyOffsetIfNote(turbines: Turbine[], apply = true): Turbine[] {
  return turbines.map((t) => {
    if (!t.rawNote) return t;
    const { note } = extractNoteFromRaw(t.rawNote);
    const offset = parseCoordinateOffset(note);
    if (offset && apply) {
      return { ...t, x: t.x + offset.dx, y: t.y + offset.dy, isOffset: true };
    }
    return { ...t, isOffset: false };
  });
}

export function detectCoordinateMix(turbines: Turbine[]): { mixed: boolean; systems: CoordinateSystem[] } {
  const systems = Array.from(new Set(turbines.map((t) => t.coordinateSystem)));
  return { mixed: systems.length > 1, systems };
}
