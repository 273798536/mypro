export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  if (
    isNaN(lat1) ||
    isNaN(lng1) ||
    isNaN(lat2) ||
    isNaN(lng2) ||
    lat1 === 0 ||
    lng1 === 0 ||
    lat2 === 0 ||
    lng2 === 0
  ) {
    return Infinity;
  }

  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function levenshteinDistance(a: string, b: string): number {
  const s1 = a || "";
  const s2 = b || "";
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[s2.length][s1.length];
}

const DIRECTION_WORDS = ["东", "南", "西", "北", "东北", "东南", "西南", "西北"];

export function isOnlyDirectionDiff(a: string, b: string): boolean {
  const s1 = a || "";
  const s2 = b || "";
  if (s1 === s2) return false;

  for (const d1 of DIRECTION_WORDS) {
    for (const d2 of DIRECTION_WORDS) {
      if (d1 === d2) continue;
      const replaced1 = s1.replace(new RegExp(d1, "g"), d2);
      const replaced2 = s2.replace(new RegExp(d2, "g"), d1);
      if (replaced1 === s2 || replaced2 === s1) return true;
    }
  }
  return false;
}

export function extractParkName(locationName: string): string {
  if (!locationName) return "";
  const match = locationName.match(/(.+公园)/);
  return match ? match[1] : locationName;
}
