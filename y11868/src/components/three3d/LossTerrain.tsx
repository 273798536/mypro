import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TerrainData } from '../../types';
import { getLossColor } from '../../utils/colorMap';

interface LossTerrainProps {
  terrainData: TerrainData;
  showWireframe?: boolean;
  useLogScale?: boolean;
}

export function LossTerrain({ terrainData, showWireframe = false, useLogScale = false }: LossTerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);

  const { geometry, colors } = useMemo(() => {
    const { width, height, heights, zRange } = terrainData;
    const geo = new THREE.PlaneGeometry(10, 10, width - 1, height - 1);
    geo.rotateX(-Math.PI / 2);
    
    const positions = geo.attributes.position;
    const colorArray = new Float32Array(positions.count * 3);
    const heightScale = 5 / (zRange[1] - zRange[0] || 1);
    
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        const idx = i * height + j;
        const z = heights[i][j];
        positions.setY(idx, z * heightScale);
        
        const color = new THREE.Color(getLossColor(z, zRange[0], zRange[1], useLogScale));
        colorArray[idx * 3] = color.r;
        colorArray[idx * 3 + 1] = color.g;
        colorArray[idx * 3 + 2] = color.b;
      }
    }
    
    geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    geo.computeVertexNormals();
    
    return { geometry: geo, colors: colorArray };
  }, [terrainData, useLogScale]);

  const wireframeGeometry = useMemo(() => {
    return new THREE.WireframeGeometry(geometry);
  }, [geometry]);

  useFrame(() => {
    if (wireframeRef.current) {
      wireframeRef.current.visible = showWireframe;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.8}
          metalness={0.1}
          transparent
          opacity={0.95}
        />
      </mesh>
      <lineSegments ref={wireframeRef} geometry={wireframeGeometry}>
        <lineBasicMaterial color="#00D4FF" opacity={0.3} transparent />
      </lineSegments>
    </group>
  );
}
