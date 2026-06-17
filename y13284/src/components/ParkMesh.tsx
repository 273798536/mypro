import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { Park } from '@/shared/types';
import { useBusinessStore } from '@/stores/useBusinessStore';
import { lngLatToXZ } from '@/utils/lngLatTo3d';

interface ParkMeshProps {
  park: Park;
}

export default function ParkMesh({ park }: ParkMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const selectedId = useBusinessStore((s) => s.selectedId);
  const complaints = useBusinessStore((s) => s.complaints);

  const selectedComplaint = complaints.find((c) => c.id === selectedId);
  const affectedParkIds = selectedComplaint?.coordIssue?.affectedParkIds ?? [];
  const isAffected = affectedParkIds.includes(park.id);

  const { shape, edgeGeometry } = useMemo(() => {
    const shape = new THREE.Shape();
    const points: THREE.Vector3[] = [];

    park.polygon.forEach(([lng, lat], i) => {
      const { x, z } = lngLatToXZ(lng, lat, 0.1);
      points.push(new THREE.Vector3(x, 0.1, z));
      if (i === 0) {
        shape.moveTo(x, z);
      } else {
        shape.lineTo(x, z);
      }
    });
    shape.closePath();

    const edgePoints: THREE.Vector3[] = [];
    for (let i = 0; i < points.length; i++) {
      edgePoints.push(points[i]);
      edgePoints.push(points[(i + 1) % points.length]);
    }
    const edgeGeometry = new THREE.BufferGeometry().setFromPoints(edgePoints);

    return { shape, edgeGeometry };
  }, [park.polygon]);

  useFrame(({ clock }) => {
    if (meshRef.current && isAffected) {
      const t = clock.getElapsedTime();
      const opacity = 0.25 + 0.2 * (0.5 + 0.5 * Math.sin(t * 2));
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = opacity;
    }
  });

  const baseColor = isAffected ? '#ef4444' : '#10b981';
  const baseOpacity = isAffected ? 0.35 : 0.35;

  return (
    <group>
      <mesh ref={meshRef} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: 0.5,
              bevelEnabled: false,
            },
          ]}
        />
        <meshStandardMaterial
          color={baseColor}
          transparent
          opacity={baseOpacity}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments geometry={edgeGeometry}>
        <lineBasicMaterial color="#22d3ee" linewidth={2} />
      </lineSegments>
    </group>
  );
}
