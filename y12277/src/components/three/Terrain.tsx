import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateTerrainGeometry } from '../../utils/terrainUtils';
import { useAppStore } from '../../store/useAppStore';

interface TerrainProps {
  width?: number;
  height?: number;
  segments?: number;
}

export function Terrain({ width = 40, height = 40, segments = 128 }: TerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetPositions = useRef<Float32Array | null>(null);
  const targetColors = useRef<Float32Array | null>(null);
  
  const selectedMonth = useAppStore(state => state.selectedMonth);
  const getFilteredInstitutions = useAppStore(state => state.getFilteredInstitutions);
  const getInstitutionRiskScore = useAppStore(state => state.getInstitutionRiskScore);
  
  const institutions = getFilteredInstitutions();
  
  const institutionData = useMemo(() => {
    return institutions.map(inst => {
      const score = getInstitutionRiskScore(inst.id, selectedMonth);
      return {
        x: inst.coordinateX,
        z: inst.coordinateZ,
        score: score?.score || 30
      };
    });
  }, [institutions, selectedMonth, getInstitutionRiskScore]);

  const initialGeometry = useMemo(() => {
    return generateTerrainGeometry(width, height, segments, segments, institutionData);
  }, [width, height, segments, institutionData]);

  useEffect(() => {
    if (meshRef.current) {
      const newGeometry = generateTerrainGeometry(width, height, segments, segments, institutionData);
      targetPositions.current = new Float32Array(newGeometry.attributes.position.array);
      targetColors.current = new Float32Array(newGeometry.attributes.color.array);
      newGeometry.dispose();
    }
  }, [institutionData, width, height, segments]);

  useFrame((_, delta) => {
    if (!meshRef.current || !targetPositions.current || !targetColors.current) return;
    
    const positions = meshRef.current.geometry.attributes.position;
    const colors = meshRef.current.geometry.attributes.color;
    const lerpFactor = Math.min(1, delta * 3);

    for (let i = 0; i < positions.count; i++) {
      const currentY = positions.getY(i);
      const targetY = targetPositions.current[i * 3 + 1];
      positions.setY(i, currentY + (targetY - currentY) * lerpFactor);

      for (let j = 0; j < 3; j++) {
        const idx = i * 3 + j;
        const current = colors.array[idx];
        const target = targetColors.current[idx];
        colors.array[idx] = current + (target - current) * lerpFactor;
      }
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={initialGeometry} receiveShadow>
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        roughness={0.8}
        metalness={0.1}
        flatShading
      />
    </mesh>
  );
}
