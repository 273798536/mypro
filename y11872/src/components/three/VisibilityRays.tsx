import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Seat } from '@/types';

interface VisibilityRaysProps {
  selectedSeat: Seat | null;
}

const TARGET_POSITIONS = {
  stage: new THREE.Vector3(0, 2, -15),
  leftScreen: new THREE.Vector3(-8, 3, -14),
  rightScreen: new THREE.Vector3(8, 3, -14),
};

export function VisibilityRays({ selectedSeat }: VisibilityRaysProps) {
  const linesRef = useRef<THREE.Group>(null);

  const rayData = useMemo(() => {
    if (!selectedSeat || !selectedSeat.visibility) return null;

    const seatPos = new THREE.Vector3(
      selectedSeat.position.x,
      selectedSeat.position.y + 0.6,
      selectedSeat.position.z
    );

    return Object.entries(TARGET_POSITIONS).map(([key, target]) => {
      const visibility = selectedSeat.visibility?.[key as keyof typeof selectedSeat.visibility];
      const points = [seatPos.clone(), target.clone()];
      const color = visibility?.visible ? '#2ecc71' : '#e74c3c';
      
      return { points, color, target: key };
    });
  }, [selectedSeat]);

  useFrame(({ clock }) => {
    if (linesRef.current && rayData) {
      linesRef.current.children.forEach((line, i) => {
        const material = (line as THREE.Line).material as THREE.LineBasicMaterial;
        material.opacity = 0.5 + Math.sin(clock.elapsedTime * 2 + i) * 0.2;
      });
    }
  });

  if (!selectedSeat || !rayData) return null;

  return (
    <group ref={linesRef}>
      {rayData.map((data) => (
        <line key={data.target}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array(
                data.points.flatMap((p) => [p.x, p.y, p.z])
              )}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={data.color}
            transparent
            opacity={0.7}
            linewidth={2}
          />
        </line>
      ))}
      {selectedSeat.visibility && (
        <group position={[selectedSeat.position.x, selectedSeat.position.y + 0.8, selectedSeat.position.z]}>
          <mesh position={[0, 0.3, 0]}>
            <coneGeometry args={[0.1, 0.3, 8]} />
            <meshBasicMaterial color="#d4af37" />
          </mesh>
        </group>
      )}
    </group>
  );
}
