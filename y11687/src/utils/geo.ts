import * as THREE from 'three';

const EARTH_RADIUS_KM = 6371;
const SCENE_SCALE = 100;
const EARTH_RADIUS_SCENE = 2;

export const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

export const toDegrees = (radians: number): number => {
  return radians * (180 / Math.PI);
};

export const haversineDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
};

export const latLngToVector3 = (
  lat: number,
  lng: number,
  altitude: number = 0,
  radius: number = EARTH_RADIUS_SCENE
): THREE.Vector3 => {
  const phi = toRadians(90 - lat);
  const theta = toRadians(lng + 180);

  const altitudeScale = altitude / 1000 / SCENE_SCALE;
  const r = radius + altitudeScale * 0.1;

  const x = -r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.cos(phi);
  const z = r * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
};

export const vector3ToLatLng = (vector: THREE.Vector3, radius: number = EARTH_RADIUS_SCENE): { lat: number; lng: number } => {
  const normalized = vector.clone().normalize();
  
  const lat = 90 - toDegrees(Math.acos(normalized.y));
  const lng = toDegrees(Math.atan2(normalized.z, -normalized.x)) - 180;

  return { lat, lng };
};

export const getPointAlongRoute = (
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  progress: number
): { lat: number; lng: number } => {
  const start = latLngToVector3(startLat, startLng);
  const end = latLngToVector3(endLat, endLng);

  const result = new THREE.Vector3();
  result.lerpVectors(start, end, progress);
  result.normalize().multiplyScalar(EARTH_RADIUS_SCENE);

  return vector3ToLatLng(result);
};

export const generateRoutePoints = (
  waypoints: Array<{ lat: number; lng: number }>,
  samplesPerSegment: number = 50
): Array<{ lat: number; lng: number }> => {
  const points: Array<{ lat: number; lng: number }> = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];

    for (let j = 0; j < samplesPerSegment; j++) {
      const progress = j / samplesPerSegment;
      const point = getPointAlongRoute(start.lat, start.lng, end.lat, end.lng, progress);
      points.push(point);
    }
  }

  if (waypoints.length > 0) {
    points.push(waypoints[waypoints.length - 1]);
  }

  return points;
};

export const getBearing = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const dLng = toRadians(lng2 - lng1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

  let bearing = toDegrees(Math.atan2(y, x));
  bearing = (bearing + 360) % 360;

  return bearing;
};

export const getTotalDistance = (
  waypoints: Array<{ lat: number; lng: number }>
): number => {
  let total = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    total += haversineDistance(
      waypoints[i].lat,
      waypoints[i].lng,
      waypoints[i + 1].lat,
      waypoints[i + 1].lng
    );
  }

  return total;
};

export const isPointInPolygon = (
  point: { lat: number; lng: number },
  polygon: Array<{ lat: number; lng: number }>
): boolean => {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat;
    const yi = polygon[i].lng;
    const xj = polygon[j].lat;
    const yj = polygon[j].lng;

    const intersect =
      yi > point.lng !== yj > point.lng &&
      point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
};
