const UNIT_TABLE: Record<string, { dim: string; scale: number; symbol: string }> = {
  m: { dim: 'length', scale: 1, symbol: 'm' },
  cm: { dim: 'length', scale: 1e-2, symbol: 'cm' },
  mm: { dim: 'length', scale: 1e-3, symbol: 'mm' },
  km: { dim: 'length', scale: 1e3, symbol: 'km' },
  s: { dim: 'time', scale: 1, symbol: 's' },
  ms: { dim: 'time', scale: 1e-3, symbol: 'ms' },
  min: { dim: 'time', scale: 60, symbol: 'min' },
  hz: { dim: 'freq', scale: 1, symbol: 'Hz' },
  khz: { dim: 'freq', scale: 1e3, symbol: 'kHz' },
  'm/s': { dim: 'speed', scale: 1, symbol: 'm/s' },
  'cm/s': { dim: 'speed', scale: 1e-2, symbol: 'cm/s' },
  'km/h': { dim: 'speed', scale: 1 / 3.6, symbol: 'km/h' },
  'm/s^2': { dim: 'accel', scale: 1, symbol: 'm/s²' },
  'cm/s^2': { dim: 'accel', scale: 1e-2, symbol: 'cm/s²' },
  'mm/s^2': { dim: 'accel', scale: 1e-3, symbol: 'mm/s²' },
  g: { dim: 'accel', scale: 9.80665, symbol: 'g' },
  kg: { dim: 'mass', scale: 1, symbol: 'kg' },
  t: { dim: 'mass', scale: 1e3, symbol: 't' },
  rad: { dim: 'angle', scale: 1, symbol: 'rad' },
  deg: { dim: 'angle', scale: Math.PI / 180, symbol: '°' },
};

export function convert(
  value: number,
  from: string,
  to: string
): { ok: true; factor: number; result: number } | { ok: false; reason: string } {
  const f = UNIT_TABLE[from];
  const t = UNIT_TABLE[to];
  if (!f || !t) return { ok: false, reason: `未知单位: ${!f ? from : to}` };
  if (f.dim !== t.dim)
    return { ok: false, reason: `量纲不一致: ${f.dim} ↔ ${t.dim}` };
  const factor = f.scale / t.scale;
  return { ok: true, factor, result: value * factor };
}

export function magnitudeDelta(prev: number, curr: number): number {
  if (prev === 0 || curr === 0) return 0;
  return Math.log10(Math.abs(curr)) - Math.log10(Math.abs(prev));
}

export function hasUnit(key: string) {
  return key in UNIT_TABLE;
}

export function displayUnit(u: string): string {
  return UNIT_TABLE[u]?.symbol ?? u;
}

export default UNIT_TABLE;
