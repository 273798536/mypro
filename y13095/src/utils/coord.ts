export interface Coord {
  lng: number;
  lat: number;
}

export interface PixelCoord {
  x: number;
  y: number;
}

export function coordToPixel(
  coord: Coord,
  center: Coord,
  zoom: number,
  canvasWidth: number,
  canvasHeight: number
): PixelCoord {
  const scale = Math.pow(2, zoom) * 10000;
  
  const x = canvasWidth / 2 + (coord.lng - center.lng) * scale;
  const y = canvasHeight / 2 - (coord.lat - center.lat) * scale;
  
  return { x, y };
}

export function pixelToCoord(
  pixel: PixelCoord,
  center: Coord,
  zoom: number,
  canvasWidth: number,
  canvasHeight: number
): Coord {
  const scale = Math.pow(2, zoom) * 10000;
  
  const lng = (pixel.x - canvasWidth / 2) / scale + center.lng;
  const lat = -(pixel.y - canvasHeight / 2) / scale + center.lat;
  
  return { lng, lat };
}

export function getDistance(a: Coord, b: Coord): number {
  const dx = a.lng - b.lng;
  const dy = a.lat - b.lat;
  return Math.sqrt(dx * dx + dy * dy);
}

export function formatCoord(lng: number, lat: number, altitude?: number): string {
  const lngDir = lng >= 0 ? 'E' : 'W';
  const latDir = lat >= 0 ? 'N' : 'S';
  
  let result = `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`;
  if (altitude !== undefined) {
    result += `, ${altitude.toFixed(1)}m`;
  }
  return result;
}

export function polygonContainsPoint(
  point: Coord,
  polygon: Coord[]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    
    const intersect = ((yi > point.lat) !== (yj > point.lat))
      && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
