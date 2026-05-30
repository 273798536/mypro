import * as THREE from 'three';
import { EulerAngles } from '../types';
import { degToRad } from '../utils/math';

export const eulerToQuaternion = (euler: EulerAngles): THREE.Quaternion => {
  const quaternion = new THREE.Quaternion();
  const eulerRad = new THREE.Euler(
    degToRad(euler.pitch),
    degToRad(euler.yaw),
    degToRad(euler.roll),
    'YXZ'
  );
  quaternion.setFromEuler(eulerRad);
  return quaternion;
};

export const eulerToRotationMatrix = (euler: EulerAngles): THREE.Matrix4 => {
  const matrix = new THREE.Matrix4();
  const eulerRad = new THREE.Euler(
    degToRad(euler.pitch),
    degToRad(euler.yaw),
    degToRad(euler.roll),
    'YXZ'
  );
  matrix.makeRotationFromEuler(eulerRad);
  return matrix;
};

export const quaternionToEuler = (quaternion: THREE.Quaternion): EulerAngles => {
  const euler = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');
  return {
    pitch: (euler.x * 180) / Math.PI,
    yaw: (euler.y * 180) / Math.PI,
    roll: (euler.z * 180) / Math.PI,
  };
};

export const getAxisVectors = (euler: EulerAngles): {
  pitch: THREE.Vector3;
  yaw: THREE.Vector3;
  roll: THREE.Vector3;
} => {
  const matrix = eulerToRotationMatrix(euler);

  const xAxis = new THREE.Vector3(1, 0, 0).applyMatrix4(matrix);
  const yAxis = new THREE.Vector3(0, 1, 0).applyMatrix4(matrix);
  const zAxis = new THREE.Vector3(0, 0, 1).applyMatrix4(matrix);

  return {
    pitch: xAxis,
    yaw: yAxis,
    roll: zAxis,
  };
};

export const interpolateEuler = (
  start: EulerAngles,
  end: EulerAngles,
  t: number
): EulerAngles => {
  const startQuat = eulerToQuaternion(start);
  const endQuat = eulerToQuaternion(end);

  const interpolated = startQuat.clone().slerp(endQuat, t);

  return quaternionToEuler(interpolated);
};

export const getGimbalAxisPositions = (
  euler: EulerAngles,
  length: number = 3
): {
  pitch: [THREE.Vector3, THREE.Vector3];
  yaw: [THREE.Vector3, THREE.Vector3];
  roll: [THREE.Vector3, THREE.Vector3];
} => {
  const origin = new THREE.Vector3(0, 0, 0);
  const axes = getAxisVectors(euler);

  return {
    pitch: [origin, axes.pitch.clone().multiplyScalar(length)],
    yaw: [origin, axes.yaw.clone().multiplyScalar(length)],
    roll: [origin, axes.roll.clone().multiplyScalar(length)],
  };
};
