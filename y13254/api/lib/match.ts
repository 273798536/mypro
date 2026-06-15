import type { Location } from '../../shared/types';

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);

  for (let j = 0; j <= b.length; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    for (let j = 0; j <= b.length; j++) {
      prev[j] = curr[j];
    }
  }

  return prev[b.length];
}

function similarityScore(a: string, b: string): number {
  if (!a || !b) return 0;
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  if (s1 === s2) return 1;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 0;
  const dist = levenshtein(s1, s2);
  return 1 - dist / maxLen;
}

function substringScore(a: string, b: string): number {
  if (!a || !b) return 0;
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return minLen / maxLen;
  }
  return 0;
}

export function fuzzyMatch(query: string, locations: Location[]): Location[] {
  if (!query || !locations || locations.length === 0) {
    return [];
  }

  const threshold = 0.6;
  const scored: Array<{ loc: Location; score: number }> = [];

  for (const loc of locations) {
    let bestScore = 0;

    const canonicalScore = Math.max(
      similarityScore(query, loc.canonicalName),
      substringScore(query, loc.canonicalName)
    );
    if (canonicalScore > bestScore) {
      bestScore = canonicalScore;
    }

    if (loc.aliases && loc.aliases.length > 0) {
      for (const alias of loc.aliases) {
        const aliasScore = Math.max(
          similarityScore(query, alias),
          substringScore(query, alias)
        );
        if (aliasScore > bestScore) {
          bestScore = aliasScore;
        }
      }
    }

    if (bestScore > threshold) {
      scored.push({ loc, score: bestScore });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.loc);
}

export function pointInPolygon(
  lng: number,
  lat: number,
  boundaryGeoJSON: any
): boolean {
  if (!boundaryGeoJSON) return false;

  let coordinates: number[][];
  if (boundaryGeoJSON.type === 'Feature') {
    coordinates = boundaryGeoJSON.geometry?.coordinates?.[0] || [];
  } else if (boundaryGeoJSON.type === 'Polygon') {
    coordinates = boundaryGeoJSON.coordinates?.[0] || [];
  } else if (Array.isArray(boundaryGeoJSON)) {
    coordinates = boundaryGeoJSON;
  } else {
    return false;
  }

  if (!coordinates || coordinates.length < 3) return false;

  const points = coordinates.map((c) => [c[0], c[1]] as [number, number]);
  const n = points.length;
  let inside = false;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

export function detectCrossStreet(
  location: Location,
  allLocations: Location[]
): { isCross: boolean; hitName?: string } {
  if (!location || !allLocations || allLocations.length < 2) {
    return { isCross: false };
  }

  for (const other of allLocations) {
    if (other.id === location.id) continue;
    if (!other.boundaryGeoJSON) continue;

    const inside = pointInPolygon(location.lng, location.lat, other.boundaryGeoJSON);
    if (inside) {
      return {
        isCross: true,
        hitName: other.canonicalName
      };
    }
  }

  return { isCross: false };
}
