import { Vector3, CatmullRomCurve3 } from 'three';
import type { ChuteModel } from '@/types';

export const createPathCurve = (points: Vector3[]): CatmullRomCurve3 => {
  return new CatmullRomCurve3(points, false, 'catmullrom', 0.5);
};

export const getPositionOnPath = (
  curve: CatmullRomCurve3,
  progress: number,
  offsetY = 0
): Vector3 => {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const position = curve.getPointAt(clampedProgress);
  return new Vector3(position.x, position.y + offsetY, position.z);
};

export const getTangentOnPath = (
  curve: CatmullRomCurve3,
  progress: number
): Vector3 => {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  return curve.getTangentAt(clampedProgress);
};

export const getRotationOnPath = (
  curve: CatmullRomCurve3,
  progress: number
): { x: number; y: number; z: number } => {
  const tangent = getTangentOnPath(curve, progress);
  const up = new Vector3(0, 1, 0);
  
  const axis = new Vector3().crossVectors(up, tangent).normalize();
  const angle = Math.acos(up.dot(tangent.normalize()));
  
  return {
    x: axis.x * angle,
    y: axis.y * angle,
    z: axis.z * angle,
  };
};

export const getProgressForPosition = (
  chute: ChuteModel,
  position: number
): number => {
  return Math.max(0, Math.min(1, position / chute.length));
};

export const generatePathPoints = (
  start: Vector3,
  end: Vector3,
  segments = 10,
  heightVariation = 0.5
): Vector3[] => {
  const points: Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = start.x + (end.x - start.x) * t;
    const y = start.y + (end.y - start.y) * t + Math.sin(t * Math.PI) * heightVariation;
    const z = start.z + (end.z - start.z) * t + Math.sin(t * Math.PI * 2) * (heightVariation / 2);
    points.push(new Vector3(x, y, z));
  }
  return points;
};

export const getSegmentForPosition = (
  chute: ChuteModel,
  position: number
) => {
  return chute.segments.find(
    (seg) => position >= seg.startPosition && position < seg.endPosition
  );
};

export const getSortingPortForPosition = (
  chute: ChuteModel,
  position: number
) => {
  const segment = getSegmentForPosition(chute, position);
  return segment?.sortingPortId;
};

export const getExpectedHeightForPosition = (
  chute: ChuteModel,
  position: number
): number => {
  const segment = getSegmentForPosition(chute, position);
  return segment?.expectedHeight ?? chute.standardHeight;
};

export const formatPosition = (position: number): string => {
  return `${position.toFixed(2)}m`;
};

export const formatHeight = (height: number): string => {
  return `${(height * 100).toFixed(1)}cm`;
};

export const formatSpeed = (speed: number): string => {
  return `${speed.toFixed(2)}m/s`;
};
