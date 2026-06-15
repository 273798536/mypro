import type { Photo } from '../../shared/types.js';

export interface CoordinateCheckResult {
  hasOffset: boolean;
  offsetDistance: number;
  offsetPhotos: Photo[];
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function checkCoordinates(
  complaintLat: number,
  complaintLon: number,
  photos: Photo[],
  thresholdMeters: number = 50
): CoordinateCheckResult {
  let maxDistance = 0;
  const offsetPhotos: Photo[] = [];

  for (const photo of photos) {
    const distance = calculateDistance(
      complaintLat,
      complaintLon,
      photo.latitude,
      photo.longitude
    );
    if (distance > maxDistance) {
      maxDistance = distance;
    }
    if (distance > thresholdMeters) {
      offsetPhotos.push(photo);
    }
  }

  return {
    hasOffset: offsetPhotos.length > 0,
    offsetDistance: Math.round(maxDistance),
    offsetPhotos
  };
}

export function formatOffsetInfo(photo: Photo, complaintAddress: string, distance: number): string {
  return `照片坐标(${photo.latitude.toFixed(6)}, ${photo.longitude.toFixed(6)}) ` +
    `与投诉点距离约${Math.round(distance)}米，` +
    `原始地址标注为"${photo.address}"，` +
    `投诉地址为"${complaintAddress}"，` +
    `存在跨街道偏移风险。`;
}
