export function latLngToPosition(
  lat: number,
  lng: number,
  centerLat = 25.0,
  centerLng = 119.5,
  scale = 100
): [number, number, number] {
  const x = (lng - centerLng) * scale * 111 * Math.cos((centerLat * Math.PI) / 180);
  const z = (lat - centerLat) * scale * 111;
  return [x, 0, z];
}

export function positionToLatLng(
  x: number,
  z: number,
  centerLat = 25.0,
  centerLng = 119.5,
  scale = 100
): { lat: number; lng: number } {
  const lat = centerLat + z / (scale * 111);
  const lng = centerLng + x / (scale * 111 * Math.cos((centerLat * Math.PI) / 180));
  return { lat, lng };
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getLoadColor(load: number, maxLoad = 500): string {
  const normalized = Math.min(Math.max(load / maxLoad, 0), 1);
  if (normalized < 0.25) return `rgb(${Math.floor(62 + normalized * 40)}, ${Math.floor(146 + normalized * 30)}, ${Math.floor(204 - normalized * 50)})`;
  if (normalized < 0.5) return `rgb(${Math.floor(102 + normalized * 100)}, ${Math.floor(176 + normalized * 50)}, ${Math.floor(154 - normalized * 50)})`;
  if (normalized < 0.75) return `rgb(${Math.floor(202 + normalized * 50)}, ${Math.floor(226 - normalized * 60)}, ${Math.floor(104 - normalized * 50)})`;
  return `rgb(${Math.floor(252 + normalized * 3)}, ${Math.floor(166 - normalized * 70)}, ${Math.floor(54 - normalized * 20)})`;
}
