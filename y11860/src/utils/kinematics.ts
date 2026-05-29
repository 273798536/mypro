import { DHParameter, JointTransform } from '@/types';
import * as THREE from 'three';

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function createDHMatrix(params: DHParameter, thetaOffset: number): THREE.Matrix4 {
  const { a, alpha, d } = params;
  const theta = params.theta + thetaOffset;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const cosAlpha = Math.cos(alpha);
  const sinAlpha = Math.sin(alpha);

  const matrix = new THREE.Matrix4();
  matrix.set(
    cosTheta, -sinTheta * cosAlpha, sinTheta * sinAlpha, a * cosTheta,
    sinTheta, cosTheta * cosAlpha, -cosTheta * sinAlpha, a * sinTheta,
    0, sinAlpha, cosAlpha, d,
    0, 0, 0, 1
  );
  return matrix;
}

export function computeForwardKinematics(
  dhParams: DHParameter[], jointAngles: number[]): JointTransform[] {
  const transforms: JointTransform[] = [];
  const currentMatrix = new THREE.Matrix4();
  currentMatrix.identity();

  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();

  for (let i = 0; i < dhParams.length; i++) {
    const dhMatrix = createDHMatrix(dhParams[i], jointAngles[i] || 0);
    currentMatrix.multiply(dhMatrix);

    currentMatrix.decompose(position, quaternion, new THREE.Vector3());

    transforms.push({
      position: [position.x, position.y, position.z],
      rotation: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
    });
  }

  return transforms;
}

export function computeJacobian(
  dhParams: DHParameter[],
  jointAngles: number[]
): number[][] {
  const transforms = computeForwardKinematics(dhParams, jointAngles);
  const n = dhParams.length;
  const jacobian: number[][] = Array(6).fill(null).map(() => Array(n).fill(0));

  const endEffectorPos = new THREE.Vector3(...transforms[n - 1].position);

  for (let i = 0; i < n; i++) {
    const jointPos = new THREE.Vector3(...transforms[i].position);
    const jointQuat = new THREE.Quaternion(...transforms[i].rotation);

    const jointAxis = new THREE.Vector3(0, 0, 1);
    jointAxis.applyQuaternion(jointQuat);

    const diff = endEffectorPos.clone().sub(jointPos);

    const linear = new THREE.Vector3().crossVectors(jointAxis, diff);

    jacobian[0][i] = linear.x;
    jacobian[1][i] = linear.y;
    jacobian[2][i] = linear.z;
    jacobian[3][i] = jointAxis.x;
    jacobian[4][i] = jointAxis.y;
    jacobian[5][i] = jointAxis.z;
  }

  return jacobian;
}

export function computeManipulability(jacobian: number[][]): number {
  const JJT: number[][] = [];
  const rows = jacobian.length;
  const cols = jacobian[0].length;

  for (let i = 0; i < rows; i++) {
    JJT[i] = [];
    for (let j = 0; j < rows; j++) {
      let sum = 0;
      for (let k = 0; k < cols; k++) {
        sum += jacobian[i][k] * jacobian[j][k];
      }
      JJT[i][j] = sum;
    }
  }

  const det = computeDeterminant(JJT);
  return Math.sqrt(Math.max(0, det));
}

function computeDeterminant(matrix: number[][]): number {
  const n = matrix.length;
  if (n === 1) return matrix[0][0];

  let det = 0;
  for (let i = 0; i < n; i++) {
    const sign = i % 2 === 0 ? 1 : -1;
    const subMatrix = matrix.slice(1).map(row => [...row.slice(0, i), ...row.slice(i + 1)]);
    det += sign * matrix[0][i] * computeDeterminant(subMatrix);
  }
  return det;
}

export function isSingular(jacobian: number[][], threshold: number = 1e-4): boolean {
  const manipulability = computeManipulability(jacobian);
  return manipulability < threshold;
}

export function checkJointLimits(
  jointAngles: number[],
  jointLimits: Array<{ min: number; max: number }>
): Array<{ jointIndex: number; current: number; min: number; max: number }> {
  const violations: Array<{ jointIndex: number; current: number; min: number; max: number }> = [];

  for (let i = 0; i < jointAngles.length; i++) {
    const angle = jointAngles[i];
    const limit = jointLimits[i];
    if (limit && (angle < limit.min || angle > limit.max)) {
      violations.push({
        jointIndex: i,
        current: angle,
        min: limit.min,
        max: limit.max,
      });
    }
  }

  return violations;
}

export function getDefaultDHParams(): DHParameter[] {
  return [
    { a: 0, alpha: Math.PI / 2, d: 0.333, theta: 0 },
    { a: -0.425, alpha: 0, d: 0, theta: 0 },
    { a: -0.39225, alpha: 0, d: 0, theta: 0 },
    { a: 0, alpha: Math.PI / 2, d: 0.10915, theta: 0 },
    { a: 0, alpha: -Math.PI / 2, d: 0.09465, theta: 0 },
    { a: 0, alpha: 0, d: 0.0823, theta: 0 },
  ];
}

export function getDefaultJointLimits(): Array<{ min: number; max: number }> {
  return [
    { min: degToRad(-180), max: degToRad(180) },
    { min: degToRad(-90), max: degToRad(90) },
    { min: degToRad(-170), max: degToRad(170) },
    { min: degToRad(-180), max: degToRad(180) },
    { min: degToRad(-180), max: degToRad(180) },
    { min: degToRad(-180), max: degToRad(180) },
  ];
}

export function getDefaultLinkLengths(): number[] {
  return [0.333, 0.425, 0.39225, 0.10915, 0.09465, 0.0823];
}
