export interface ParsedCoordinates {
  x: number;
  y: number;
  width?: number;
  height?: number;
  raw: string;
}

export function parseCoordinates(coords: string): ParsedCoordinates | null {
  if (!coords || typeof coords !== 'string') {
    return null;
  }

  const patterns = [
    /^\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*$/,
    /^\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*$/,
    /^\s*\(\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*\)\s*$/,
    /^\s*X\s*[:=]\s*(\d+\.?\d*)\s*[,;]\s*Y\s*[:=]\s*(\d+\.?\d*)\s*$/i,
    /^\s*(\d+\.?\d*)\s*x\s*(\d+\.?\d*)\s*$/i,
  ];

  for (const pattern of patterns) {
    const match = coords.match(pattern);
    if (match) {
      const result: ParsedCoordinates = {
        x: parseFloat(match[1]),
        y: parseFloat(match[2]),
        raw: coords.trim(),
      };
      if (match[3] && match[4]) {
        result.width = parseFloat(match[3]);
        result.height = parseFloat(match[4]);
      }
      return result;
    }
  }

  return null;
}

export function formatCoordinates(x: number, y: number, width?: number, height?: number): string {
  if (width !== undefined && height !== undefined) {
    return `${x.toFixed(2)}, ${y.toFixed(2)}, ${width.toFixed(2)}, ${height.toFixed(2)}`;
  }
  return `${x.toFixed(2)}, ${y.toFixed(2)}`;
}

export function coordinatesToKey(imageHash: string, coordinates: string): string {
  return `${imageHash}|${coordinates.trim()}`;
}
