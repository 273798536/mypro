import { Obstacle, JointTransform } from '@/types';
import * as THREE from 'three';

export interface Capsule {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
}

export interface CollisionResult {
  hasCollision: boolean;
  obstacleId?: string;
  distance: number;
  details: string;
}

function pointToBoxDistance(
  point: THREE.Vector3,
  boxMin: THREE.Vector3,
  boxMax: THREE.Vector3
): number {
  const clamped = new THREE.Vector3(
    Math.max(boxMin.x, Math.min(point.x, boxMax.x)),
    Math.max(boxMin.y, Math.min(point.y, boxMax.y)),
    Math.max(boxMin.z, Math.min(point.z, boxMax.z))
  );
  return point.distanceTo(clamped);
}

function pointToSphereDistance(
  point: THREE.Vector3,
  center: THREE.Vector3,
  radius: number
): number {
  return Math.max(0, point.distanceTo(center) - radius);
}

function capsuleToBoxCollision(
  capsule: Capsule,
  obstacle: Obstacle
): { hasCollision: boolean; distance: number } {
  const obstacleCenter = new THREE.Vector3(...obstacle.position);
  const obstacleSize = new THREE.Vector3(...obstacle.size);
  const obstacleRotation = new THREE.Euler(...obstacle.rotation);

  const boxMin = obstacleCenter.clone().sub(obstacleSize.clone().multiplyScalar(0.5));
  const boxMax = obstacleCenter.clone().add(obstacleSize.clone().multiplyScalar(0.5));

  const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(obstacleRotation);
  const inverseRotation = rotationMatrix.clone().invert();

  const startLocal = capsule.start.clone().applyMatrix4(inverseRotation);
  const endLocal = capsule.end.clone().applyMatrix4(inverseRotation);

  const axis = endLocal.clone().sub(startLocal).normalize();
  const length = startLocal.distanceTo(endLocal);

  let minDistance = Infinity;
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const samplePoint = startLocal.clone().add(axis.clone().multiplyScalar(t * length));
    const dist = pointToBoxDistance(samplePoint, boxMin, boxMax);
    minDistance = Math.min(minDistance, dist);
  }

  return {
    hasCollision: minDistance <= capsule.radius,
    distance: minDistance - capsule.radius,
  };
}

function capsuleToSphereCollision(
  capsule: Capsule,
  obstacle: Obstacle
): { hasCollision: boolean; distance: number } {
  const center = new THREE.Vector3(...obstacle.position);
  const radius = obstacle.size[0] / 2;

  const axis = capsule.end.clone().sub(capsule.start).normalize();
  const length = capsule.start.distanceTo(capsule.end);

  const toCenter = center.clone().sub(capsule.start);
  const projection = toCenter.dot(axis);
  const clampedProjection = Math.max(0, Math.min(length, projection));
  const closestPoint = capsule.start.clone().add(axis.clone().multiplyScalar(clampedProjection));

  const distance = closestPoint.distanceTo(center);

  return {
    hasCollision: distance <= (radius + capsule.radius),
    distance: distance - radius - capsule.radius,
  };
}

export function createArmCapsules(
  transforms: JointTransform[],
  linkLengths: number[]
): Capsule[] {
  const capsules: Capsule[] = [];
  const basePosition = new THREE.Vector3(0, 0, 0);

  for (let i = 0; i < transforms.length; i++) {
    const jointPos = new THREE.Vector3(...transforms[i].position);
    const start = i === 0 ? basePosition : new THREE.Vector3(...transforms[i - 1].position);
    const end = jointPos;

    const radius = 0.05 + (linkLengths[i] || 0.1) * 0.05;

    capsules.push({ start, end, radius });
  }

  return capsules;
}

export function checkCollision(
  capsules: Capsule[],
  obstacles: Obstacle[]
): { hasCollision: boolean; results: CollisionResult[]; minDistance: number } {
  const results: CollisionResult[] = [];
  let hasCollision = false;
  let minDistance = Infinity;

  for (const obstacle of obstacles) {
    for (let i = 0; i < capsules.length; i++) {
      const capsule = capsules[i];
      let collisionResult;

      if (obstacle.type === 'box') {
        collisionResult = capsuleToBoxCollision(capsule, obstacle);
      } else if (obstacle.type === 'sphere') {
        collisionResult = capsuleToSphereCollision(capsule, obstacle);
      } else {
        continue;
      }

      minDistance = Math.min(minDistance, collisionResult.distance);

      if (collisionResult.hasCollision) {
        hasCollision = true;
        results.push({
          hasCollision: true,
          obstacleId: obstacle.id,
          distance: collisionResult.distance,
          details: `连杆 ${i + 1} 与障碍物碰撞`,
        });
      }
    }
  }

  if (results.length === 0) {
    results.push({
      hasCollision: false,
      distance: minDistance,
      details: '无碰撞',
    });
  }

  return { hasCollision, results, minDistance: Math.max(0, minDistance) };
}

export function checkSelfCollision(capsules: Capsule[]): boolean {
  const collisionThreshold = 0.01;

  for (let i = 0; i < capsules.length; i++) {
    for (let j = i + 2; j < capsules.length; j++) {
      const cap1 = capsules[i];
      const cap2 = capsules[j];

      const dist1 = cap1.start.distanceTo(cap2.start);
      const dist2 = cap1.start.distanceTo(cap2.end);
      const dist3 = cap1.end.distanceTo(cap2.start);
      const dist4 = cap1.end.distanceTo(cap2.end);

      const minDist = Math.min(dist1, dist2, dist3, dist4);
      const minRadius = Math.min(cap1.radius, cap2.radius) * 2;

      if (minDist < minRadius - collisionThreshold) {
        return true;
      }
    }
  }

  return false;
}
