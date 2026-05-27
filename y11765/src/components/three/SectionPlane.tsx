import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CoilConfig, ColorScale, SectionPlane as SectionPlaneType } from '../../types';
import { generateSectionSamples, getFieldColor } from '../../utils/magneticField';

interface SectionPlaneProps {
  config: SectionPlaneType;
  coils: CoilConfig[];
  colorScale: ColorScale;
  size?: number;
  resolution?: number;
}

export const SectionPlane = ({
  config,
  coils,
  colorScale,
  size = 6,
  resolution = 30,
}: SectionPlaneProps) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const { geometry, colors } = useMemo(() => {
    const normal = new THREE.Vector3(config.normal.x, config.normal.y, config.normal.z).normalize();
    const planePoint = normal.clone().multiplyScalar(config.position);

    const up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(normal.dot(up)) > 0.9) {
      up.set(1, 0, 0);
    }

    const u = new THREE.Vector3().crossVectors(normal, up).normalize();
    const v = new THREE.Vector3().crossVectors(normal, u).normalize();

    const halfSize = size / 2;
    const step = size / resolution;

    const vertices: number[] = [];
    const indices: number[] = [];
    const colorValues: number[] = [];

    const enabledCoils = coils.filter((c) => c.enabled && Math.abs(c.current) > 0);
    const samples = generateSectionSamples(
      enabledCoils,
      normal,
      planePoint,
      size,
      resolution
    );

    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const uCoord = -halfSize + i * step;
        const vCoord = -halfSize + j * step;

        const point = planePoint
          .clone()
          .add(u.clone().multiplyScalar(uCoord))
          .add(v.clone().multiplyScalar(vCoord));

        vertices.push(point.x, point.y, point.z);

        const sampleIndex = i * (resolution + 1) + j;
        const sample = samples[sampleIndex];
        const color = getFieldColor(
          sample?.fieldStrength || 0,
          colorScale.min,
          colorScale.max,
          colorScale.colormap
        );
        colorValues.push(color.r, color.g, color.b);
      }
    }

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const a = i * (resolution + 1) + j;
        const b = a + 1;
        const c = a + resolution + 1;
        const d = c + 1;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colorValues, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return { geometry: geo, colors: colorValues };
  }, [config, coils, colorScale, size, resolution]);

  useFrame(() => {
    if (!meshRef.current) return;

    const normal = new THREE.Vector3(config.normal.x, config.normal.y, config.normal.z).normalize();
    const planePoint = normal.clone().multiplyScalar(config.position);

    const enabledCoils = coils.filter((c) => c.enabled && Math.abs(c.current) > 0);
    const samples = generateSectionSamples(
      enabledCoils,
      normal,
      planePoint,
      size,
      resolution
    );

    const colorAttribute = meshRef.current.geometry.attributes.color as THREE.BufferAttribute;
    samples.forEach((sample, i) => {
      const color = getFieldColor(
        sample.fieldStrength,
        colorScale.min,
        colorScale.max,
        colorScale.colormap
      );
      colorAttribute.setXYZ(i, color.r, color.g, color.b);
    });
    colorAttribute.needsUpdate = true;
  });

  if (!config.visible) return null;

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry}>
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} transparent opacity={0.85} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, config.position + 0.01, 0]}>
        <ringGeometry args={[size * 0.5, size * 0.52, 64]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
