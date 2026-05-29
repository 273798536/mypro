import type { MirrorSegment, IncidentRay, GradingResult, ConflictSource, PendingAction, Verdict } from './types';

const EPS = 1e-9;
const ANGLE_DEVIATION_THRESHOLD_DEG = 1.0;

interface IntersectionResult {
  point: { x: number; y: number } | null;
  t: number | null;
  s: number | null;
  isParallel: boolean;
}

function raySegmentIntersect(
  rayOriginX: number,
  rayOriginY: number,
  rayDirX: number,
  rayDirY: number,
  segStartX: number,
  segStartY: number,
  segEndX: number,
  segEndY: number
): IntersectionResult {
  const dx = segEndX - segStartX;
  const dy = segEndY - segStartY;

  const denom = rayDirX * dy - rayDirY * dx;

  if (Math.abs(denom) < EPS) {
    return { point: null, t: null, s: null, isParallel: true };
  }

  const ox = segStartX - rayOriginX;
  const oy = segStartY - rayOriginY;

  const t = (ox * dy - oy * dx) / denom;
  const s = (ox * rayDirY - oy * rayDirX) / denom;

  if (t < -EPS) {
    return { point: null, t, s, isParallel: false };
  }

  const point = {
    x: rayOriginX + t * rayDirX,
    y: rayOriginY + t * rayDirY,
  };

  return { point, t, s, isParallel: false };
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function getRayDirection(angleDeg: number): { dx: number; dy: number } {
  const rad = degToRad(angleDeg);
  return { dx: Math.cos(rad), dy: Math.sin(rad) };
}

function getSegmentNormal(seg: MirrorSegment): { nx: number; ny: number } {
  const dx = seg.endX - seg.startX;
  const dy = seg.endY - seg.startY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < EPS) return { nx: 0, ny: 1 };
  return { nx: -dy / len, ny: dx / len };
}

function computeIncidentAngle(
  rayDirX: number,
  rayDirY: number,
  normalX: number,
  normalY: number
): number {
  const rayLen = Math.sqrt(rayDirX * rayDirX + rayDirY * rayDirY);
  if (rayLen < EPS) return 0;
  const dot = Math.abs(rayDirX * normalX + rayDirY * normalY) / rayLen;
  return radToDeg(Math.acos(Math.min(1, Math.max(-1, dot))));
}

function detectAngleUnitConflict(angle: number, unit: 'deg' | 'rad'): boolean {
  if (unit === 'rad' && Math.abs(angle) > 2 * Math.PI + EPS) {
    return true;
  }
  if (unit === 'deg' && Math.abs(angle) < Math.PI / 180 - EPS && Math.abs(angle) > EPS) {
    return true;
  }
  return false;
}

function reflectDirection(
  dirX: number,
  dirY: number,
  normalX: number,
  normalY: number
): { rx: number; ry: number } {
  const dot = dirX * normalX + dirY * normalY;
  return {
    rx: dirX - 2 * dot * normalX,
    ry: dirY - 2 * dot * normalY,
  };
}

export function gradePair(ray: IncidentRay, mirror: MirrorSegment): GradingResult {
  const id = `${ray.id}-${mirror.id}`;
  const conflicts: ConflictSource[] = [];
  let pendingAction: PendingAction | null = null;
  const details: string[] = [];

  const angleDeg = ray.angleUnit === 'rad' ? radToDeg(ray.directionAngle) : ray.directionAngle;
  const unitConflict = detectAngleUnitConflict(ray.directionAngle, ray.angleUnit);

  if (unitConflict) {
    conflicts.push('angle_unit_conflict');
    pendingAction = 'confirm_angle_unit';
    details.push(
      `角度单位疑似错误: 输入值=${ray.directionAngle}, 标记单位=${ray.angleUnit}`
    );
  }

  const { dx: rayDx, dy: rayDy } = getRayDirection(angleDeg);
  const { nx, ny } = getSegmentNormal(mirror);
  const segDx = mirror.endX - mirror.startX;
  const segDy = mirror.endY - mirror.startY;

  details.push(
    `入射光线: 起点(${ray.originX}, ${ray.originY}), 方向角=${angleDeg.toFixed(2)}°, 方向向量=(${rayDx.toFixed(4)}, ${rayDy.toFixed(4)})`
  );
  details.push(
    `镜面线段: (${mirror.startX}, ${mirror.startY}) → (${mirror.endX}, ${mirror.endY}), 法线=(${nx.toFixed(4)}, ${ny.toFixed(4)})`
  );

  const intersection = raySegmentIntersect(
    ray.originX,
    ray.originY,
    rayDx,
    rayDy,
    mirror.startX,
    mirror.startY,
    mirror.endX,
    mirror.endY
  );

  if (intersection.isParallel) {
    conflicts.push('parallel_no_intersection');
    pendingAction = 'verify_parallel_intent';
    details.push('结果: 射线与镜面线段平行，无交点');

    return {
      id,
      rayId: ray.id,
      mirrorId: mirror.id,
      intersection: null,
      isParallel: true,
      isOnExtension: false,
      isOnSegment: false,
      incidentAngle: null,
      reflectionAngle: null,
      angleDeviation: null,
      paramT: intersection.t,
      paramS: intersection.s,
      verdict: 'pending',
      conflictSources: conflicts,
      pendingAction,
      computationDetails: details.join('\n'),
    };
  }

  if (intersection.t !== null && intersection.t < -EPS) {
    details.push(`结果: 交点在射线反方向 (t=${intersection.t?.toFixed(4)})`);

    return {
      id,
      rayId: ray.id,
      mirrorId: mirror.id,
      intersection: null,
      isParallel: false,
      isOnExtension: false,
      isOnSegment: false,
      incidentAngle: null,
      reflectionAngle: null,
      angleDeviation: null,
      paramT: intersection.t,
      paramS: intersection.s,
      verdict: 'pending',
      conflictSources: ['parallel_no_intersection'],
      pendingAction: 'verify_parallel_intent',
      computationDetails: details.join('\n'),
    };
  }

  const s = intersection.s ?? 0;
  const isOnSegment = s >= -EPS && s <= 1 + EPS;
  const isOnExtension = !isOnSegment;

  if (intersection.point) {
    details.push(
      `交点: (${intersection.point.x.toFixed(4)}, ${intersection.point.y.toFixed(4)}), 参数 t=${intersection.t?.toFixed(4)}, s=${s.toFixed(4)}`
    );
  }

  if (isOnExtension) {
    conflicts.push('extension_line_intersection');
    pendingAction = 'check_extension_validity';
    details.push(`边界判定: 交点在延长线上 (s=${s.toFixed(4)} 超出 [0,1] 范围)`);
  } else {
    details.push(`边界判定: 交点在线段上 (s=${s.toFixed(4)} ∈ [0,1])`);
  }

  let incidentAngle: number | null = null;
  let reflectionAngle: number | null = null;
  let angleDeviation: number | null = null;

  if (intersection.point && !intersection.isParallel) {
    incidentAngle = computeIncidentAngle(rayDx, rayDy, nx, ny);
    reflectionAngle = incidentAngle;
    angleDeviation = 0;

    const { rx, ry } = reflectDirection(rayDx, rayDy, nx, ny);
    const reflectedAngleDeg = radToDeg(Math.atan2(ry, rx));

    details.push(`入射角: ${incidentAngle.toFixed(2)}°, 反射角: ${reflectionAngle.toFixed(2)}° (反射定律)`);
    details.push(`反射光线方向: (${rx.toFixed(4)}, ${ry.toFixed(4)}), 方向角=${reflectedAngleDeg.toFixed(2)}°`);

    if (Math.abs(angleDeviation) > ANGLE_DEVIATION_THRESHOLD_DEG) {
      conflicts.push('reflection_angle_deviation');
      details.push(`反射角偏差 ${angleDeviation.toFixed(2)}° 超过阈值 ${ANGLE_DEVIATION_THRESHOLD_DEG}°`);
    }
  }

  let verdict: Verdict = 'pass';
  if (conflicts.length > 0) {
    if (
      conflicts.includes('parallel_no_intersection') ||
      conflicts.includes('extension_line_intersection')
    ) {
      verdict = 'pending';
    } else {
      verdict = 'error';
    }
  }

  if (isOnExtension && verdict === 'pass') {
    verdict = 'pending';
  }

  return {
    id,
    rayId: ray.id,
    mirrorId: mirror.id,
    intersection: intersection.point,
    isParallel: intersection.isParallel,
    isOnExtension,
    isOnSegment,
    incidentAngle,
    reflectionAngle,
    angleDeviation,
    paramT: intersection.t,
    paramS: intersection.s,
    verdict,
    conflictSources: conflicts,
    pendingAction,
    computationDetails: details.join('\n'),
  };
}

export function gradeAll(
  rays: IncidentRay[],
  mirrors: MirrorSegment[]
): GradingResult[] {
  const results: GradingResult[] = [];
  for (const ray of rays) {
    for (const mirror of mirrors) {
      results.push(gradePair(ray, mirror));
    }
  }
  return results;
}

export { getRayDirection, getSegmentNormal, reflectDirection, computeIncidentAngle, degToRad, radToDeg };
