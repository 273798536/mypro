import * as THREE from 'three';
import type { Camera, Vector3 } from '@/types';

export function createCameraMatrix(camera: Camera): THREE.Matrix4 {
  const matrix = new THREE.Matrix4();
  
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(camera.rotation.tilt),
    THREE.MathUtils.degToRad(camera.rotation.pan),
    THREE.MathUtils.degToRad(camera.rotation.roll),
    'YXZ'
  );
  
  const quaternion = new THREE.Quaternion().setFromEuler(euler);
  const position = new THREE.Vector3(
    camera.position.x,
    camera.position.y,
    camera.position.z
  );
  
  matrix.compose(position, quaternion, new THREE.Vector3(1, 1, 1));
  return matrix;
}

export function createPerspectiveCamera(camera: Camera): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(
    camera.lens.fov,
    16 / 9,
    camera.lens.near,
    camera.lens.far
  );
  
  cam.position.set(camera.position.x, camera.position.y, camera.position.z);
  
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(camera.rotation.tilt),
    THREE.MathUtils.degToRad(camera.rotation.pan),
    THREE.MathUtils.degToRad(camera.rotation.roll),
    'YXZ'
  );
  cam.quaternion.setFromEuler(euler);
  
  cam.updateMatrixWorld();
  return cam;
}

export function computeFrustumCorners(camera: Camera): Vector3[] {
  const cam = createPerspectiveCamera(camera);
  
  const near = cam.near;
  const far = cam.far;
  const fov = THREE.MathUtils.degToRad(cam.fov);
  const aspect = cam.aspect;
  
  const nearHeight = 2 * Math.tan(fov / 2) * near;
  const nearWidth = nearHeight * aspect;
  const farHeight = 2 * Math.tan(fov / 2) * far;
  const farWidth = farHeight * aspect;
  
  const nearCorners = [
    new THREE.Vector3(-nearWidth / 2, -nearHeight / 2, -near),
    new THREE.Vector3(nearWidth / 2, -nearHeight / 2, -near),
    new THREE.Vector3(nearWidth / 2, nearHeight / 2, -near),
    new THREE.Vector3(-nearWidth / 2, nearHeight / 2, -near),
  ];
  
  const farCorners = [
    new THREE.Vector3(-farWidth / 2, -farHeight / 2, -far),
    new THREE.Vector3(farWidth / 2, -farHeight / 2, -far),
    new THREE.Vector3(farWidth / 2, farHeight / 2, -far),
    new THREE.Vector3(-farWidth / 2, farHeight / 2, -far),
  ];
  
  const matrix = cam.matrixWorld;
  const transform = (v: THREE.Vector3) => {
    const transformed = v.clone().applyMatrix4(matrix);
    return { x: transformed.x, y: transformed.y, z: transformed.z };
  };
  
  return [...nearCorners.map(transform), ...farCorners.map(transform)];
}

export function createFrustum(camera: Camera): THREE.Frustum {
  const cam = createPerspectiveCamera(camera);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  
  const frustum = new THREE.Frustum();
  frustum.setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      cam.projectionMatrix,
      cam.matrixWorldInverse
    )
  );
  
  return frustum;
}

export function pointToVector3(p: Vector3): THREE.Vector3 {
  return new THREE.Vector3(p.x, p.y, p.z);
}

export function distance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function distanceXZ(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}
