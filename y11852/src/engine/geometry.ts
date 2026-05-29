import * as THREE from 'three';
import type { Vec3 } from '../types/acoustics';

export const vec3ToThree = (v: Vec3): THREE.Vector3 => new THREE.Vector3(v.x, v.y, v.z);

export const threeToVec3 = (v: THREE.Vector3): Vec3 => ({ x: v.x, y: v.y, z: v.z });

export const distance = (a: Vec3, b: Vec3): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});

export const normalize = (v: Vec3): Vec3 => {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
};

export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

export const reflect = (direction: Vec3, normal: Vec3): Vec3 => {
  const d = dot(direction, normal) * 2;
  return {
    x: direction.x - normal.x * d,
    y: direction.y - normal.y * d,
    z: direction.z - normal.z * d,
  };
};

export const generateFanHallGeometry = (params: {
  width: number;
  depth: number;
  height: number;
  stageDepth: number;
  curvature: number;
}): Record<string, THREE.BufferGeometry> => {
  const { width, depth, height, stageDepth, curvature } = params;
  const geometries: Record<string, THREE.BufferGeometry> = {};

  const floorGeom = new THREE.PlaneGeometry(width, depth, 20, 20);
  const positions = floorGeom.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const normalizedZ = (z + depth / 2) / depth;
    const curveAmount = Math.sin(normalizedZ * Math.PI * 0.5) * curvature;
    positions.setX(i, x * (1 + curveAmount * (1 - normalizedZ)));
  }
  floorGeom.rotateX(-Math.PI / 2);
  floorGeom.translate(0, 0, depth / 2 - stageDepth);
  geometries['floor'] = floorGeom;

  const ceilingGeom = floorGeom.clone();
  ceilingGeom.translate(0, height, 0);
  geometries['ceiling'] = ceilingGeom;

  const backWallGeom = new THREE.PlaneGeometry(width, height, 20, 10);
  backWallGeom.translate(0, height / 2, depth - stageDepth);
  const backPositions = backWallGeom.attributes.position;
  for (let i = 0; i < backPositions.count; i++) {
    const x = backPositions.getX(i);
    const y = backPositions.getY(i);
    backPositions.setX(i, x * (1 + curvature));
  }
  geometries['back_wall'] = backWallGeom;

  const sideWallGeom = new THREE.PlaneGeometry(depth, height, 20, 10);
  sideWallGeom.rotateY(Math.PI / 2);
  const leftWallPositions = sideWallGeom.attributes.position;
  for (let i = 0; i < leftWallPositions.count; i++) {
    const x = leftWallPositions.getX(i);
    const z = leftWallPositions.getZ(i);
    const normalizedZ = (z + depth / 2) / depth;
    const curveAmount = Math.sin(normalizedZ * Math.PI * 0.5) * curvature;
    leftWallPositions.setX(i, x - width / 2 * (1 + curveAmount * (1 - normalizedZ)));
  }
  leftWallPositions.needsUpdate = true;
  sideWallGeom.translate(0, height / 2, depth / 2 - stageDepth);
  geometries['side_wall_left'] = sideWallGeom;

  const rightWallGeom = sideWallGeom.clone();
  const rightPositions = rightWallGeom.attributes.position;
  for (let i = 0; i < rightPositions.count; i++) {
    const x = rightPositions.getX(i);
    rightPositions.setX(i, -x);
  }
  rightPositions.needsUpdate = true;
  geometries['side_wall_right'] = rightWallGeom;

  const stageWallGeom = new THREE.PlaneGeometry(width * 0.8, height * 0.6, 10, 6);
  stageWallGeom.translate(0, height * 0.3, -stageDepth);
  geometries['stage_wall'] = stageWallGeom;

  const balconyGeom = new THREE.PlaneGeometry(width * 0.9, depth * 0.3, 15, 5);
  balconyGeom.rotateX(-Math.PI / 2);
  balconyGeom.translate(0, height * 0.6, depth * 0.3);
  geometries['balcony_front'] = balconyGeom;

  const panelGeom = new THREE.PlaneGeometry(depth * 0.4, height * 0.5, 10, 8);
  panelGeom.rotateY(Math.PI / 2);
  panelGeom.translate(-width / 2 - 0.5, height * 0.4, depth * 0.2);
  geometries['acoustic_panels_left'] = panelGeom;

  const rightPanelGeom = panelGeom.clone();
  rightPanelGeom.translate(width + 1, 0, 0);
  geometries['acoustic_panels_right'] = rightPanelGeom;

  return geometries;
};

export const generateSeatPositions = (params: {
  rows: number;
  cols: number;
  width: number;
  depth: number;
  stageDepth: number;
  curvature: number;
  startRow: number;
}): Vec3[] => {
  const { rows, cols, width, depth, stageDepth, curvature, startRow } = params;
  const seats: Vec3[] = [];
  const usableDepth = depth - stageDepth - 3;
  const rowSpacing = usableDepth / (rows + startRow);
  const seatHeightStep = 0.12;

  for (let row = 0; row < rows; row++) {
    const normalizedRow = (row + startRow) / (rows + startRow);
    const z = normalizedRow * usableDepth + stageDepth + 2;
    const curveAmount = Math.sin(normalizedRow * Math.PI * 0.5) * curvature;
    const rowWidth = width * (1 + curveAmount * (1 - normalizedRow));
    const colSpacing = rowWidth / (cols + 1);
    const y = row * seatHeightStep + 0.5;

    for (let col = 0; col < cols; col++) {
      const colNormalized = (col + 1) / (cols + 1);
      const x = (colNormalized - 0.5) * rowWidth;
      seats.push({ x, y, z });
    }
  }

  return seats;
};

export const generateRayDirections = (count: number, directivity: string): Vec3[] => {
  const directions: Vec3[] = [];
  
  if (directivity === 'omnidirectional') {
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      directions.push({ x, y, z });
    }
  } else if (directivity === 'cardioid') {
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const yRaw = 1 - (i / (count - 1)) * 2;
      const y = Math.max(0, yRaw);
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      const dir = normalize({ x, y, z: -Math.abs(z) });
      directions.push(dir);
    }
  } else {
    for (let i = 0; i < count; i++) {
      const phi = Math.PI * (3 - Math.sqrt(5));
      const t = i / count;
      const y = (t - 0.5) * 0.3;
      const radius = 0.15;
      const theta = phi * i;
      const x = Math.cos(theta) * radius;
      const z = -1 + Math.sin(theta) * radius * 0.5;
      directions.push(normalize({ x, y, z }));
    }
  }

  return directions;
};

export const getPointAtTimeOnPath = (
  path: Vec3[],
  times: number[],
  currentTime: number
): Vec3 | null => {
  if (path.length === 0) return null;
  if (currentTime <= times[0]) return path[0];
  if (currentTime >= times[times.length - 1]) return path[path.length - 1];

  for (let i = 1; i < times.length; i++) {
    if (currentTime <= times[i]) {
      const t = (currentTime - times[i - 1]) / (times[i] - times[i - 1]);
      return lerp(path[i - 1], path[i], t);
    }
  }

  return null;
};

export const getPathUpToTime = (
  path: Vec3[],
  times: number[],
  currentTime: number
): Vec3[] => {
  const result: Vec3[] = [];
  for (let i = 0; i < times.length; i++) {
    if (times[i] <= currentTime) {
      result.push(path[i]);
    } else {
      const point = getPointAtTimeOnPath(path, times, currentTime);
      if (point) result.push(point);
      break;
    }
  }
  return result;
};
