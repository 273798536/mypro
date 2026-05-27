import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GeometryObject } from '@/types';
import { createGeometry } from '@/utils/geometry';

interface GeometryMeshProps {
  geometry: GeometryObject;
  isSelected: boolean;
  onClick: () => void;
}

export function GeometryMesh({ geometry, isSelected, onClick }: GeometryMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);

  const bufferGeometry = useMemo(() => createGeometry(geometry.type), [geometry.type]);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: geometry.color,
      transparent: geometry.opacity < 1,
      opacity: geometry.opacity,
      metalness: 0.1,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });
  }, [geometry.color, geometry.opacity]);

  const edgesGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(bufferGeometry);
  }, [bufferGeometry]);

  const edgesMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: isSelected ? '#0ea5e9' : '#ffffff',
      transparent: true,
      opacity: isSelected ? 1 : 0.3,
    });
  }, [isSelected]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.set(...geometry.position);
      meshRef.current.rotation.set(...geometry.rotation);
      meshRef.current.scale.set(...geometry.scale);
      meshRef.current.visible = geometry.visible;
    }
    if (edgesRef.current) {
      edgesRef.current.position.set(...geometry.position);
      edgesRef.current.rotation.set(...geometry.rotation);
      edgesRef.current.scale.set(...geometry.scale);
      edgesRef.current.visible = geometry.visible;
    }
  });

  if (!geometry.visible) return null;

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={bufferGeometry}
        material={material}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'grab';
        }}
      />
      <lineSegments
        ref={edgesRef}
        geometry={edgesGeometry}
        material={edgesMaterial}
      />
      {isSelected && (
        <mesh position={geometry.position} rotation={geometry.rotation} scale={geometry.scale}>
          <boxGeometry args={[2.1, 2.1, 2.1]} />
          <meshBasicMaterial color="#0ea5e9" wireframe transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}
