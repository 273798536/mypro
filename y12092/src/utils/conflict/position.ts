import type { Camera, Conflict, ConflictEvidence } from '@/types';
import { distance, distanceXZ } from '../frustum';

const SAFE_DISTANCE = 1.5;
const OPERATING_SPACE = 0.8;

export function checkPositionConflict(
  cameraA: Camera,
  cameraB: Camera
): Conflict | null {
  const dist = distance(cameraA.position, cameraB.position);
  const distXZ = distanceXZ(cameraA.position, cameraB.position);
  
  if (dist >= SAFE_DISTANCE) {
    return null;
  }
  
  const operatingOverlap = OPERATING_SPACE * 2 - distXZ;
  const severity = operatingOverlap > 0.5 ? 'critical' : operatingOverlap > 0.2 ? 'warning' : 'info';
  
  const evidence: ConflictEvidence[] = [
    {
      id: `ev-pos-${cameraA.id}-${cameraB.id}`,
      type: 'distance',
      data: {
        distance: dist,
        distanceXZ: distXZ,
        safeDistance: SAFE_DISTANCE,
        operatingSpace: OPERATING_SPACE,
        operatingOverlap: Math.max(0, operatingOverlap),
        positionA: cameraA.position,
        positionB: cameraB.position,
      },
      description: `机位间距计算：3D距离=${dist.toFixed(2)}米，水平距离=${distXZ.toFixed(2)}米，安全阈值=${SAFE_DISTANCE}米`,
    },
  ];
  
  const humanDescription = operatingOverlap > 0
    ? `${cameraA.number}号机位与${cameraB.number}号机位相距仅${dist.toFixed(2)}米，小于安全距离${SAFE_DISTANCE}米，操作空间重叠${operatingOverlap.toFixed(2)}米，摄像师无法正常作业`
    : `${cameraA.number}号机位与${cameraB.number}号机位相距${dist.toFixed(2)}米，略小于安全距离${SAFE_DISTANCE}米，建议微调其中一个机位位置`;
  
  return {
    id: `conf-pos-${cameraA.id}-${cameraB.id}`,
    type: 'position',
    severity,
    cameraAId: cameraA.id,
    cameraBId: cameraB.id,
    description: `位置冲突：${cameraA.number}与${cameraB.number}间距不足`,
    humanDescription,
    status: 'pending',
    detectedAt: new Date().toISOString(),
    evidence,
  };
}

export function detectAllPositionConflicts(cameras: Camera[]): Conflict[] {
  const conflicts: Conflict[] = [];
  
  for (let i = 0; i < cameras.length; i++) {
    for (let j = i + 1; j < cameras.length; j++) {
      const conflict = checkPositionConflict(cameras[i], cameras[j]);
      if (conflict) {
        conflicts.push(conflict);
      }
    }
  }
  
  return conflicts;
}
