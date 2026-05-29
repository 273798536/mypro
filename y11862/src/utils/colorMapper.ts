import * as THREE from 'three';

const COLOR_STOPS: Array<{ db: number; color: THREE.Color }> = [
  { db: -60, color: new THREE.Color(0x1e1b4b) },
  { db: -50, color: new THREE.Color(0x3730a3) },
  { db: -40, color: new THREE.Color(0x1d4ed8) },
  { db: -30, color: new THREE.Color(0x0284c7) },
  { db: -20, color: new THREE.Color(0x0891b2) },
  { db: -15, color: new THREE.Color(0x0d9488) },
  { db: -10, color: new THREE.Color(0x65a30d) },
  { db: -5, color: new THREE.Color(0xeab308) },
  { db: -2, color: new THREE.Color(0xf97316) },
  { db: 0, color: new THREE.Color(0xef4444) },
];

export function energyToColor(db: number, threshold: number = -60): THREE.Color {
  const clampedDb = Math.max(threshold, Math.min(0, db));

  if (clampedDb <= COLOR_STOPS[0].db) {
    return COLOR_STOPS[0].color.clone();
  }
  if (clampedDb >= COLOR_STOPS[COLOR_STOPS.length - 1].db) {
    return COLOR_STOPS[COLOR_STOPS.length - 1].color.clone();
  }

  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const lower = COLOR_STOPS[i];
    const upper = COLOR_STOPS[i + 1];

    if (clampedDb >= lower.db && clampedDb <= upper.db) {
      const t = (clampedDb - lower.db) / (upper.db - lower.db);
      return lower.color.clone().lerp(upper.color, t);
    }
  }

  return COLOR_STOPS[0].color.clone();
}

export function energyToHeight(db: number, threshold: number = -60, maxHeight: number = 10): number {
  const normalized = Math.max(0, (db - threshold) / Math.abs(threshold));
  return normalized * maxHeight;
}

export function frequencyToX(freq: number, freqMin: number, freqMax: number, width: number = 20): number {
  const logMin = Math.log10(freqMin);
  const logMax = Math.log10(freqMax);
  const logFreq = Math.log10(Math.max(freqMin, Math.min(freqMax, freq)));
  const normalized = (logFreq - logMin) / (logMax - logMin);
  return (normalized - 0.5) * width;
}

export function timeToZ(time: number, totalTime: number, depth: number = 20): number {
  const normalized = time / Math.max(totalTime, 0.001);
  return (normalized - 0.5) * depth;
}

export function colorToHexString(color: THREE.Color): string {
  return '#' + color.getHexString();
}
