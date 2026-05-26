import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { QuadricSurfaceParams, ComputationWarning } from '../../types';
import { sampleSurface, checkSingularities } from '../../math/quadric';

interface QuadricSurfaceProps {
  params: QuadricSurfaceParams;
  onWarnings: (warnings: ComputationWarning[]) => void;
}

export function QuadricSurface({ params, onWarnings }: QuadricSurfaceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);

  const { geometry, warnings } = useMemo(() => {
    const result = sampleSurface(
      params.equation,
      params.bounds,
      params.sampleDensity
    );

    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(result.vertices.length * 3);
    const normals = new Float32Array(result.vertices.length * 3);
    const colors = new Float32Array(result.vertices.length * 3);

    result.vertices.forEach((vertex, i) => {
      vertices[i * 3] = vertex.x;
      vertices[i * 3 + 1] = vertex.y;
      vertices[i * 3 + 2] = vertex.z;

      const t = (vertex.z - params.bounds.zMin) / (params.bounds.zMax - params.bounds.zMin);
      colors[i * 3] = 0.0 + t * 0.0;
      colors[i * 3 + 1] = 0.5 + t * 0.3;
      colors[i * 3 + 2] = 0.8 + t * 0.2;

      normals[i * 3] = 0;
      normals[i * 3 + 1] = 0;
      normals[i * 3 + 2] = 1;
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(result.indices);
    geometry.computeVertexNormals();

    const singularWarnings = checkSingularities(params.equation, params.bounds);
    const allWarnings = [...result.warnings, ...singularWarnings];

    return { geometry, warnings: allWarnings };
  }, [params.equation, params.bounds, params.sampleDensity]);

  useMemo(() => {
    onWarnings(warnings);
  }, [warnings, onWarnings]);

  useFrame((state) => {
    if (materialRef.current) {
      const time = state.clock.elapsedTime;
      materialRef.current.emissiveIntensity = 0.05 + Math.sin(time * 0.5) * 0.02;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhysicalMaterial
        ref={materialRef}
        side={THREE.DoubleSide}
        transparent
        opacity={0.85}
        roughness={0.3}
        metalness={0.1}
        vertexColors
        emissive={new THREE.Color(0x00d4ff)}
        emissiveIntensity={0.05}
        clearcoat={0.2}
        clearcoatRoughness={0.3}
      />
    </mesh>
  );
}
