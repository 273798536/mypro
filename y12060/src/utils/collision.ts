import { ForkliftState } from '../types/forklift';
import { Shelf, ShelfCollisionBox, BlindZone } from '../types/shelf';
import { Severity } from '../types/game';

export interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export function checkAABBCollision(a: AABB, b: AABB): boolean {
  return (
    a.minX < b.maxX && a.maxX > b.minX &&
    a.minY < b.maxY && a.maxY > b.minY &&
    a.minZ < b.maxZ && a.maxZ > b.minZ
  );
}

export function getForkliftAABB(
  position: { x: number; y: number; z: number },
  forkliftLength: number,
  forkliftWidth: number,
  forkHeight: number
): AABB {
  const halfLength = forkliftLength / 2;
  const halfWidth = forkliftWidth / 2;
  
  return {
    minX: position.x - halfWidth,
    maxX: position.x + halfWidth,
    minY: position.y,
    maxY: position.y + Math.max(1.5, forkHeight + 0.5),
    minZ: position.z - halfLength,
    maxZ: position.z + halfLength
  };
}

export function getShelfCollisionBox(shelf: Shelf): ShelfCollisionBox {
  const halfWidth = shelf.width / 2;
  const halfDepth = shelf.depth / 2;
  
  return {
    id: shelf.id,
    name: shelf.name,
    minX: shelf.position.x - halfWidth,
    maxX: shelf.position.x + halfWidth,
    minY: 0,
    maxY: shelf.height,
    minZ: shelf.position.z - halfDepth,
    maxZ: shelf.position.z + halfDepth
  };
}

export function checkShelfCollision(
  forkliftAABB: AABB,
  shelves: Shelf[]
): { collided: boolean; shelf?: Shelf; severity?: Severity } {
  for (const shelf of shelves) {
    const shelfBox = getShelfCollisionBox(shelf);
    
    if (checkAABBCollision(forkliftAABB, shelfBox)) {
      const overlapX = Math.min(forkliftAABB.maxX, shelfBox.maxX) - Math.max(forkliftAABB.minX, shelfBox.minX);
      const overlapZ = Math.min(forkliftAABB.maxZ, shelfBox.maxZ) - Math.max(forkliftAABB.minZ, shelfBox.minZ);
      const overlapArea = overlapX * overlapZ;
      
      let severity: Severity = 'minor';
      if (overlapArea > 0.3) severity = 'moderate';
      if (overlapArea > 0.8) severity = 'severe';
      
      return { collided: true, shelf, severity };
    }
  }
  
  return { collided: false };
}

export function checkBlindZone(
  position: { x: number; z: number },
  blindZones: BlindZone[]
): { inZone: boolean; zone?: BlindZone; duration?: number } {
  for (const zone of blindZones) {
    const dx = position.x - zone.x;
    const dz = position.z - zone.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance < zone.radius) {
      return { inZone: true, zone };
    }
  }
  
  return { inZone: false };
}

export function checkOverHeight(
  forkHeight: number,
  maxAllowedHeight: number,
  cargoHeight: number = 1.0
): { isOver: boolean; severity?: Severity; overAmount?: number } {
  const totalHeight = forkHeight + cargoHeight;
  const overAmount = totalHeight - maxAllowedHeight;
  
  if (overAmount <= 0) {
    return { isOver: false };
  }
  
  let severity: Severity = 'minor';
  if (overAmount > 0.3) severity = 'moderate';
  if (overAmount > 0.8) severity = 'severe';
  
  return { isOver: true, severity, overAmount };
}

export function getCollisionSpeedSeverity(speed: number): Severity {
  if (speed < 5) return 'minor';
  if (speed < 10) return 'moderate';
  return 'severe';
}

export function getBlindZoneSeverity(durationMs: number): Severity {
  if (durationMs < 2000) return 'minor';
  if (durationMs < 5000) return 'moderate';
  return 'severe';
}

export function interpolateRoutePoint(
  points: Array<{ timestamp: number; position: { x: number; y: number; z: number }; rotation: number; speed: number; forkHeight: number }>,
  targetTime: number
): { position: { x: number; y: number; z: number }; rotation: number; speed: number; forkHeight: number } | null {
  if (points.length === 0) return null;
  
  if (targetTime <= points[0].timestamp) {
    return {
      position: { ...points[0].position },
      rotation: points[0].rotation,
      speed: points[0].speed,
      forkHeight: points[0].forkHeight
    };
  }
  
  if (targetTime >= points[points.length - 1].timestamp) {
    const last = points[points.length - 1];
    return {
      position: { ...last.position },
      rotation: last.rotation,
      speed: last.speed,
      forkHeight: last.forkHeight
    };
  }
  
  let left = 0;
  let right = points.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (points[mid].timestamp === targetTime) {
      return {
        position: { ...points[mid].position },
        rotation: points[mid].rotation,
        speed: points[mid].speed,
        forkHeight: points[mid].forkHeight
      };
    } else if (points[mid].timestamp < targetTime) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  const prevPoint = points[right];
  const nextPoint = points[left];
  const t = (targetTime - prevPoint.timestamp) / (nextPoint.timestamp - prevPoint.timestamp);
  
  return {
    position: {
      x: prevPoint.position.x + (nextPoint.position.x - prevPoint.position.x) * t,
      y: prevPoint.position.y + (nextPoint.position.y - prevPoint.position.y) * t,
      z: prevPoint.position.z + (nextPoint.position.z - prevPoint.position.z) * t
    },
    rotation: prevPoint.rotation + (nextPoint.rotation - prevPoint.rotation) * t,
    speed: prevPoint.speed + (nextPoint.speed - prevPoint.speed) * t,
    forkHeight: prevPoint.forkHeight + (nextPoint.forkHeight - prevPoint.forkHeight) * t
  };
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimeWithMs(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const milli = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milli.toString().padStart(2, '0')}`;
}
