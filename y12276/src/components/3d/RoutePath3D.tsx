import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Route } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useConflictHighlight } from '@/hooks/useConflictHighlight';
import { getPositionOnRoute, createRoutePathGeometry } from '@/utils/threeHelpers';
import { useObjectSelection } from '@/hooks/useObjectSelection';

interface RoutePath3DProps {
  route: Route;
}

export function RoutePath3D({ route }: RoutePath3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  const { currentTime, filters } = useAppStore();
  const { selectedObjectId, handleObjectClick } = useObjectSelection();
  const { getConflictForObject, getConflictColor } = useConflictHighlight();

  const isSelected = selectedObjectId === route.id;
  const showRoute = filters.objectTypes.includes('route');
  const conflict = getConflictForObject(route.musicianId);

  const [markerPosition, setMarkerPosition] = useState<THREE.Vector3 | null>(null);

  const tubeGeometry = useMemo(() => {
    if (route.waypoints.length < 2) return null;
    return createRoutePathGeometry(route.waypoints);
  }, [route.waypoints]);

  useEffect(() => {
    const pos = getPositionOnRoute(route, currentTime);
    if (pos) {
      setMarkerPosition(pos);
    }
  }, [currentTime, route]);

  useFrame((state) => {
    if (markerRef.current && markerPosition) {
      markerRef.current.position.copy(markerPosition);
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.15;
      markerRef.current.scale.setScalar(pulse);
    }
    if (groupRef.current && conflict) {
      const flash = Math.abs(Math.sin(state.clock.elapsedTime * 4));
      groupRef.current.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.material && mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.emissiveIntensity = flash * 1.5;
        }
      });
    }
  });

  if (!showRoute || !tubeGeometry) return null;

  const displayColor = conflict ? getConflictColor(conflict.type) : route.color;

  return (
    <group
      ref={groupRef}
      onClick={(e) => handleObjectClick(e, route.id)}
    >
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={isSelected ? 0.8 : conflict ? 1 : 0.4}
          transparent
          opacity={isSelected ? 0.8 : 0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {markerPosition && (
        <group>
          <mesh ref={markerRef}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial
              color={route.color}
              emissive={route.color}
              emissiveIntensity={2}
              transparent
              opacity={0.9}
            />
          </mesh>

          <mesh position={markerPosition}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial
              color={route.color}
              transparent
              opacity={0.3}
            />
          </mesh>
        </group>
      )}

      {route.waypoints.map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial
            color={route.color}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}
