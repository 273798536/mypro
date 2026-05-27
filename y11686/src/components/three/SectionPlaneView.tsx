import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SectionPlane, GeometryObject } from '@/types';
import { getIntersectionPoints } from '@/utils/geometry';

interface SectionPlaneViewProps {
  plane: SectionPlane;
  geometries: GeometryObject[];
  isSelected: boolean;
  onClick: () => void;
}

export function SectionPlaneView({ plane, geometries, isSelected, onClick }: SectionPlaneViewProps) {
  const planeRef = useRef<THREE.Mesh>(null);
  const intersectionRef = useRef<any>(null);

  const intersectionPoints = useMemo(() => {
    if (!plane.showIntersection) return [];
    const allPoints: THREE.Vector3[] = [];
    geometries.forEach((g) => {
      if (g.visible) {
        allPoints.push(...getIntersectionPoints(plane, g));
      }
    });
    return allPoints;
  }, [plane, geometries]);

  useFrame(() => {
    if (!planeRef.current) return;

    const normal = new THREE.Vector3(...plane.normal).normalize();
    const position = new THREE.Vector3(...plane.position);

    planeRef.current.position.copy(position);
    planeRef.current.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal
    );

    if (intersectionRef.current && intersectionPoints.length > 0) {
      const sortedPoints = [...intersectionPoints].sort((a, b) => {
        const angleA = Math.atan2(a.y - position.y, a.x - position.x);
        const angleB = Math.atan2(b.y - position.y, b.x - position.x);
        return angleA - angleB;
      });
      if (sortedPoints.length > 2) {
        sortedPoints.push(sortedPoints[0].clone());
      }
      intersectionRef.current.geometry.setFromPoints(sortedPoints);
    }
  });

  if (!plane.visible) return null;

  const borderColor = isSelected ? '#0ea5e9' : plane.intersectionColor;

  return (
    <group onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh ref={planeRef}>
        <planeGeometry args={[4, 4]} />
        <meshBasicMaterial
          color={plane.planeColor}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={planeRef as any}>
        <planeGeometry args={[4, 4]} />
        <meshBasicMaterial
          color={borderColor}
          wireframe
          transparent
          opacity={isSelected ? 1 : 0.5}
        />
      </mesh>

      {plane.showIntersection && intersectionPoints.length > 2 && (
        <line ref={intersectionRef}>
          <bufferGeometry />
          <lineBasicMaterial color={plane.intersectionColor} linewidth={3} />
        </line>
      )}

      <mesh position={plane.position}>
        <sphereGeometry args={[isSelected ? 0.08 : 0.05, 16, 16]} />
        <meshBasicMaterial color={borderColor} />
      </mesh>

      <group position={plane.position}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.15]}>
          <coneGeometry args={[0.1, 0.2, 6]} />
          <meshBasicMaterial color={borderColor} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.05]}>
          <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
          <meshBasicMaterial color={borderColor} />
        </mesh>
      </group>
    </group>
  );
}
