import * as THREE from 'three';
import type {
  GeometryObject,
  SectionPlane,
  RotationAxis,
  AnnotationPoint,
  GeometryType,
} from '@/types';

export const createGeometry = (type: GeometryType): THREE.BufferGeometry => {
  switch (type) {
    case 'cube':
      return new THREE.BoxGeometry(2, 2, 2);
    case 'pyramid':
      return new THREE.ConeGeometry(1.5, 2, 4);
    case 'cylinder':
      return new THREE.CylinderGeometry(1, 1, 2, 32);
    case 'cone':
      return new THREE.ConeGeometry(1, 2, 32);
    case 'sphere':
      return new THREE.SphereGeometry(1, 32, 32);
    case 'prism':
      return new THREE.CylinderGeometry(1, 1, 2, 3);
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(1.5);
    default:
      return new THREE.BoxGeometry(2, 2, 2);
  }
};

export const getGeometryBoundingBox = (geometry: GeometryObject): THREE.Box3 => {
  const box = new THREE.Box3();
  const mesh = new THREE.Mesh(createGeometry(geometry.type));
  mesh.position.set(...geometry.position);
  mesh.rotation.set(...geometry.rotation);
  mesh.scale.set(...geometry.scale);
  mesh.updateMatrixWorld();
  box.setFromObject(mesh);
  return box;
};

export const doesPlaneIntersectGeometry = (
  plane: SectionPlane,
  geometry: GeometryObject
): boolean => {
  const box = getGeometryBoundingBox(geometry);
  const threePlane = new THREE.Plane(
    new THREE.Vector3(...plane.normal).normalize(),
    -new THREE.Vector3(...plane.position).dot(new THREE.Vector3(...plane.normal).normalize())
  );

  const corners: THREE.Vector3[] = [];
  const min = box.min;
  const max = box.max;

  corners.push(new THREE.Vector3(min.x, min.y, min.z));
  corners.push(new THREE.Vector3(min.x, min.y, max.z));
  corners.push(new THREE.Vector3(min.x, max.y, min.z));
  corners.push(new THREE.Vector3(min.x, max.y, max.z));
  corners.push(new THREE.Vector3(max.x, min.y, min.z));
  corners.push(new THREE.Vector3(max.x, min.y, max.z));
  corners.push(new THREE.Vector3(max.x, max.y, min.z));
  corners.push(new THREE.Vector3(max.x, max.y, max.z));

  let hasPositive = false;
  let hasNegative = false;

  for (const corner of corners) {
    const distance = threePlane.distanceToPoint(corner);
    if (distance > 0.001) hasPositive = true;
    if (distance < -0.001) hasNegative = true;
    if (hasPositive && hasNegative) return true;
  }

  return false;
};

export const getAxisLength = (axis: RotationAxis): number => {
  const start = new THREE.Vector3(...axis.startPoint);
  const end = new THREE.Vector3(...axis.endPoint);
  return start.distanceTo(end);
};

export const isPointNearGeometry = (
  point: [number, number, number],
  geometry: GeometryObject,
  threshold = 0.5
): boolean => {
  const box = getGeometryBoundingBox(geometry);
  const p = new THREE.Vector3(...point);
  const closest = new THREE.Vector3();
  box.clampPoint(p, closest);
  return p.distanceTo(closest) < threshold;
};

export const isAnnotationOnGeometry = (
  annotation: AnnotationPoint,
  geometry: GeometryObject
): boolean => {
  return isPointNearGeometry(annotation.position, geometry, 0.1);
};

export const getGeometryCenter = (geometry: GeometryObject): THREE.Vector3 => {
  return new THREE.Vector3(...geometry.position);
};

export const rotatePointAroundAxis = (
  point: [number, number, number],
  axis: RotationAxis,
  angleDeg: number
): [number, number, number] => {
  const p = new THREE.Vector3(...point);
  const start = new THREE.Vector3(...axis.startPoint);
  const end = new THREE.Vector3(...axis.endPoint);
  const axisVector = end.clone().sub(start).normalize();
  const angleRad = (angleDeg * Math.PI) / 180;

  const quaternion = new THREE.Quaternion().setFromAxisAngle(axisVector, angleRad);
  const translated = p.clone().sub(start);
  const rotated = translated.applyQuaternion(quaternion);
  const result = rotated.add(start);

  return [result.x, result.y, result.z];
};

export const projectPointToPlane = (
  point: [number, number, number],
  plane: SectionPlane
): [number, number, number] => {
  const p = new THREE.Vector3(...point);
  const planeNormal = new THREE.Vector3(...plane.normal).normalize();
  const planePoint = new THREE.Vector3(...plane.position);

  const distance = p.clone().sub(planePoint).dot(planeNormal);
  const projected = p.clone().sub(planeNormal.multiplyScalar(distance));

  return [projected.x, projected.y, projected.z];
};

export const getIntersectionPoints = (
  plane: SectionPlane,
  geometry: GeometryObject
): THREE.Vector3[] => {
  const box = getGeometryBoundingBox(geometry);
  const threePlane = new THREE.Plane(
    new THREE.Vector3(...plane.normal).normalize(),
    -new THREE.Vector3(...plane.position).dot(new THREE.Vector3(...plane.normal).normalize())
  );

  const edges: [THREE.Vector3, THREE.Vector3][] = [];
  const min = box.min;
  const max = box.max;

  const v000 = new THREE.Vector3(min.x, min.y, min.z);
  const v001 = new THREE.Vector3(min.x, min.y, max.z);
  const v010 = new THREE.Vector3(min.x, max.y, min.z);
  const v011 = new THREE.Vector3(min.x, max.y, max.z);
  const v100 = new THREE.Vector3(max.x, min.y, min.z);
  const v101 = new THREE.Vector3(max.x, min.y, max.z);
  const v110 = new THREE.Vector3(max.x, max.y, min.z);
  const v111 = new THREE.Vector3(max.x, max.y, max.z);

  edges.push([v000, v001], [v001, v011], [v011, v010], [v010, v000]);
  edges.push([v100, v101], [v101, v111], [v111, v110], [v110, v100]);
  edges.push([v000, v100], [v001, v101], [v010, v110], [v011, v111]);

  const intersectionPoints: THREE.Vector3[] = [];

  for (const [start, end] of edges) {
    const intersection = new THREE.Vector3();
    const result = threePlane.intersectLine(
      new THREE.Line3(start, end),
      intersection
    );
    if (result) {
      intersectionPoints.push(intersection.clone());
    }
  }

  return intersectionPoints;
};

export const calculateSectionArea = (
  points: THREE.Vector3[],
  plane: SectionPlane
): number => {
  if (points.length < 3) return 0;

  const normal = new THREE.Vector3(...plane.normal).normalize();
  const center = points.reduce(
    (acc, p) => acc.add(p),
    new THREE.Vector3()
  ).divideScalar(points.length);

  const projectedPoints = points.map((p) => {
    const v = p.clone().sub(center);
    const tangent1 = new THREE.Vector3().crossVectors(
      normal,
      new THREE.Vector3(1, 0, 0)
    );
    if (tangent1.length() < 0.01) {
      tangent1.crossVectors(normal, new THREE.Vector3(0, 1, 0));
    }
    tangent1.normalize();
    const tangent2 = new THREE.Vector3().crossVectors(normal, tangent1).normalize();

    return {
      x: v.dot(tangent1),
      y: v.dot(tangent2),
    };
  });

  projectedPoints.sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));

  let area = 0;
  for (let i = 0; i < projectedPoints.length; i++) {
    const j = (i + 1) % projectedPoints.length;
    area += projectedPoints[i].x * projectedPoints[j].y;
    area -= projectedPoints[j].x * projectedPoints[i].y;
  }

  return Math.abs(area) / 2;
};

export const createDefaultGeometry = (
  type: GeometryType,
  position: [number, number, number] = [0, 0, 0]
): Omit<GeometryObject, 'id'> => ({
  type,
  position,
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
  color: '#3b82f6',
  opacity: 0.8,
  visible: true,
  name: type,
});

export const createDefaultAxis = (
  type: 'x' | 'y' | 'z'
): Omit<RotationAxis, 'id'> => {
  const axes = {
    x: {
      startPoint: [-3, 0, 0] as [number, number, number],
      endPoint: [3, 0, 0] as [number, number, number],
      color: '#ef4444',
    },
    y: {
      startPoint: [0, -3, 0] as [number, number, number],
      endPoint: [0, 3, 0] as [number, number, number],
      color: '#22c55e',
    },
    z: {
      startPoint: [0, 0, -3] as [number, number, number],
      endPoint: [0, 0, 3] as [number, number, number],
      color: '#3b82f6',
    },
  };

  return {
    type,
    ...axes[type],
    visible: true,
    draggable: true,
  };
};

export const createDefaultSectionPlane = (): Omit<SectionPlane, 'id'> => ({
  position: [0, 0, 0],
  normal: [0, 1, 0],
  visible: true,
  showIntersection: true,
  intersectionColor: '#f97316',
  planeColor: 'rgba(59, 130, 246, 0.3)',
});

export const createDefaultAnnotation = (
  position: [number, number, number],
  label: string
): Omit<AnnotationPoint, 'id'> => ({
  position,
  label,
  color: '#fbbf24',
  visible: true,
});
