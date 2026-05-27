import { LensState, Warning, ValidationResult, CONSTANTS, RaySegment } from '../types';

export function calculateLensImage(
  focalLength: number,
  objectDistance: number,
  objectHeight: number = CONSTANTS.DEFAULT_OBJECT_HEIGHT
): LensState {
  const isAtFocus = Math.abs(objectDistance - focalLength) < 0.1;

  if (isAtFocus) {
    return {
      focalLength,
      objectDistance,
      imageDistance: Infinity,
      magnification: Infinity,
      isRealImage: false,
      isAtFocus: true,
      objectHeight,
      imageHeight: Infinity,
    };
  }

  const imageDistance = (focalLength * objectDistance) / (objectDistance - focalLength);
  const magnification = -imageDistance / objectDistance;
  const imageHeight = magnification * objectHeight;
  const isRealImage = imageDistance > 0;

  return {
    focalLength,
    objectDistance,
    imageDistance,
    magnification,
    isRealImage,
    isAtFocus: false,
    objectHeight,
    imageHeight,
  };
}

export function validateParameters(
  focalLength: number,
  objectDistance: number
): ValidationResult {
  const warnings: Warning[] = [];

  if (focalLength < CONSTANTS.MIN_FOCAL_LENGTH || focalLength > CONSTANTS.MAX_FOCAL_LENGTH) {
    warnings.push({
      type: 'range',
      message: `焦距应在 ${CONSTANTS.MIN_FOCAL_LENGTH}cm 到 ${CONSTANTS.MAX_FOCAL_LENGTH}cm 之间`,
      severity: 'critical',
    });
  }

  if (objectDistance < CONSTANTS.MIN_OBJECT_DISTANCE || objectDistance > CONSTANTS.MAX_OBJECT_DISTANCE) {
    warnings.push({
      type: 'range',
      message: `物距应在 ${CONSTANTS.MIN_OBJECT_DISTANCE}cm 到 ${CONSTANTS.MAX_OBJECT_DISTANCE}cm 之间`,
      severity: 'critical',
    });
  }

  if (Math.abs(objectDistance - focalLength) < CONSTANTS.FOCUS_THRESHOLD) {
    warnings.push({
      type: 'focus',
      message: '物体接近焦点，光线接近平行，成像在极远处',
      severity: 'critical',
    });
  }

  const imageDistance = (focalLength * objectDistance) / (objectDistance - focalLength);
  if (imageDistance < 0) {
    warnings.push({
      type: 'virtual',
      message: '成虚像，无法在光屏上呈现，光线反向延长线相交',
      severity: 'warning',
    });
  }

  const magnification = -imageDistance / objectDistance;
  if (magnification > 0) {
    warnings.push({
      type: 'magnification',
      message: '正立像（放大率为正），通常为虚像',
      severity: 'info',
    });
  }

  return {
    isValid: warnings.every(w => w.severity !== 'critical'),
    warnings,
  };
}

export function calculateRays(state: LensState): RaySegment[][] {
  const { focalLength, objectDistance, imageDistance, objectHeight, imageHeight, isAtFocus, isRealImage } = state;

  if (isAtFocus) {
    return [
      [
        { start: [-objectDistance, objectHeight, 0], end: [0, objectHeight, 0] },
        { start: [0, objectHeight, 0], end: [100, objectHeight + (objectHeight / focalLength) * 100, 0] },
      ],
      [
        { start: [-objectDistance, objectHeight, 0], end: [100, -objectHeight / objectDistance * 100, 0] },
      ],
      [
        { start: [-objectDistance, objectHeight, 0], end: [0, objectHeight, 0] },
        { start: [0, objectHeight, 0], end: [100, objectHeight, 0] },
      ],
    ];
  }

  const scale = CONSTANTS.SCALE;
  const u = objectDistance * scale;
  const f = focalLength * scale;
  const v = imageDistance * scale;
  const h = objectHeight * scale;
  const h_prime = imageHeight * scale;

  const rays: RaySegment[][] = [];

  rays.push([
    { start: [-u, h, 0], end: [0, h, 0] },
    { start: [0, h, 0], end: isRealImage ? [v, h_prime, 0] : [v, h_prime, 0], isVirtual: !isRealImage },
  ]);

  if (!isRealImage) {
    rays[0].push({ start: [0, h, 0], end: [50, h + (h / f) * 50, 0] });
  }

  rays.push([
    { start: [-u, h, 0], end: isRealImage ? [v, h_prime, 0] : [50, h / u * 50 - h, 0] },
    !isRealImage ? { start: [v, h_prime, 0], end: [0, 0, 0], isVirtual: true } : null,
  ].filter(Boolean) as RaySegment[]);

  if (objectDistance > focalLength) {
    const slope = h / (u - f);
    rays.push([
      { start: [-u, h, 0], end: [0, -slope * f + h, 0] },
      { start: [0, -slope * f + h, 0], end: isRealImage ? [v, h_prime, 0] : [v, h_prime, 0], isVirtual: !isRealImage },
    ]);
    if (!isRealImage) {
      rays[2].push({ start: [0, -slope * f + h, 0], end: [50, -slope * f + h, 0] });
    }
  } else {
    rays.push([
      { start: [-u, h, 0], end: [0, h * (u + f) / (u), 0] },
      { start: [0, h * (u + f) / (u), 0], end: [50, h * (u + f) / (u), 0] },
      { start: [0, h * (u + f) / (u), 0], end: [v, h_prime, 0], isVirtual: true },
    ]);
  }

  return rays;
}

export function formatNumber(value: number, decimals: number = 2): string {
  if (!isFinite(value)) return '∞';
  return value.toFixed(decimals);
}

export function getImageTypeDescription(isRealImage: boolean, magnification: number): string {
  if (!isFinite(magnification)) return '不成像（在焦点上）';
  const upright = magnification > 0 ? '正立' : '倒立';
  const size = Math.abs(magnification) > 1 ? '放大' : Math.abs(magnification) < 1 ? '缩小' : '等大';
  const type = isRealImage ? '实像' : '虚像';
  return `${upright} ${size} ${type}`;
}
