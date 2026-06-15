export interface MapBounds {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export function lngLatToSvg(
  lng: number,
  lat: number,
  bounds: MapBounds,
  width: number,
  height: number,
  padding: number = 40
): { x: number; y: number } {
  const lngRange = bounds.maxLng - bounds.minLng;
  const latRange = bounds.maxLat - bounds.minLat;

  const x = padding + ((lng - bounds.minLng) / lngRange) * (width - 2 * padding);
  const y = height - padding - ((lat - bounds.minLat) / latRange) * (height - 2 * padding);

  return { x, y };
}

export function computeBounds(points: { lng: number; lat: number }[]): MapBounds {
  const lngs = points.map((p) => p.lng);
  const lats = points.map((p) => p.lat);

  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
}
