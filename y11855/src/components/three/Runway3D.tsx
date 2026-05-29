import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Runway } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { rotatePoint } from '../../utils/geometry';

interface Runway3DProps {
  runway: Runway;
}

export function Runway3D({ runway }: Runway3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const runwayRef = useRef<THREE.Mesh>(null);
  const selectedElement = useAppStore(state => state.selectedElement);
  const visible = useAppStore(state => state.visibleLayers.runway);
  const setSelectedElement = useAppStore(state => state.setSelectedElement);

  const isSelected = selectedElement?.type === 'runway' && selectedElement.id === runway.id;

  const { centerX, centerZ, heading } = useMemo(() => {
    const [x, y, z] = runway.coordinates;
    return { centerX: x, centerZ: y, heading: runway.heading };
  }, [runway]);

  const runwayMarkings = useMemo(() => {
    const markings: Array<{
      position: [number, number, number];
      size: [number, number];
    }> = [];

    const dashLength = 30;
    const dashGap = 20;
    const dashWidth = 4;
    const totalLength = runway.length;
    const segments = Math.floor(totalLength / (dashLength + dashGap));

    for (let i = 0; i < segments; i++) {
      const z = -totalLength / 2 + i * (dashLength + dashGap) + dashLength / 2;
      markings.push({
        position: [0, 0.02, z],
        size: [dashWidth, dashLength]
      });
    }

    for (let side = -1; side <= 1; side += 2) {
      const edgeX = side * (runway.width / 2 - 1.5);
      for (let i = 0; i < segments; i++) {
        const z = -totalLength / 2 + i * (dashLength + dashGap) + dashLength / 2;
        markings.push({
          position: [edgeX, 0.02, z],
          size: [3, dashLength]
        });
      }
    }

    return markings;
  }, [runway.length, runway.width]);

  useFrame((state) => {
    if (runwayRef.current && isSelected) {
      const material = runwayRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedElement({ type: 'runway', id: runway.id });
  };

  if (!visible) return null;

  return (
    <group ref={groupRef} position={[centerX, 0, centerZ]} rotation={[0, (heading * Math.PI) / 180, 0]}>
      <mesh
        ref={runwayRef}
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[runway.width, runway.length, 0.5]} />
        <meshStandardMaterial
          color={isSelected ? 0x3b82f6 : 0x4a5568}
          emissive={isSelected ? 0x3b82f6 : 0x000000}
          emissiveIntensity={isSelected ? 0.3 : 0}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[runway.width + 4, runway.length + 4, 0.1]} />
        <meshStandardMaterial color={0x2d3748} />
      </mesh>

      {runwayMarkings.map((marking, idx) => (
        <mesh
          key={idx}
          position={marking.position}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <boxGeometry args={[marking.size[0], marking.size[1], 0.02]} />
          <meshStandardMaterial color={0xffffff} />
        </mesh>
      ))}

      <mesh position={[0, 0.015, -runway.length / 2 + 50]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[runway.width - 10, 80, 0.02]} />
        <meshStandardMaterial color={0xffffff} />
      </mesh>

      <mesh position={[0, 0.015, runway.length / 2 - 50]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[runway.width - 10, 80, 0.02]} />
        <meshStandardMaterial color={0xffffff} />
      </mesh>
    </group>
  );
}
