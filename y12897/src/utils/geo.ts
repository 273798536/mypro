export function latLonToXY(lat: number, lon: number, centerLat: number, centerLon: number, scale = 100): { x: number; y: number } {
  const x = (lon - centerLon) * scale * 111 * Math.cos((centerLat * Math.PI) / 180);
  const y = (lat - centerLat) * scale * 111;
  return { x, y };
}

export function xyToLatLon(x: number, y: number, centerLat: number, centerLon: number, scale = 100): { lat: number; lon: number } {
  const lon = x / (scale * 111 * Math.cos((centerLat * Math.PI) / 180)) + centerLon;
  const lat = y / (scale * 111) + centerLat;
  return { lat, lon };
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function convertSalinityToPsu(value: number, unit: string): number {
  switch (unit) {
    case 'ppt':
      return value;
    case 'psu':
      return value;
    case 'mg/L':
      return value / 1000;
    default:
      return value;
  }
}

export function getRiskColor(level: string): string {
  switch (level) {
    case 'critical':
      return '#dc2626';
    case 'high':
      return '#ff6b35';
    case 'medium':
      return '#f59e0b';
    case 'low':
      return '#10b981';
    default:
      return '#6b7280';
  }
}

export function getRiskLabel(level: string): string {
  switch (level) {
    case 'critical':
      return '极高';
    case 'high':
      return '高';
    case 'medium':
      return '中';
    case 'low':
      return '低';
    default:
      return '未知';
  }
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}
