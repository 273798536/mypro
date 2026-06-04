export const R = 6378137;

export function lngLatToMercator(lng: number, lat: number): { x: number; y: number } {
  const x = R * (lng * Math.PI / 180);
  const y = R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  return { x, y };
}

export function mercatorToLngLat(x: number, y: number): { lng: number; lat: number } {
  const lng = (x / R) * 180 / Math.PI;
  const lat = (2 * Math.atan(Math.exp(y / R)) * 180 / Math.PI - 90);
  return { lng, lat };
}

export function snapToGrid(
  lng: number,
  lat: number,
  gridSize: number,
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number }
): { lng: number; lat: number; gridX: number; gridY: number } {
  const x = lngLatToMercator(lng, lat);
  const min = lngLatToMercator(bounds.minLng, bounds.minLat);
  const max = lngLatToMercator(bounds.maxLng, bounds.maxLat);

  const localX = x.x - min.x;
  const localY = max.y - x.y;

  const gridX = Math.floor(localX / gridSize);
  const gridY = Math.floor(localY / gridSize);

  const snappedLocalX = gridX * gridSize + gridSize / 2;
  const snappedLocalY = gridY * gridSize + gridSize / 2;

  const snappedMercator = {
    x: min.x + snappedLocalX,
    y: max.y - snappedLocalY
  };

  const snapped = mercatorToLngLat(snappedMercator.x, snappedMercator.y);

  return {
    lng: snapped.lng,
    lat: snapped.lat,
    gridX,
    gridY
  };
}

export function calculateGridLines(
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number },
  gridSize: number
): { vertical: { x1: number; y1: number; x2: number; y2: number }[];
  horizontal: { x1: number; y1: number; x2: number; y2: number }[];
} {
  const vertical: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const horizontal: { x1: number; y1: number; x2: number; y2: number }[] = [];

  const min = lngLatToMercator(bounds.minLng, bounds.minLat);
  const max = lngLatToMercator(bounds.maxLng, bounds.maxLat);

  const width = max.x - min.x;
  const height = max.y - min.y;

  for (let x = 0; x <= width; x += gridSize) {
    vertical.push({
      x1: min.x + x,
      y1: min.y,
      x2: min.x + x,
      y2: max.y
    });
  }

  for (let y = 0; y <= height; y += gridSize) {
    horizontal.push({
      x1: min.x,
      y1: max.y - y,
      x2: max.x,
      y2: max.y - y
    });
  }

  const toLngLat = (x: number, y: number) => mercatorToLngLat(x, y);

  return {
    vertical: vertical.map(line => {
      const start = toLngLat(line.x1, line.y1);
      const end = toLngLat(line.x2, line.y2);
      return { x1: start.lng, y1: start.lat, x2: end.lng, y2: end.lat };
    }),
    horizontal: horizontal.map(line => {
      const start = toLngLat(line.x1, line.y1);
      const end = toLngLat(line.x2, line.y2);
      return { x1: start.lng, y1: start.lat, x2: end.lng, y2: end.lat };
    })
  };
}

export function generateGridLines(
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number },
  gridSize: number
): { vertical: number[]; horizontal: number[] } {
  const result = calculateGridLines(bounds, gridSize);
  return {
    vertical: result.vertical.map(line => line.x1),
    horizontal: result.horizontal.map(line => line.y1)
  };
}

export function generateId(): string {
  return `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}
