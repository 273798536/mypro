import type { Camera, Conflict, ConflictEvidence, VenueObject, Vector3 } from '@/types';
import { checkLineOfSight, getCameraLookTarget } from '../raycast';
import { pointToVector3 } from '../frustum';

export interface OcclusionCheckOptions {
  targetPoints?: Vector3[];
}

export function checkOcclusionConflict(
  camera: Camera,
  venueObjects: VenueObject[],
  options: OcclusionCheckOptions = {}
): Conflict | null {
  const targetPoints = options.targetPoints || [
    { x: 0, y: 1, z: 0 },
    getCameraLookTarget(camera),
  ];
  
  let worstOcclusion: {
    blocked: boolean;
    blockingObject?: VenueObject;
    occlusionRatio?: number;
    target: Vector3;
  } | null = null;
  
  for (const target of targetPoints) {
    const result = checkLineOfSight(camera, target, venueObjects);
    if (result.blocked && result.occlusionRatio) {
      if (!worstOcclusion || result.occlusionRatio < worstOcclusion.occlusionRatio) {
        worstOcclusion = { ...result, target };
      }
    }
  }
  
  if (!worstOcclusion || !worstOcclusion.blockingObject || worstOcclusion.occlusionRatio === undefined) {
    return null;
  }
  
  const ratio = worstOcclusion.occlusionRatio;
  const severity = ratio < 0.3 ? 'critical' : ratio < 0.6 ? 'warning' : 'info';
  
  const evidence: ConflictEvidence[] = [
    {
      id: `ev-occ-${camera.id}`,
      type: 'raycast',
      data: {
        cameraPosition: camera.position,
        targetPoint: worstOcclusion.target,
        blockingObject: worstOcclusion.blockingObject,
        occlusionRatio: ratio,
        blockingPosition: worstOcclusion.blockingObject.position,
        blockingSize: worstOcclusion.blockingObject.size,
      },
      description: `射线检测：从机位${camera.number}到目标点(${worstOcclusion.target.x.toFixed(1)}, ${worstOcclusion.target.y.toFixed(1)}, ${worstOcclusion.target.z.toFixed(1)})的视线在${(ratio * 100).toFixed(1)}%处被${worstOcclusion.blockingObject.name}阻挡`,
    },
  ];
  
  const severityText = severity === 'critical' ? '严重' : severity === 'warning' ? '中等' : '轻微';
  const humanDescription = `${camera.number}号机位（${camera.name}）的视线被${worstOcclusion.blockingObject.name}${severityText}遮挡，遮挡比例约${((1 - ratio) * 100).toFixed(0)}%。建议：${
    severity === 'critical'
      ? '必须调整机位位置或升高三脚架高度'
      : severity === 'warning'
      ? '建议调整机位角度或更换拍摄位置'
      : '可接受，但需注意构图'
  }`;
  
  return {
    id: `conf-occ-${camera.id}`,
    type: 'occlusion',
    severity,
    cameraAId: camera.id,
    venueObjectId: worstOcclusion.blockingObject.id,
    description: `视线遮挡：${camera.number}号机位被${worstOcclusion.blockingObject.name}阻挡`,
    humanDescription,
    status: 'pending',
    detectedAt: new Date().toISOString(),
    evidence,
  };
}

export function detectAllOcclusionConflicts(
  cameras: Camera[],
  venueObjects: VenueObject[],
  options: OcclusionCheckOptions = {}
): Conflict[] {
  const conflicts: Conflict[] = [];
  const obstacles = venueObjects.filter(obj => obj.type === 'wall' || obj.type === 'pillar');
  
  for (const camera of cameras) {
    const conflict = checkOcclusionConflict(camera, obstacles, options);
    if (conflict) {
      conflicts.push(conflict);
    }
  }
  
  return conflicts;
}
