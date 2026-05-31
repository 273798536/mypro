import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DamGeometry } from '../../types';

interface DamModel3DProps {
  geometry: DamGeometry;
  showSection?: boolean;
  sectionPosition?: number;
}

export function DamModel3D({
  geometry,
  showSection = false,
  sectionPosition = 0,
}: DamModel3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const damMeshRef = useRef<THREE.Mesh>(null);

  const damShape = useMemo(() => {
    const shape = new THREE.Shape();
    const { width, height, upstreamSlope, downstreamSlope } = geometry;

    const upstreamBase = height * upstreamSlope;
    const downstreamBase = height * downstreamSlope;
    const topWidth = width - upstreamBase - downstreamBase;

    shape.moveTo(-width / 2, 0);
    shape.lineTo(-width / 2 + upstreamBase, height);
    shape.lineTo(-width / 2 + upstreamBase + topWidth, height);
    shape.lineTo(width / 2, 0);
    shape.lineTo(-width / 2, 0);

    return shape;
  }, [geometry]);

  const damGeometry = useMemo(() => {
    const extrudeSettings = {
      depth: geometry.depth,
      bevelEnabled: false,
    };
    return new THREE.ExtrudeGeometry(damShape, extrudeSettings);
  }, [damShape, geometry.depth]);

  const damMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide,
      clipShadows: true,
    });
  }, []);

  const clippingPlane = useMemo(() => {
    return new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  }, []);

  useFrame(() => {
    if (showSection) {
      clippingPlane.constant = sectionPosition;
      damMaterial.clippingPlanes = [clippingPlane];
    } else {
      damMaterial.clippingPlanes = [];
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, -geometry.depth / 2]}>
      <mesh
        ref={damMeshRef}
        geometry={damGeometry}
        material={damMaterial}
        castShadow
        receiveShadow
      />
      <mesh position={[0, 0.01, geometry.depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[geometry.width + 20, geometry.depth + 20]} />
        <meshStandardMaterial color={0x4a5568} roughness={0.9} />
      </mesh>
      <WaterSurface />
      <FoundationLayer />
      <SectionIndicator show={showSection} position={sectionPosition} depth={geometry.depth} />
    </group>
  );
}

function WaterSurface() {
  return (
    <mesh position={[0, 32, -8]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[80, 40]} />
      <meshStandardMaterial
        color={0x4299e1}
        transparent
        opacity={0.6}
        roughness={0.1}
        metalness={0.3}
      />
    </mesh>
  );
}

function FoundationLayer() {
  return (
    <mesh position={[0, -2, 0]}>
      <boxGeometry args={[120, 4, 50]} />
      <meshStandardMaterial color={0x5a4a3a} roughness={0.9} />
    </mesh>
  );
}

function SectionIndicator({
  show,
  position,
  depth,
}: {
  show: boolean;
  position: number;
  depth: number;
}) {
  if (!show) return null;

  return (
    <group position={[0, 20, position]}>
      <mesh>
        <planeGeometry args={[100, 50]} />
        <meshBasicMaterial
          color={0x2d9cdb}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 25, 0.01]}>
        <planeGeometry args={[100, 0.5]} />
        <meshBasicMaterial color={0x2d9cdb} />
      </mesh>
    </group>
  );
}
