import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { InstitutionWithScore } from '../../types';
import { generateTerrainGeometry } from '../../utils/terrainGenerator';

interface RiskTerrainProps {
  institutions: InstitutionWithScore[];
}

export const RiskTerrain = ({ institutions }: RiskTerrainProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetGeometry = useRef<THREE.PlaneGeometry | null>(null);

  const geometry = useMemo(() => {
    return generateTerrainGeometry(institutions);
  }, [institutions]);

  useFrame(() => {
    if (meshRef.current && targetGeometry.current) {
      const currentPos = meshRef.current.geometry.attributes.position;
      const targetPos = targetGeometry.current.attributes.position;

      for (let i = 0; i < currentPos.count; i++) {
        const currentZ = currentPos.getZ(i);
        const targetZ = targetPos.getZ(i);
        currentPos.setZ(i, currentZ + (targetZ - currentZ) * 0.1);
      }
      currentPos.needsUpdate = true;
      meshRef.current.geometry.computeVertexNormals();
    }
  });

  const colors = useMemo(() => {
    const colorArray = new Float32Array(geometry.attributes.position.count * 3);
    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const height = positions.getZ(i);
      const normalizedHeight = Math.min(1, Math.max(0, height / 2));

      let r, g, b;
      if (normalizedHeight < 0.3) {
        r = 0.18; g = 0.84; b = 0.45;
      } else if (normalizedHeight < 0.5) {
        r = 1; g = 0.65; b = 0.01;
      } else if (normalizedHeight < 0.75) {
        r = 1; g = 0.42; b = 0.21;
      } else {
        r = 1; g = 0.28; b = 0.34;
      }

      colorArray[i * 3] = r;
      colorArray[i * 3 + 1] = g;
      colorArray[i * 3 + 2] = b;
    }

    return colorArray;
  }, [geometry]);

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial
        color={0x1e3a5f}
        transparent
        opacity={0.85}
        metalness={0.2}
        roughness={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};
