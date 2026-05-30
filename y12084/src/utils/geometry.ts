import { Building, RoadEdge, WindCorridor } from '@/types';

export function calculateOverlapArea(a: Building, b: Building): number {
  const aMinX = a.position[0] - a.dimensions[0] / 2;
  const aMaxX = a.position[0] + a.dimensions[0] / 2;
  const aMinZ = a.position[2] - a.dimensions[2] / 2;
  const aMaxZ = a.position[2] + a.dimensions[2] / 2;

  const bMinX = b.position[0] - b.dimensions[0] / 2;
  const bMaxX = b.position[0] + b.dimensions[0] / 2;
  const bMinZ = b.position[2] - b.dimensions[2] / 2;
  const bMaxZ = b.position[2] + b.dimensions[2] / 2;

  const overlapX = Math.max(0, Math.min(aMaxX, bMaxX) - Math.max(aMinX, bMinX));
  const overlapZ = Math.max(0, Math.min(aMaxZ, bMaxZ) - Math.max(aMinZ, bMinZ));

  return overlapX * overlapZ;
}

export function distancePointToLine(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number
): number {
  const A = px - x1;
  const B = pz - z1;
  const C = x2 - x1;
  const D = z2 - z1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = lenSq !== 0 ? dot / lenSq : -1;

  let xx, zz;

  if (param < 0) {
    xx = x1;
    zz = z1;
  } else if (param > 1) {
    xx = x2;
    zz = z2;
  } else {
    xx = x1 + param * C;
    zz = z1 + param * D;
  }

  const dx = px - xx;
  const dz = pz - zz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function calculateDistanceToRoad(building: Building, road: RoadEdge): number {
  const corners = getBuildingCorners(building);
  let minDistance = Infinity;

  for (const corner of corners) {
    const dist = distancePointToLine(
      corner[0],
      corner[2],
      road.start[0],
      road.start[2],
      road.end[0],
      road.end[2]
    );
    minDistance = Math.min(minDistance, dist);
  }

  return minDistance;
}

export function getBuildingCorners(building: Building): [number, number, number][] {
  const [bx, , bz] = building.position;
  const [w, , d] = building.dimensions;
  const halfW = w / 2;
  const halfD = d / 2;

  return [
    [bx - halfW, 0, bz - halfD],
    [bx + halfW, 0, bz - halfD],
    [bx + halfW, 0, bz + halfD],
    [bx - halfW, 0, bz + halfD]
  ];
}

export function isPointInCorridor(
  px: number,
  pz: number,
  corridor: WindCorridor,
  padding: number = 0
): boolean {
  const halfWidth = (corridor.width + padding) / 2;

  for (let i = 0; i < corridor.path.length - 1; i++) {
    const [x1, , z1] = corridor.path[i];
    const [x2, , z2] = corridor.path[i + 1];

    const dist = distancePointToLine(px, pz, x1, z1, x2, z2);
    if (dist <= halfWidth) {
      return true;
    }
  }

  return false;
}

export function findBlockingBuildings(
  corridor: WindCorridor,
  buildings: Building[]
): Building[] {
  return buildings.filter(building => {
    const corners = getBuildingCorners(building);
    return corners.some(corner =>
      isPointInCorridor(corner[0], corner[2], corridor, 5)
    );
  });
}

export function calculateWindGap(
  building: Building,
  corridor: WindCorridor,
  windRose: { directions: { angle: number; frequency: number }[] }
): number {
  const corridorAngle = calculateCorridorAngle(corridor);

  let totalFrequency = 0;
  let blockedFrequency = 0;

  for (const dir of windRose.directions) {
    totalFrequency += dir.frequency;

    const angleDiff = Math.abs(dir.angle - corridorAngle);
    const normalizedDiff = Math.min(angleDiff, 360 - angleDiff);

    if (normalizedDiff <= 30) {
      const buildingInfluence = calculateBuildingInfluence(building, corridor, dir.angle);
      blockedFrequency += dir.frequency * buildingInfluence;
    }
  }

  return totalFrequency > 0 ? (blockedFrequency / totalFrequency) * 180 : 0;
}

function calculateCorridorAngle(corridor: WindCorridor): number {
  if (corridor.path.length < 2) return 0;

  const [x1, , z1] = corridor.path[0];
  const [x2, , z2] = corridor.path[corridor.path.length - 1];

  const dx = x2 - x1;
  const dz = z2 - z1;

  let angle = Math.atan2(dx, dz) * (180 / Math.PI);
  if (angle < 0) angle += 360;

  return angle;
}

function calculateBuildingInfluence(
  building: Building,
  corridor: WindCorridor,
  windAngle: number
): number {
  const corridorAngle = calculateCorridorAngle(corridor);
  const angleDiff = Math.abs(windAngle - corridorAngle);
  const normalizedDiff = Math.min(angleDiff, 360 - angleDiff);

  const angleFactor = Math.max(0, 1 - normalizedDiff / 30);

  const heightFactor = Math.min(1, building.height / 100);

  const distance = Math.sqrt(
    Math.pow(building.position[0] - corridor.path[Math.floor(corridor.path.length / 2)][0], 2) +
    Math.pow(building.position[2] - corridor.path[Math.floor(corridor.path.length / 2)][2], 2)
  );
  const distanceFactor = Math.max(0, 1 - distance / 100);

  return angleFactor * heightFactor * distanceFactor * 0.8;
}

export function formatValue(value: any): string {
  if (Array.isArray(value)) {
    return `[${value.map(v => formatValue(v)).join(', ')}]`;
  }
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  return String(value);
}
