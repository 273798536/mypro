import * as THREE from 'three';
import { parseFunction } from './functionParser';

export function generateSolidGeometry(
  functionExpr: string,
  a: number,
  b: number,
  axis: 'x' | 'y' | 'custom',
  sliceCount: number,
  axisOffset: number = 0
): { solid: THREE.BufferGeometry; curvePoints: Array<[number, number]> } {
  const func = parseFunction(functionExpr);
  const actualA = Math.min(a, b);
  const actualB = Math.max(a, b);
  const points: THREE.Vector2[] = [];
  const curvePoints: Array<[number, number]> = [];
  const step = (actualB - actualA) / Math.max(sliceCount, 10);

  for (let i = 0; i <= sliceCount; i++) {
    const x = actualA + i * step;
    let y = func(x);

    if (!isFinite(y)) y = 0;

    curvePoints.push([x, y]);

    if (axis === 'x') {
      points.push(new THREE.Vector2(x - (actualA + actualB) / 2, Math.abs(y)));
    } else if (axis === 'y') {
      points.push(new THREE.Vector2(y, x - (actualA + actualB) / 2));
    } else {
      points.push(new THREE.Vector2(x - (actualA + actualB) / 2, Math.abs(y - axisOffset)));
    }
  }

  if (points.length < 2) {
    points.push(new THREE.Vector2(0, 0), new THREE.Vector2(1, 0));
  }

  const geometry = new THREE.LatheGeometry(points, 64);
  geometry.computeVertexNormals();

  return { solid: geometry, curvePoints };
}

export function generateSliceGeometries(
  functionExpr: string,
  a: number,
  b: number,
  axis: 'x' | 'y' | 'custom',
  sliceCount: number,
  axisOffset: number = 0
): Array<{ geometry: THREE.BufferGeometry; position: [number, number, number]; radius: number }> {
  const func = parseFunction(functionExpr);
  const actualA = Math.min(a, b);
  const actualB = Math.max(a, b);
  const step = (actualB - actualA) / Math.max(sliceCount, 1);
  const slices: Array<{ geometry: THREE.BufferGeometry; position: [number, number, number]; radius: number }> = [];
  const offset = (actualA + actualB) / 2;

  for (let i = 0; i < sliceCount; i++) {
    const x = actualA + i * step + step / 2;
    let y = func(x);
    if (!isFinite(y)) y = 0;

    let radius: number;
    let position: [number, number, number];

    if (axis === 'x') {
      radius = Math.abs(y);
      position = [x - offset, 0, 0];
    } else if (axis === 'y') {
      radius = Math.abs(x - axisOffset);
      position = [0, x - offset, 0];
    } else {
      radius = Math.abs(y - axisOffset);
      position = [x - offset, 0, 0];
    }

    if (radius > 0.001) {
      const geometry = new THREE.CylinderGeometry(radius, radius, step * 0.8, 32);
      geometry.computeVertexNormals();
      slices.push({ geometry, position, radius });
    }
  }

  return slices;
}

export function generateCurveLine(
  curvePoints: Array<[number, number]>,
  a: number,
  b: number,
  axis: 'x' | 'y' | 'custom'
): THREE.BufferGeometry {
  const offset = (a + b) / 2;
  const vertices: number[] = [];

  curvePoints.forEach(([x, y]) => {
    if (axis === 'x') {
      vertices.push(x - offset, y, 0);
    } else if (axis === 'y') {
      vertices.push(0, x - offset, y);
    } else {
      vertices.push(x - offset, y, 0);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

  return geometry;
}
