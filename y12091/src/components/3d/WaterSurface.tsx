import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RiverSection, FlowData, COLORS } from '../../types';

interface WaterSurfaceProps {
  sections: RiverSection[];
  flowData: FlowData[];
  currentTime: number;
}

export function WaterSurface({ sections, flowData, currentTime }: WaterSurfaceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const time = useRef(0);

  const { geometry, positions, waterLevels } = useMemo(() => {
    const sortedSections = [...sections].sort((a, b) => a.chainage - b.chainage);
    const hourMs = 3600 * 1000;

    const positions: number[] = [];
    const indices: number[] = [];
    const waterLevels: number[] = [];

    const flowBySection = flowData.reduce((acc, d) => {
      if (!acc[d.sectionId]) acc[d.sectionId] = [];
      acc[d.sectionId].push(d);
      return acc;
    }, {} as Record<string, FlowData[]>);

    sortedSections.forEach((section) => {
      const sectionFlows = flowBySection[section.id] || [];
      const sortedFlows = [...sectionFlows].sort((a, b) => a.timestamp - b.timestamp);

      let waterLevel = 14;

      if (sortedFlows.length > 0) {
        if (currentTime <= sortedFlows[0].timestamp) {
          waterLevel = sortedFlows[0].waterLevel;
        } else if (currentTime >= sortedFlows[sortedFlows.length - 1].timestamp) {
          waterLevel = sortedFlows[sortedFlows.length - 1].waterLevel;
        } else {
          for (let i = 1; i < sortedFlows.length; i++) {
            if (sortedFlows[i].timestamp >= currentTime) {
              const ratio = (currentTime - sortedFlows[i - 1].timestamp) /
                (sortedFlows[i].timestamp - sortedFlows[i - 1].timestamp);
              waterLevel = sortedFlows[i - 1].waterLevel +
                (sortedFlows[i].waterLevel - sortedFlows[i - 1].waterLevel) * ratio;
              break;
            }
          }
        }
      }

      waterLevels.push(waterLevel);

      const coords = section.coordinates;
      const minX = Math.min(...coords.map(c => c[0]));
      const maxX = Math.max(...coords.map(c => c[0]));

      for (let i = 0; i < 5; i++) {
        const x = minX + (maxX - minX) * (i / 4);
        positions.push(
          section.chainage * 0.1,
          x * 0.3,
          waterLevel * 0.5
        );
      }
    });

    const pointsPerSection = 5;
    for (let s = 0; s < sortedSections.length - 1; s++) {
      for (let p = 0; p < pointsPerSection - 1; p++) {
        const i = s * pointsPerSection + p;
        indices.push(i, i + pointsPerSection, i + 1);
        indices.push(i + 1, i + pointsPerSection, i + pointsPerSection + 1);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return { geometry, positions, waterLevels };
  }, [sections, flowData, currentTime]);

  useFrame((state, delta) => {
    time.current += delta * 2;

    if (meshRef.current) {
      const positionAttr = meshRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const posArray = positionAttr.array as Float32Array;

      for (let i = 0; i < posArray.length; i += 3) {
        const x = posArray[i];
        const y = posArray[i + 1];
        const wave = Math.sin(time.current + x * 0.5 + y * 0.3) * 0.05;
        posArray[i + 2] = positions[i + 2] + wave;
      }
      positionAttr.needsUpdate = true;
      meshRef.current.geometry.computeVertexNormals();
    }
  });

  const avgWaterLevel = waterLevels.length > 0
    ? waterLevels.reduce((a, b) => a + b, 0) / waterLevels.length
    : 14;

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry}>
        <meshPhongMaterial
          color={COLORS.primary}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          shininess={100}
          specular="#ffffff"
        />
      </mesh>

      <mesh position={[175, 0, avgWaterLevel * 0.5 + 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.8, 32]} />
        <meshBasicMaterial color={COLORS.primary} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
