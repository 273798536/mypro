import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Slope } from '@/types';
import { generateGridFromHeightMap, calculateSlopeAngle } from '@/utils/geometry';
import { getSlopeColorByAngle } from '@/utils/color';

interface TerrainProps {
  slope: Slope;
  showColors: boolean;
  onClick?: (slope: Slope) => void;
  isSelected?: boolean;
}

export const TerrainMesh: React.FC<TerrainProps> = ({
  slope,
  showColors,
  onClick,
  isSelected,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const { geometry, colors } = useMemo(() => {
    const { positions, indices } = generateGridFromHeightMap(
      slope.heightMap,
      slope.bounds,
      0.8
    );

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();

    const cellWidth =
      (slope.bounds[2] - slope.bounds[0]) / (slope.heightMap[0].length - 1);
    const slopeAngles = calculateSlopeAngle(slope.heightMap, cellWidth);

    const colorArray = new Float32Array(positions.length);
    const rows = slope.heightMap.length;
    const cols = slope.heightMap[0].length;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const idx = (i * cols + j) * 3;
        const angle = slopeAngles[i][j];
        const color = new THREE.Color(
          showColors ? getSlopeColorByAngle(angle) : '#e8f4f8'
        );
        colorArray[idx] = color.r;
        colorArray[idx + 1] = color.g;
        colorArray[idx + 2] = color.b;
      }
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    return { geometry: geo, colors: colorArray };
  }, [slope, showColors]);

  useFrame((state) => {
    if (meshRef.current && isSelected) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(slope);
      }}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        vertexColors
        roughness={0.8}
        metalness={0.1}
        emissive={isSelected ? '#4FC3F7' : '#000000'}
        emissiveIntensity={isSelected ? 0.15 : 0}
      />
    </mesh>
  );
};

interface GroundProps {
  bounds: [number, number, number, number];
}

export const Ground: React.FC<GroundProps> = ({ bounds }) => {
  const [minX, minZ, maxX, maxZ] = bounds;
  const width = maxX - minX + 40;
  const depth = maxZ - minZ + 40;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[centerX, -0.5, centerZ]}
      receiveShadow
    >
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
    </mesh>
  );
};
