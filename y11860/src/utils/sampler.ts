import {
  DHParameter,
  SamplePoint,
  PointStatus,
  ConflictSource,
  JointConfig,
  Obstacle,
  WorkspaceResult,
} from '@/types';
import {
  computeForwardKinematics,
  computeJacobian,
  computeManipulability,
  isSingular,
  checkJointLimits,
} from './kinematics';
import { createArmCapsules, checkCollision } from './collision';
import * as THREE from 'three';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function quaternionFromEuler(euler: THREE.Euler): [number, number, number, number] {
  const quat = new THREE.Quaternion().setFromEuler(euler);
  return [quat.x, quat.y, quat.z, quat.w];
}

export interface SampleOptions {
  resolution?: number;
  includeJointLimitViolations?: boolean;
}

export function monteCarloSample(
  jointConfig: JointConfig,
  obstacles: Obstacle[],
  options: SampleOptions = {}
): SamplePoint[] {
  const { resolution = 500 } = options;
  const { dhParameters, jointLimits, linkLengths } = jointConfig;
  const samplePoints: SamplePoint[] = [];

  for (let i = 0; i < resolution; i++) {
    const jointAngles = jointLimits.map(limit => {
      const range = limit.max - limit.min;
      return limit.min + Math.random() * range;
    });

    const point = evaluatePoint(jointAngles, dhParameters, jointLimits, linkLengths, obstacles);
    samplePoints.push(point);
  }

  return samplePoints;
}

export function gridSample(
  jointConfig: JointConfig,
  obstacles: Obstacle[],
  options: SampleOptions = {}
): SamplePoint[] {
  const { resolution = 8 } = options;
  const { dhParameters, jointLimits, linkLengths } = jointConfig;
  const samplePoints: SamplePoint[] = [];

  const stepsPerJoint = Math.ceil(Math.pow(resolution, 1 / jointLimits.length));

  function generateCombinations(
    current: number[],
    depth: number,
    callback: (angles: number[]) => void
  ) {
    if (depth === jointLimits.length) {
      callback([...current]);
      return;
    }

    const limit = jointLimits[depth];
    const stepSize = (limit.max - limit.min) / (stepsPerJoint - 1);

    for (let i = 0; i < stepsPerJoint; i++) {
      const angle = limit.min + i * stepSize;
      current[depth] = angle;
      generateCombinations(current, depth + 1, callback);
    }
  }

  generateCombinations([], 0, (jointAngles) => {
    const point = evaluatePoint(jointAngles, dhParameters, jointLimits, linkLengths, obstacles);
    samplePoints.push(point);
  });

  return samplePoints;
}

export function evaluatePoint(
  jointAngles: number[],
  dhParameters: DHParameter[],
  jointLimits: Array<{ min: number; max: number }>,
  linkLengths: number[],
  obstacles: Obstacle[]
): SamplePoint {
  const id = generateId();
  const timestamp = Date.now();

  const transforms = computeForwardKinematics(dhParameters, jointAngles);
  const endTransform = transforms[transforms.length - 1];
  const endEuler = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion(...endTransform.rotation)
  );

  const jacobian = computeJacobian(dhParameters, jointAngles);
  const manipulability = computeManipulability(jacobian);
  const singular = isSingular(jacobian);

  const jointLimitViolations = checkJointLimits(jointAngles, jointLimits);
  const capsules = createArmCapsules(transforms, linkLengths);
  const collisionResult = checkCollision(capsules, obstacles);

  const conflictSources: ConflictSource[] = [];
  let status: PointStatus = 'reachable';

  if (jointLimitViolations.length > 0) {
    status = 'joint_limit';
    for (const violation of jointLimitViolations) {
      conflictSources.push({
        type: 'joint_limit',
        jointIndex: violation.jointIndex,
        severity: 'error',
        details: `关节 ${violation.jointIndex + 1}: ${(violation.current * 180 / Math.PI).toFixed(1)}° 超出范围 [${(violation.min * 180 / Math.PI).toFixed(1)}°, ${(violation.max * 180 / Math.PI).toFixed(1)}°]`,
      });
    }
  }

  if (collisionResult.hasCollision) {
    status = 'collision';
    for (const cr of collisionResult.results) {
      if (cr.hasCollision) {
        conflictSources.push({
          type: 'collision',
          obstacleId: cr.obstacleId,
          severity: 'error',
          details: cr.details,
        });
      }
    }
  }

  if (singular && !collisionResult.hasCollision && jointLimitViolations.length === 0) {
    status = 'singularity';
    conflictSources.push({
      type: 'singularity',
      severity: 'warning',
      details: `奇异位形，可操纵度: ${manipulability.toFixed(6)}`,
    });
  }

  const distanceToObstacle = collisionResult.minDistance;

  const cartesianPosition: [number, number, number] = [
    endTransform.position[0],
    endTransform.position[1],
    endTransform.position[2],
  ];

  const cartesianOrientation: [number, number, number, number] = quaternionFromEuler(endEuler);

  return {
    id,
    jointAngles,
    cartesianPosition,
    cartesianOrientation,
    status,
    conflictSources,
    manipulability,
    distanceToObstacle,
    timestamp,
  };
}

export function createWorkspaceResult(
  samplePoints: SamplePoint[],
  jointConfig: JointConfig,
  obstacles: Obstacle[]
): WorkspaceResult {
  const statistics = {
    total: samplePoints.length,
    reachable: samplePoints.filter(p => p.status === 'reachable').length,
    collision: samplePoints.filter(p => p.status === 'collision').length,
    singularity: samplePoints.filter(p => p.status === 'singularity').length,
    jointLimit: samplePoints.filter(p => p.status === 'joint_limit').length,
  };

  return {
    id: generateId(),
    samplePoints,
    jointConfig,
    obstacles,
    statistics,
    createdAt: Date.now(),
  };
}

export function computeDiff(
  before: WorkspaceResult,
  after: WorkspaceResult
): { added: string[]; removed: string[]; changed: string[] } {
  const beforeMap = new Map(before.samplePoints.map(p => [p.id, p]));
  const afterMap = new Map(after.samplePoints.map(p => [p.id, p]));

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  const beforeKeys = new Set(beforeMap.keys());
  const afterKeys = new Set(afterMap.keys());

  for (const id of afterKeys) {
    if (!beforeKeys.has(id)) {
      added.push(id);
    } else {
      const beforePoint = beforeMap.get(id)!;
      const afterPoint = afterMap.get(id)!;
      if (beforePoint.status !== afterPoint.status ||
          beforePoint.manipulability !== afterPoint.manipulability ||
          beforePoint.distanceToObstacle !== afterPoint.distanceToObstacle) {
        changed.push(id);
      }
    }
  }

  for (const id of beforeKeys) {
    if (!afterKeys.has(id)) {
      removed.push(id);
    }
  }

  return { added, removed, changed };
}

export function filterSamplePoints(
  samplePoints: SamplePoint[],
  filters: {
    status?: string[];
    jointIndices?: number[];
    conflictTypes?: string[];
    manipulabilityRange?: [number, number];
  }
): SamplePoint[] {
  return samplePoints.filter(point => {
    if (filters.status && filters.status.length > 0 && !filters.status.includes(point.status)) {
      return false;
    }

    if (filters.jointIndices && filters.jointIndices.length > 0) {
      const hasMatchingJoint = point.conflictSources.some(
        cs => cs.jointIndex !== undefined && filters.jointIndices!.includes(cs.jointIndex)
      );
      if (!hasMatchingJoint) {
        return false;
      }
    }

    if (filters.conflictTypes && filters.conflictTypes.length > 0) {
      const hasMatchingType = point.conflictSources.some(
        cs => filters.conflictTypes!.includes(cs.type)
      );
      if (!hasMatchingType) {
        return false;
      }
    }

    if (filters.manipulabilityRange) {
      const [min, max] = filters.manipulabilityRange;
      if (point.manipulability < min || point.manipulability > max) {
        return false;
      }
    }

    return true;
  });
}
