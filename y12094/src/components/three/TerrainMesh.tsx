import { useMemo } from 'react';
import * as THREE from 'three';
import { terrainData, calculateSlope, getRiskLevel } from '@/data/mockData';
import useAppStore from '@/store/useAppStore';

interface TerrainMeshProps {
  onClick?: (point: THREE.Vector3) => void;
}

export default function TerrainMesh({ onClick }: TerrainMeshProps) {
  const slopeThreshold = useAppStore((state) => state.slopeThreshold);
  const rainfallThreshold = useAppStore((state) => state.rainfallThreshold);
  const currentTimeIndex = useAppStore((state) => state.currentTimeIndex);
  const rainfallData = useMemo(() => {
    const data = [];
    const startDate = new Date('2024-05-01');
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const isMissing = i === 7 || i === 14 || i === 21;
      data.push({
        timestamp: date.toISOString().split('T')[0],
        rainfall: isMissing ? 0 : Math.floor(Math.random() * 150 + (i > 10 ? 30 : 10)),
        isMissing,
      });
    }
    return data;
  }, []);

  const { geometry, colors } = useMemo(() => {
    const { width, height, resolution, elevation } = terrainData;
    const geo = new THREE.PlaneGeometry(width, height, resolution - 1, resolution - 1);
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position;
    const colorArray = new Float32Array(positions.count * 3);

    for (let i = 0; i < positions.count; i++) {
      const x = (positions.getX(i) / width + 0.5) * width;
      const z = (positions.getZ(i) / height + 0.5) * height;
      
      const gridX = Math.floor((x / width) * resolution);
      const gridZ = Math.floor((z / height) * resolution);
      const clampedX = Math.max(0, Math.min(resolution - 1, gridX));
      const clampedZ = Math.max(0, Math.min(resolution - 1, gridZ));
      
      const h = elevation[clampedZ][clampedX];
      positions.setY(i, h);

      const slope = calculateSlope(x, z);
      const rainfall = rainfallData[currentTimeIndex]?.rainfall || 0;
      const riskLevel = getRiskLevel(slope, rainfall, slopeThreshold, rainfallThreshold);

      let color: THREE.Color;
      switch (riskLevel) {
        case 'critical':
          color = new THREE.Color(0xdc2626);
          break;
        case 'high':
          color = new THREE.Color(0xf97316);
          break;
        case 'medium':
          color = new THREE.Color(0xeab308);
          break;
        default:
          color = new THREE.Color(0x22c55e);
      }

      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    geo.computeVertexNormals();

    return { geometry: geo, colors: colorArray };
  }, [slopeThreshold, rainfallThreshold, currentTimeIndex, rainfallData]);

  const handleClick = (event: any) => {
    event.stopPropagation();
    if (onClick) {
      onClick(event.point);
    }
  };

  return (
    <mesh geometry={geometry} receiveShadow onClick={handleClick}>
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}
