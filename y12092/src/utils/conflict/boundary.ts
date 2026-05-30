import * as THREE from 'three';
import type { Camera, Conflict, ConflictEvidence, VenueObject } from '@/types';
import { computeFrustumCorners, createFrustum, pointToVector3 } from '../frustum';

export interface BoundaryCheckOptions {
  venueBounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

function createBox3FromVenueObject(obj: VenueObject): THREE.Box3 {
  const min = new THREE.Vector3(
    obj.position.x - obj.size.width / 2,
    obj.position.y - obj.size.height / 2,
    obj.position.z - obj.size.depth / 2
  );
  const max = new THREE.Vector3(
    obj.position.x + obj.size.width / 2,
    obj.position.y + obj.size.height / 2,
    obj.position.z + obj.size.depth / 2
  );
  return new THREE.Box3(min, max);
}

function frustumIntersectsBox(frustum: THREE.Frustum, box: THREE.Box3): boolean {
  return frustum.intersectsBox(box);
}

function getOutermostPoints(
  frustum: THREE.Frustum,
  box: THREE.Box3,
  camPos: THREE.Vector3
): { point: THREE.Vector3; distance: number }[] {
  const corners: THREE.Vector3[] = [];
  for (let x = 0; x <= 1; x++) {
    for (let y = 0; y <= 1; y++) {
      for (let z = 0; z <= 1; z++) {
        corners.push(
          new THREE.Vector3(
            box.min.x + x * (box.max.x - box.min.x),
            box.min.y + y * (box.max.y - box.min.y),
            box.min.z + z * (box.max.z - box.min.z)
          )
        );
      }
    }
  }
  
  return corners
    .filter(p => frustum.containsPoint(p))
    .map(p => ({
      point: p,
      distance: camPos.distanceTo(p),
    }))
    .sort((a, b) => b.distance - a.distance)
    .slice(0, 3);
}

export function checkBoundaryConflict(
  camera: Camera,
  venueObjects: VenueObject[],
  options: BoundaryCheckOptions = {}
): Conflict | null {
  const frustum = createFrustum(camera);
  const frustumCorners = computeFrustumCorners(camera);
  const camPos = pointToVector3(camera.position);
  
  const venueBounds = options.venueBounds || {
    minX: -40,
    maxX: 40,
    minY: 0,
    maxY: 30,
    minZ: -30,
    maxZ: 30,
  };
  
  const venueBox = new THREE.Box3(
    new THREE.Vector3(venueBounds.minX, venueBounds.minY, venueBounds.minZ),
    new THREE.Vector3(venueBounds.maxX, venueBounds.maxY, venueBounds.maxZ)
  );
  
  const restrictedObjects = venueObjects.filter(obj => obj.isRestricted);
  
  let worstViolation: {
    type: 'restricted' | 'out_of_bounds';
    object?: VenueObject;
    intersectionPoints: { point: THREE.Vector3; distance: number }[];
    penetrationDepth: number;
  } | null = null;
  
  for (const obj of restrictedObjects) {
    const objBox = createBox3FromVenueObject(obj);
    if (frustumIntersectsBox(frustum, objBox)) {
      const points = getOutermostPoints(frustum, objBox, camPos);
      if (points.length > 0) {
        const violation = {
          type: 'restricted' as const,
          object: obj,
          intersectionPoints: points,
          penetrationDepth: points[0]?.distance || 0,
        };
        
        if (!worstViolation || violation.penetrationDepth > worstViolation.penetrationDepth) {
          worstViolation = violation;
        }
      }
    }
  }
  
  let outOfBoundsPoints: { point: THREE.Vector3; distance: number }[] = [];
  for (const corner of frustumCorners) {
    const p = pointToVector3(corner);
    if (!venueBox.containsPoint(p)) {
      outOfBoundsPoints.push({
        point: p,
        distance: camPos.distanceTo(p),
      });
    }
  }
  
  if (outOfBoundsPoints.length > 0) {
    outOfBoundsPoints.sort((a, b) => b.distance - a.distance);
    const maxDist = outOfBoundsPoints[0].distance;
    if (!worstViolation || maxDist > worstViolation.penetrationDepth) {
      worstViolation = {
        type: 'out_of_bounds',
        intersectionPoints: outOfBoundsPoints.slice(0, 3),
        penetrationDepth: maxDist,
      };
    }
  }
  
  if (!worstViolation) {
    return null;
  }
  
  const severity = worstViolation.penetrationDepth > 10 ? 'critical' : worstViolation.penetrationDepth > 5 ? 'warning' : 'info';
  
  const evidence: ConflictEvidence[] = [
    {
      id: `ev-bound-${camera.id}`,
      type: 'frustum',
      data: {
        cameraPosition: camera.position,
        cameraRotation: camera.rotation,
        lens: camera.lens,
        frustumCorners,
        violationType: worstViolation.type,
        restrictedObject: worstViolation.object,
        intersectionPoints: worstViolation.intersectionPoints.map(p => ({
          x: p.point.x,
          y: p.point.y,
          z: p.point.z,
          distance: p.distance,
        })),
        venueBounds,
      },
      description: worstViolation.type === 'restricted'
        ? `视锥体检测：${camera.number}号机位的镜头视锥与${worstViolation.object?.name}相交，渗透深度${worstViolation.penetrationDepth.toFixed(2)}米`
        : `视锥体检测：${camera.number}号机位的镜头视锥越出场馆边界，最远越界点距离机位${worstViolation.penetrationDepth.toFixed(2)}米`,
    },
  ];
  
  let humanDescription = '';
  if (worstViolation.type === 'restricted' && worstViolation.object) {
    humanDescription = `${camera.number}号机位（${camera.name}）的镜头拍到了禁摄区域「${worstViolation.object.name}」。${
      severity === 'critical'
        ? '必须立即调整机位朝向，严禁拍摄禁摄区域'
        : severity === 'warning'
        ? '建议调整镜头焦距或朝向，避免摄入禁摄区域'
        : '注意构图，尽量减少禁摄区域入镜'
    }`;
  } else {
    humanDescription = `${camera.number}号机位（${camera.name}）的镜头越出场馆边界。${
      severity === 'critical'
        ? '必须调整机位位置或缩小拍摄范围'
        : severity === 'warning'
        ? '建议调整镜头焦距或朝向'
        : '可接受，但注意画面边缘可能超出场馆'
    }`;
  }
  
  return {
    id: `conf-bound-${camera.id}`,
    type: 'boundary',
    severity,
    cameraAId: camera.id,
    venueObjectId: worstViolation.object?.id,
    description: worstViolation.type === 'restricted'
      ? `镜头越界：${camera.number}号机位摄入禁摄区域`
      : `镜头越界：${camera.number}号机位视锥越出场馆`,
    humanDescription,
    status: 'pending',
    detectedAt: new Date().toISOString(),
    evidence,
  };
}

export function detectAllBoundaryConflicts(
  cameras: Camera[],
  venueObjects: VenueObject[],
  options: BoundaryCheckOptions = {}
): Conflict[] {
  const conflicts: Conflict[] = [];
  
  for (const camera of cameras) {
    const conflict = checkBoundaryConflict(camera, venueObjects, options);
    if (conflict) {
      conflicts.push(conflict);
    }
  }
  
  return conflicts;
}
