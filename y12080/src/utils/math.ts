import * as THREE from 'three';
import { Vec3 } from '../types';

export function toThreeVec3(v: Vec3): THREE.Vector3 {
  return new THREE.Vector3(v[0], v[1], v[2]);
}

export function fromThreeVec3(v: THREE.Vector3): Vec3 {
  return [v.x, v.y, v.z] as Vec3;
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.sqrt(
    Math.pow(b[0] - a[0], 2) +
    Math.pow(b[1] - a[1], 2) +
    Math.pow(b[2] - a[2], 2)
  );
}

export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export function pointInAABB(point: Vec3, boxPos: Vec3, boxSize: Vec3): boolean {
  const halfX = boxSize[0] / 2;
  const halfY = boxSize[1] / 2;
  const halfZ = boxSize[2] / 2;
  
  return (
    point[0] >= boxPos[0] - halfX && point[0] <= boxPos[0] + halfX &&
    point[1] >= boxPos[1] - halfY && point[1] <= boxPos[1] + halfY &&
    point[2] >= boxPos[2] - halfZ && point[2] <= boxPos[2] + halfZ
  );
}

export function aabbOverlap(
  pos1: Vec3, size1: Vec3,
  pos2: Vec3, size2: Vec3
): boolean {
  const hx1 = size1[0] / 2, hy1 = size1[1] / 2, hz1 = size1[2] / 2;
  const hx2 = size2[0] / 2, hy2 = size2[1] / 2, hz2 = size2[2] / 2;
  
  return (
    Math.abs(pos1[0] - pos2[0]) < hx1 + hx2 &&
    Math.abs(pos1[1] - pos2[1]) < hy1 + hy2 &&
    Math.abs(pos1[2] - pos2[2]) < hz1 + hz2
  );
}

export function coneContainsPoint(
  conePos: Vec3,
  coneDir: Vec3,
  coneAngle: number,
  coneHeight: number,
  point: Vec3
): boolean {
  const toPoint: Vec3 = [
    point[0] - conePos[0],
    point[1] - conePos[1],
    point[2] - conePos[2],
  ];
  
  const dist = Math.sqrt(toPoint[0] ** 2 + toPoint[1] ** 2 + toPoint[2] ** 2);
  if (dist > coneHeight) return false;
  
  const dirLen = Math.sqrt(coneDir[0] ** 2 + coneDir[1] ** 2 + coneDir[2] ** 2);
  const dot = (toPoint[0] * coneDir[0] + toPoint[1] * coneDir[1] + toPoint[2] * coneDir[2]) / (dist * dirLen);
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
  
  return angle <= coneAngle / 2;
}

export function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
  if (len === 0) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
