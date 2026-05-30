import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateSolidGeometry, generateSliceGeometries, generateCurveLine } from '../../utils/math/solidGenerator';
import type { RotationAxis } from '../../types/params';

interface SolidOfRevolutionProps {
  functionExpr: string;
  intervalA: number;
  intervalB: number;
  rotationAxis: RotationAxis;
  axisOffset: number;
  sliceCount: number;
  showSlices: boolean;
}

export function SolidOfRevolution({
  functionExpr,
  intervalA,
  intervalB,
  rotationAxis,
  axisOffset,
  sliceCount,
  showSlices,
}: SolidOfRevolutionProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const { geometry, curveGeometry, slices, curvePoints } = useMemo(() => {
    try {
      const { solid, curvePoints } = generateSolidGeometry(
        functionExpr,
        intervalA,
        intervalB,
        rotationAxis,
        sliceCount,
        axisOffset
      );
      const curveGeo = generateCurveLine(curvePoints, intervalA, intervalB, rotationAxis);
      const sliceData = showSlices
        ? generateSliceGeometries(functionExpr, intervalA, intervalB, rotationAxis, sliceCount, axisOffset)
        : [];
      return { geometry: solid, curveGeometry: curveGeo, slices: sliceData, curvePoints };
    } catch {
      return {
        geometry: new THREE.BufferGeometry(),
        curveGeometry: new THREE.BufferGeometry(),
        slices: [],
        curvePoints: [],
      };
    }
  }, [functionExpr, intervalA, intervalB, rotationAxis, sliceCount, showSlices, axisOffset]);

  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshPhysicalMaterial
          color={hovered ? '#60a5fa' : '#3b82f6'}
          transparent
          opacity={0.75}
          roughness={0.3}
          metalness={0.1}
          emissive="#1d4ed8"
          emissiveIntensity={hovered ? 0.15 : 0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      <lineSegments geometry={curveGeometry}>
        <lineBasicMaterial color="#fbbf24" linewidth={3} transparent opacity={0.9} />
      </lineSegments>

      {slices.map((slice, index) => (
        <mesh key={index} geometry={slice.geometry} position={slice.position}>
          <meshPhysicalMaterial
            color="#8b5cf6"
            transparent
            opacity={0.4}
            roughness={0.5}
            emissive="#7c3aed"
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}

      <lineSegments>
        <edgesGeometry args={[geometry]} />
        <lineBasicMaterial color="#1e40af" linewidth={1} transparent opacity={0.6} />
      </lineSegments>
    </group>
  );
}
