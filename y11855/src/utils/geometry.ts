import * as THREE from 'three';
import type { Building, ClearanceSurface, CollisionResult } from '../types';

export function getBuildingCorners(building: Building): [number, number, number][] {
  const [px, py, pz] = building.position;
  const [fw, fd] = building.footprint;
  const halfW = fw / 2;
  const halfD = fd / 2;
  
  return [
    [px - halfW, py - halfD, pz],
    [px + halfW, py - halfD, pz],
    [px + halfW, py + halfD, pz],
    [px - halfW, py + halfD, pz],
    [px - halfW, py - halfD, pz + building.height],
    [px + halfW, py - halfD, pz + building.height],
    [px + halfW, py + halfD, pz + building.height],
    [px - halfW, py + halfD, pz + building.height]
  ];
}

export function getBuildingTopCenter(building: Building): [number, number, number] {
  const [px, py, pz] = building.position;
  return [px, py, pz + building.height];
}

export function pointInPolygon2D(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    if (((yi > point[1]) !== (yj > point[1])) &&
        (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

export function getSurfaceHeightAtPoint(
  surface: ClearanceSurface,
  x: number,
  y: number
): number | null {
  const boundary2D = surface.boundaryPoints.map(p => [p[0], p[1]] as [number, number]);
  
  if (!pointInPolygon2D([x, y], boundary2D)) {
    return null;
  }
  
  const points = surface.boundaryPoints;
  if (points.length < 3) return null;
  
  let totalHeight = 0;
  let totalWeight = 0;
  
  for (const point of points) {
    const [px, py, pz] = point;
    const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
    const weight = dist < 0.001 ? 1000 : 1 / dist;
    totalHeight += pz * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? totalHeight / totalWeight : surface.maxHeight;
}

export function checkBuildingSurfaceCollision(
  building: Building,
  surface: ClearanceSurface
): CollisionResult | null {
  const [bx, by] = building.position;
  
  const surfaceHeight = getSurfaceHeightAtPoint(surface, bx, by);
  if (surfaceHeight === null) return null;
  
  const buildingTop = building.position[2] + building.height;
  const exceeded = buildingTop - surfaceHeight;
  
  if (exceeded > 0.1) {
    return {
      buildingId: building.id,
      surfaceId: surface.id,
      exceededHeight: exceeded,
      distance: 0
    };
  }
  
  const corners = getBuildingCorners(building).slice(0, 4);
  let minDist = Infinity;
  
  for (const corner of corners) {
    const ch = getSurfaceHeightAtPoint(surface, corner[0], corner[1]);
    if (ch !== null) {
      const dist = Math.abs(corner[2] - ch);
      minDist = Math.min(minDist, dist);
      if (corner[2] > ch) {
        return {
          buildingId: building.id,
          surfaceId: surface.id,
          exceededHeight: corner[2] - ch,
          distance: 0
        };
      }
    }
  }
  
  return null;
}

export function checkAllCollisions(
  buildings: Building[],
  surfaces: ClearanceSurface[]
): CollisionResult[] {
  const results: CollisionResult[] = [];
  
  for (const building of buildings) {
    for (const surface of surfaces) {
      const collision = checkBuildingSurfaceCollision(building, surface);
      if (collision) {
        results.push(collision);
      }
    }
  }
  
  return results;
}

export function surfaceToShape(surface: ClearanceSurface): THREE.Shape {
  const shape = new THREE.Shape();
  const points = surface.boundaryPoints;
  
  if (points.length >= 1) {
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i][0], points[i][1]);
    }
    shape.closePath();
  }
  
  return shape;
}

export function pointsToBufferGeometry(points: [number, number, number][]): THREE.BufferGeometry {
  const positions = new Float32Array(points.length * 3);
  
  for (let i = 0; i < points.length; i++) {
    positions[i * 3] = points[i][0];
    positions[i * 3 + 1] = points[i][2];
    positions[i * 3 + 2] = points[i][1];
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  
  return geometry;
}

export function rotatePoint(
  point: [number, number],
  center: [number, number],
  angleDeg: number
): [number, number] {
  const angleRad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  
  const dx = point[0] - center[0];
  const dy = point[1] - center[1];
  
  return [
    center[0] + dx * cos - dy * sin,
    center[1] + dx * sin + dy * cos
  ];
}
