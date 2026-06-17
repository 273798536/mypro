import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { locations as locationData } from '@/data/mockData';
import type { Location } from '@/types';

function LocationMarker({ location }: { location: Location }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const selectedLocationId = useAppStore((s) => s.selectedLocationId);
  const hoveredLocationId = useAppStore((s) => s.hoveredLocationId);
  const setSelectedLocationId = useAppStore((s) => s.setSelectedLocationId);
  const setHoveredLocationId = useAppStore((s) => s.setHoveredLocationId);

  const isSelected = selectedLocationId === location.id;
  const isHovered = hoveredLocationId === location.id;
  const isActive = isSelected || isHovered;

  useFrame((state) => {
    if (ringRef.current) {
      const t = state.clock.elapsedTime;
      ringRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.15);
      ringRef.current.rotation.z = t * 0.3;
    }
    if (meshRef.current) {
      const targetY = isActive ? 0.8 : 0.4;
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.1);
    }
  });

  const markerColor = isSelected ? '#d4a843' : isHovered ? '#e0be6a' : '#6b7280';

  return (
    <group position={[location.x, location.y, location.z]}>
      <mesh
        ref={meshRef}
        position={[0, 0.4, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          setHoveredLocationId(location.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          setHoveredLocationId(null);
          document.body.style.cursor = 'default';
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedLocationId(isSelected ? null : location.id);
        }}
      >
        <cylinderGeometry args={[0.25, 0.25, 0.15, 6]} />
        <meshStandardMaterial
          color={markerColor}
          emissive={markerColor}
          emissiveIntensity={isActive ? 0.6 : 0.2}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {isActive && (
        <mesh ref={ringRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.6, 6]} />
          <meshBasicMaterial
            color={markerColor}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {isActive && (
        <pointLight
          position={[0, 1.5, 0]}
          color={markerColor}
          intensity={2}
          distance={4}
        />
      )}
    </group>
  );
}

function Building({ position, scale }: { position: [number, number, number]; scale: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={scale} />
      <meshStandardMaterial
        color="#2a3a5c"
        transparent
        opacity={0.35}
        metalness={0.1}
        roughness={0.8}
      />
    </mesh>
  );
}

function UnloadingZone({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.5, 2.5]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.25}
        metalness={0.1}
        roughness={0.9}
      />
    </mesh>
  );
}

function Street() {
  return (
    <>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2, 10]} />
        <meshStandardMaterial color="#1a2236" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, 10]} />
        <meshStandardMaterial color="#3a4a6c" roughness={0.9} />
      </mesh>
    </>
  );
}

function MarketStructure() {
  return (
    <group>
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[8, 2.4, 6]} />
        <meshStandardMaterial
          color="#1e2d4a"
          transparent
          opacity={0.4}
          metalness={0.15}
          roughness={0.7}
        />
      </mesh>
      <mesh position={[0, 2.45, 0]}>
        <boxGeometry args={[8.2, 0.1, 6.2]} />
        <meshStandardMaterial
          color="#3a4a6c"
          transparent
          opacity={0.3}
          metalness={0.2}
          roughness={0.6}
        />
      </mesh>
      {[[-3, 0, 2], [3, 0, 2], [-3, 0, -2], [3, 0, -2]].map(([x, , z], i) => (
        <mesh key={i} position={[x, 0.5, z]}>
          <boxGeometry args={[0.15, 1, 0.15]} />
          <meshStandardMaterial color="#4a5a7c" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

export default function MarketScene() {
  return (
    <group>
      <ambientLight intensity={0.3} color="#8ba4c7" />
      <directionalLight
        position={[8, 12, 5]}
        intensity={1.2}
        color="#ffe4b5"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-5, 8, -3]} intensity={0.3} color="#b0c4de" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#141e30" roughness={0.95} />
      </mesh>

      <MarketStructure />

      <Building position={[-5, 1.5, 0]} scale={[1.5, 3, 4]} />
      <Building position={[5, 1.5, 0]} scale={[1.5, 3, 4]} />
      <Building position={[0, 2, -5.5]} scale={[6, 4, 1]} />

      <Street />

      <UnloadingZone position={[-3, 0.02, 2]} color="#d4a843" />
      <UnloadingZone position={[3, 0.02, 2]} color="#d4a843" />
      <UnloadingZone position={[-3, 0.02, -2]} color="#a0884a" />
      <UnloadingZone position={[3, 0.02, -2]} color="#a0884a" />

      {locationData.map((loc: Location) => (
        <LocationMarker key={loc.id} location={loc} />
      ))}

      <fog attach="fog" args={['#0f1b2d', 8, 18]} />
    </group>
  );
}
