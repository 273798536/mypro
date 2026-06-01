import * as THREE from 'three';
import type { FunctionConfig, RotationAxis, CurvePoint } from '@/types';
import { evaluateFunction } from './mathUtils';

export function generateSolidPoints(
  fn: FunctionConfig,
  precision: number = 100
): THREE.Vector2[] {
  const points: THREE.Vector2[] = [];
  const { start, end, isReversed } = fn.domain;
  const actualStart = isReversed ? end : start;
  const actualEnd = isReversed ? start : end;
  const step = (actualEnd - actualStart) / precision;

  for (let i = 0; i <= precision; i++) {
    const t = actualStart + i * step;
    const value = evaluateFunction(fn.expression, fn.variable, t);
    
    if (!isNaN(value) && isFinite(value) && Math.abs(value) < 100) {
      if (fn.variable === 'x') {
        points.push(new THREE.Vector2(t, value));
      } else {
        points.push(new THREE.Vector2(t, value));
      }
    }
  }

  return points;
}

export function createSolidGeometry(
  fn: FunctionConfig,
  axis: RotationAxis,
  slices: number = 32,
  precision: number = 100
): THREE.BufferGeometry {
  const points = generateSolidPoints(fn, precision);
  
  if (points.length < 2) {
    return new THREE.BufferGeometry();
  }

  const lathePoints = points.map(p => {
    if (axis.axis === 'x') {
      return new THREE.Vector2(p.y - axis.offset, p.x);
    } else {
      return new THREE.Vector2(p.x - axis.offset, p.y);
    }
  });

  const geometry = new THREE.LatheGeometry(lathePoints, slices);
  
  if (axis.axis === 'x') {
    geometry.rotateX(-Math.PI / 2);
  } else {
    geometry.rotateY(Math.PI / 2);
  }

  geometry.computeVertexNormals();
  return geometry;
}

export function createAxisLine(axis: RotationAxis, length: number = 10): THREE.BufferGeometry {
  const points = [];
  
  if (axis.axis === 'x') {
    points.push(new THREE.Vector3(-length / 2, 0, axis.offset));
    points.push(new THREE.Vector3(length / 2, 0, axis.offset));
  } else {
    points.push(new THREE.Vector3(axis.offset, -length / 2, 0));
    points.push(new THREE.Vector3(axis.offset, length / 2, 0));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return geometry;
}

export function createCurveLine(
  fn: FunctionConfig,
  precision: number = 100
): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  const { start, end, isReversed } = fn.domain;
  const actualStart = isReversed ? end : start;
  const actualEnd = isReversed ? start : end;
  const step = (actualEnd - actualStart) / precision;

  for (let i = 0; i <= precision; i++) {
    const t = actualStart + i * step;
    const value = evaluateFunction(fn.expression, fn.variable, t);
    
    if (!isNaN(value) && isFinite(value) && Math.abs(value) < 100) {
      if (fn.variable === 'x') {
        points.push(new THREE.Vector3(t, value, 0));
      } else {
        points.push(new THREE.Vector3(value, t, 0));
      }
    }
  }

  return new THREE.BufferGeometry().setFromPoints(points);
}

export function createSlicePlanes(
  fn: FunctionConfig,
  axis: RotationAxis,
  sliceCount: number = 8
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  const { start, end, isReversed } = fn.domain;
  const actualStart = isReversed ? end : start;
  const actualEnd = isReversed ? start : end;
  const step = (actualEnd - actualStart) / sliceCount;

  for (let i = 0; i <= sliceCount; i++) {
    const t = actualStart + i * step;
    const value = evaluateFunction(fn.expression, fn.variable, t);
    
    if (!isNaN(value) && isFinite(value)) {
      const radius = Math.abs(value - axis.offset);
      const geometry = new THREE.RingGeometry(radius * 0.95, radius, 32);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      if (axis.axis === 'x') {
        mesh.position.x = t;
        mesh.rotation.y = Math.PI / 2;
      } else {
        mesh.position.y = t;
        mesh.rotation.x = Math.PI / 2;
      }
      
      meshes.push(mesh);
    }
  }

  return meshes;
}
