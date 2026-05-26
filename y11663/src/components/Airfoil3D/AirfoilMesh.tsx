
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Airfoil, PressureField, SamplingPoint } from '../../types';
import { getColorForValue, DEFAULT_COLOR_STOPS } from '../../utils/colorMap';
import { rotateCoordinates } from '../../utils/airfoilMath';

interface AirfoilMeshProps {
  airfoil: Airfoil;
  angleOfAttack: number;
  pressureField: PressureField | null;
}

export function AirfoilMesh({ airfoil, angleOfAttack, pressureField }: AirfoilMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { geometry, colors } = useMemo(() => {
    const rotatedCoords = rotateCoordinates(
      airfoil.coordinates,
      angleOfAttack,
      0.25 * airfoil.chordLength,
      0
    );

    const depth = 0.3;
    const vertices: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    const getPressureAtPosition = (x: number, y: number): number | null => {
      if (!pressureField) return null;

      let closestPoint: SamplingPoint | null = null;
      let minDist = Infinity;

      for (const point of pressureField.samplingPoints) {
        if (!point.isValid || point.pressure === null) continue;
        const dist = Math.sqrt(Math.pow(point.position.x - x, 2) + Math.pow(point.position.y - y, 2));
        if (dist < minDist) {
          minDist = dist;
          closestPoint = point;
        }
      }

      return closestPoint?.pressure ?? null;
    };

    for (let i = 0; i < rotatedCoords.length; i++) {
      const coord = rotatedCoords[i];
      const nextCoord = rotatedCoords[(i + 1) % rotatedCoords.length];

      vertices.push(coord.x, coord.y, -depth / 2);
      vertices.push(nextCoord.x, nextCoord.y, -depth / 2);
      vertices.push(coord.x, coord.y, depth / 2);
      vertices.push(nextCoord.x, nextCoord.y, depth / 2);

      const baseIdx = i * 4;
      indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
      indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);

      const avgX = (coord.x + nextCoord.x) / 2;
      const avgY = (coord.y + nextCoord.y) / 2;
      const pressure = getPressureAtPosition(avgX, avgY);

      let colorHex = '#4A5568';
      if (pressure !== null && pressureField) {
        colorHex = getColorForValue(
          pressure,
          pressureField.minPressure,
          pressureField.maxPressure,
          pressureField.colorInverted ? [...DEFAULT_COLOR_STOPS].reverse() : DEFAULT_COLOR_STOPS
        );
      }

      const color = new THREE.Color(colorHex);
      for (let j = 0; j < 4; j++) {
        colors.push(color.r, color.g, color.b);
      }
    }

    const frontVertices: number[] = [];
    const backVertices: number[] = [];

    for (let i = 0; i < rotatedCoords.length; i++) {
      const coord = rotatedCoords[i];
      frontVertices.push(coord.x, coord.y, depth / 2);
      backVertices.push(coord.x, coord.y, -depth / 2);
    }

    const frontCenterIdx = vertices.length / 3;
    const backCenterIdx = frontCenterIdx + 1;

    vertices.push(0.5 * airfoil.chordLength, 0, depth / 2);
    vertices.push(0.5 * airfoil.chordLength, 0, -depth / 2);

    const frontColor = new THREE.Color('#3B82F6');
    const backColor = new THREE.Color('#3B82F6');
    colors.push(frontColor.r, frontColor.g, frontColor.b);
    colors.push(backColor.r, backColor.g, backColor.b);

    for (let i = 0; i < rotatedCoords.length; i++) {
      const nextI = (i + 1) % rotatedCoords.length;
      indices.push(frontCenterIdx, frontCenterIdx + 2 + i, frontCenterIdx + 2 + nextI);
      indices.push(backCenterIdx, backCenterIdx + 2 + nextI, backCenterIdx + 2 + i);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return { geometry, colors };
  }, [airfoil, angleOfAttack, pressureField]);

  const material = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        shininess: 30,
        specular: new THREE.Color(0x444444),
      }),
    []
  );

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} castShadow receiveShadow />
  );
}
