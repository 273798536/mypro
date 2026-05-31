import * as THREE from 'three';
import type { Cable, EquipmentBox, Route, Conflict, ConflictType } from '@/types';
import { conflicts as mockConflicts } from '@/data/mockConflicts';

export function detectCableCrossings(cables: Cable[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const threshold = 0.2;

  for (let i = 0; i < cables.length; i++) {
    for (let j = i + 1; j < cables.length; j++) {
      const cableA = cables[i];
      const cableB = cables[j];

      for (let a = 0; a < cableA.pathPoints.length - 1; a++) {
        for (let b = 0; b < cableB.pathPoints.length - 1; b++) {
          const p1 = new THREE.Vector3(...cableA.pathPoints[a]);
          const p2 = new THREE.Vector3(...cableA.pathPoints[a + 1]);
          const p3 = new THREE.Vector3(...cableB.pathPoints[b]);
          const p4 = new THREE.Vector3(...cableB.pathPoints[b + 1]);

          const distance = lineLineDistance(p1, p2, p3, p4);

          if (distance < threshold) {
            const midPoint = new THREE.Vector3()
              .addVectors(p1, p2)
              .multiplyScalar(0.5);

            conflicts.push({
              id: `detected_cross_${i}_${j}_${a}_${b}`,
              type: 'cable_cross',
              severity: 'critical',
              timestamp: (a / cableA.pathPoints.length) * 60,
              objectIds: [cableA.id, cableB.id],
              description: `cable_cross between ${cableA.name} and ${cableB.name} at (${midPoint.x.toFixed(1)}, ${midPoint.y.toFixed(1)}, ${midPoint.z.toFixed(1)})`,
              humanReadableDesc: `${cableA.name}和${cableB.name}在空中交叉了，距离仅${distance.toFixed(2)}米，可能产生信号干扰`,
              traceRecords: [],
              screenshotIds: [],
              resolved: false,
            });
          }
        }
      }
    }
  }

  return conflicts;
}

export function detectEquipmentBlockages(
  cables: Cable[],
  equipment: EquipmentBox[]
): Conflict[] {
  const conflicts: Conflict[] = [];

  for (const cable of cables) {
    for (const equip of equipment) {
      const equipPos = new THREE.Vector3(...equip.position);
      const equipRadius = Math.max(equip.scale[0], equip.scale[1], equip.scale[2]) / 2 + 0.3;

      for (let i = 0; i < cable.pathPoints.length - 1; i++) {
        const p1 = new THREE.Vector3(...cable.pathPoints[i]);
        const p2 = new THREE.Vector3(...cable.pathPoints[i + 1]);

        const lineVec = new THREE.Vector3().subVectors(p2, p1);
        const toPointVec = new THREE.Vector3().subVectors(equipPos, p1);
        const lineLen = lineVec.length();
        const lineDir = lineVec.normalize();

        const projection = toPointVec.dot(lineDir);
        const closestPoint = new THREE.Vector3();

        if (projection <= 0) {
          closestPoint.copy(p1);
        } else if (projection >= lineLen) {
          closestPoint.copy(p2);
        } else {
          closestPoint.copy(lineDir).multiplyScalar(projection).add(p1);
        }

        const distance = equipPos.distanceTo(closestPoint);

        if (distance < equipRadius) {
          conflicts.push({
            id: `detected_block_${cable.id}_${equip.id}_${i}`,
            type: 'equipment_block',
            severity: distance < equipRadius * 0.5 ? 'critical' : 'warning',
            timestamp: (i / cable.pathPoints.length) * 60,
            objectIds: [cable.id, equip.id],
            description: `equipment_block ${cable.name} by ${equip.name}, distance: ${distance.toFixed(2)}m`,
            humanReadableDesc: `${equip.name}挡住了${cable.name}的路径，距离仅${distance.toFixed(2)}米，需要调整位置`,
            traceRecords: [],
            screenshotIds: [],
            resolved: false,
          });
        }
      }
    }
  }

  return conflicts;
}

export function detectRouteConflicts(routes: Route[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const safeDistance = 0.6;

  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      const routeA = routes[i];
      const routeB = routes[j];

      const maxTime = Math.max(
        routeA.timestamps[routeA.timestamps.length - 1],
        routeB.timestamps[routeB.timestamps.length - 1]
      );

      for (let t = 0; t <= maxTime; t += 0.5) {
        const posA = getPositionAtTime(routeA, t);
        const posB = getPositionAtTime(routeB, t);

        if (!posA || !posB) continue;

        const distance = posA.distanceTo(posB);

        if (distance < safeDistance) {
          conflicts.push({
            id: `detected_route_${i}_${j}_${t}`,
            type: 'route_conflict',
            severity: distance < 0.4 ? 'critical' : 'warning',
            timestamp: t,
            objectIds: [routeA.musicianId, routeB.musicianId],
            description: `route_conflict at t=${t}s, distance: ${distance.toFixed(2)}m`,
            humanReadableDesc: `第${t.toFixed(1)}秒时，${routeA.name.split('走')[0]}和${routeB.name.split('走')[0]}距离仅${distance.toFixed(2)}米，容易发生碰撞`,
            traceRecords: [],
            screenshotIds: [],
            resolved: false,
          });
        }
      }
    }
  }

  return conflicts;
}

export function getAllConflicts(): Conflict[] {
  return mockConflicts;
}

export function getConflictsAtTime(
  conflicts: Conflict[],
  time: number,
  tolerance: number = 1
): Conflict[] {
  return conflicts.filter(
    (c) => Math.abs(c.timestamp - time) <= tolerance && !c.resolved
  );
}

export function getConflictsByType(
  conflicts: Conflict[],
  types: ConflictType[]
): Conflict[] {
  return conflicts.filter((c) => types.includes(c.type));
}

export function getActiveConflicts(
  conflicts: Conflict[],
  currentTime: number,
  filterTypes: ConflictType[],
  timeRange: [number, number]
): Conflict[] {
  return conflicts.filter(
    (c) =>
      !c.resolved &&
      filterTypes.includes(c.type) &&
      c.timestamp >= timeRange[0] &&
      c.timestamp <= timeRange[1]
  );
}

function lineLineDistance(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3,
  p4: THREE.Vector3
): number {
  const v1 = new THREE.Vector3().subVectors(p2, p1);
  const v2 = new THREE.Vector3().subVectors(p4, p3);
  const v3 = new THREE.Vector3().subVectors(p1, p3);

  const d1v1 = v1.dot(v1);
  const d1v2 = v1.dot(v2);
  const d1v3 = v1.dot(v3);
  const d2v2 = v2.dot(v2);
  const d2v3 = v2.dot(v3);

  const denom = d1v1 * d2v2 - d1v2 * d1v2;

  if (Math.abs(denom) < 1e-10) {
    return p1.distanceTo(p3);
  }

  const t = (d1v2 * d2v3 - d2v2 * d1v3) / denom;
  const s = (d1v1 * d2v3 - d1v2 * d1v3) / denom;

  const clampT = Math.max(0, Math.min(1, t));
  const clampS = Math.max(0, Math.min(1, s));

  const pointOnLine1 = new THREE.Vector3().copy(v1).multiplyScalar(clampT).add(p1);
  const pointOnLine2 = new THREE.Vector3().copy(v2).multiplyScalar(clampS).add(p3);

  return pointOnLine1.distanceTo(pointOnLine2);
}

function getPositionAtTime(route: Route, time: number): THREE.Vector3 | null {
  if (time < route.timestamps[0] || time > route.timestamps[route.timestamps.length - 1]) {
    return null;
  }

  for (let i = 0; i < route.timestamps.length - 1; i++) {
    if (time >= route.timestamps[i] && time <= route.timestamps[i + 1]) {
      const t =
        (time - route.timestamps[i]) /
        (route.timestamps[i + 1] - route.timestamps[i]);
      const p1 = new THREE.Vector3(...route.waypoints[i]);
      const p2 = new THREE.Vector3(...route.waypoints[i + 1]);
      return new THREE.Vector3().lerpVectors(p1, p2, t);
    }
  }

  return null;
}
