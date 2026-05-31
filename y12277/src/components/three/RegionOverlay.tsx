import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RegionCoord, ANOMALY_COLORS } from '../../types';

interface RegionOverlayProps {
  regionCoords: RegionCoord[];
}

export function RegionOverlay({ regionCoords }: RegionOverlayProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;

    groupRef.current.children.forEach((child, index) => {
      const mesh = child as THREE.Mesh;
      if (mesh.material instanceof THREE.MeshBasicMaterial) {
        const pulse = 0.3 + 0.15 * Math.sin(time * 2 + index * 0.5);
        mesh.material.opacity = pulse;
      }
    });
  });

  const overlappingRegions = regionCoords.filter(
    coord => coord.overlappingWith.length > 0
  );

  return (
    <group ref={groupRef}>
      {overlappingRegions.map((coord) => (
        <group key={coord.id}>
          <mesh position={[coord.centerX, 0.05, coord.centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[coord.radius * 0.7, coord.radius, 32]} />
            <meshBasicMaterial
              color={ANOMALY_COLORS.region_overlap}
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
          
          <mesh position={[coord.centerX, 0.06, coord.centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[coord.radius * 0.7, 32]} />
            <meshBasicMaterial
              color={ANOMALY_COLORS.region_overlap}
              transparent
              opacity={0.15}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}

      {overlappingRegions.map((coord) =>
        coord.overlappingWith.map((targetId) => {
          const targetCoord = regionCoords.find(c => c.institutionId === targetId);
          if (!targetCoord) return null;

          const start = new THREE.Vector3(coord.centerX, 0.1, coord.centerZ);
          const end = new THREE.Vector3(targetCoord.centerX, 0.1, targetCoord.centerZ);
          const mid = start.clone().add(end).multiplyScalar(0.5);
          mid.y = 0.5;

          const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
          const points = curve.getPoints(20);
          const geometry = new THREE.BufferGeometry().setFromPoints(points);

          return (
            <line key={`${coord.id}-${targetId}`}>
              <bufferGeometry attach="geometry" {...geometry} />
              <lineBasicMaterial
                attach="material"
                color={ANOMALY_COLORS.region_overlap}
                transparent
                opacity={0.6}
                linewidth={2}
              />
            </line>
          );
        })
      )}
    </group>
  );
}
