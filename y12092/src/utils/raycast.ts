import * as THREE from 'three';
import type { Camera, VenueObject, Vector3 } from '@/types';
import { createPerspectiveCamera, pointToVector3 } from './frustum';

export interface RaycastResult {
  hit: boolean;
  distance?: number;
  intersectionPoint?: Vector3;
  object?: VenueObject;
}

export function createVenueMesh(obj: VenueObject): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(obj.size.width, obj.size.height, obj.size.depth);
  const material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  
  mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
  mesh.userData = { venueObjectId: obj.id };
  mesh.updateMatrixWorld();
  
  return mesh;
}

export function raycastFromCamera(
  camera: Camera,
  target: Vector3,
  venueObjects: VenueObject[]
): RaycastResult {
  const cam = createPerspectiveCamera(camera);
  const origin = pointToVector3(camera.position);
  const targetPoint = pointToVector3(target);
  
  const direction = targetPoint.clone().sub(origin).normalize();
  const raycaster = new THREE.Raycaster(origin, direction);
  raycaster.far = origin.distanceTo(targetPoint);
  
  const meshes = venueObjects
    .filter(obj => obj.type === 'wall' || obj.type === 'pillar')
    .map(createVenueMesh);
  
  const intersects = raycaster.intersectObjects(meshes);
  
  if (intersects.length > 0) {
    const hit = intersects[0];
    const hitObject = venueObjects.find(
      obj => obj.id === hit.object.userData.venueObjectId
    );
    
    return {
      hit: true,
      distance: hit.distance,
      intersectionPoint: {
        x: hit.point.x,
        y: hit.point.y,
        z: hit.point.z,
      },
      object: hitObject,
    };
  }
  
  meshes.forEach(m => m.geometry.dispose());
  
  return { hit: false };
}

export function checkLineOfSight(
  camera: Camera,
  target: Vector3,
  venueObjects: VenueObject[]
): { blocked: boolean; blockingObject?: VenueObject; occlusionRatio?: number } {
  const result = raycastFromCamera(camera, target, venueObjects);
  
  if (result.hit && result.object && result.distance !== undefined) {
    const totalDistance = pointToVector3(camera.position).distanceTo(pointToVector3(target));
    const occlusionRatio = result.distance / totalDistance;
    
    return {
      blocked: true,
      blockingObject: result.object,
      occlusionRatio,
    };
  }
  
  return { blocked: false };
}

export function getCameraLookTarget(camera: Camera): Vector3 {
  const cam = createPerspectiveCamera(camera);
  const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  const target = pointToVector3(camera.position).add(direction.multiplyScalar(20));
  
  return { x: target.x, y: target.y, z: target.z };
}
