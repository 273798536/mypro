import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MagnetConfig } from '../../types';
import { useConfigStore } from '../../store/useConfigStore';

interface Magnet3DProps {
  magnet: MagnetConfig;
  isSelected: boolean;
  onSelect: () => void;
}

export function Magnet3D({ magnet, isSelected, onSelect }: Magnet3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { updateMagnet, setInteraction } = useConfigStore();
  const dragPlane = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef<THREE.Vector3>(new THREE.Vector3());
  const isDragging = useRef(false);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.set(
        magnet.position.x,
        magnet.position.y,
        magnet.position.z
      );
      groupRef.current.rotation.set(
        magnet.rotation.x,
        magnet.rotation.y,
        magnet.rotation.z
      );
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    onSelect();
    isDragging.current = true;
    setInteraction({ isDragging: true, dragTarget: magnet.id });
    
    const planeIntersect = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(e.pointer, e.camera);
    
    if (groupRef.current) {
      dragPlane.current.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 1, 0),
        groupRef.current.position
      );
      
      if (raycaster.ray.intersectPlane(dragPlane.current, planeIntersect)) {
        dragOffset.current.copy(groupRef.current.position).sub(planeIntersect);
      }
    }
    
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: any) => {
    if (!isDragging.current || !groupRef.current) return;
    e.stopPropagation();
    
    const planeIntersect = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(e.pointer, e.camera);
    
    if (raycaster.ray.intersectPlane(dragPlane.current, planeIntersect)) {
      const newPosition = planeIntersect.add(dragOffset.current);
      updateMagnet(magnet.id, {
        position: {
          x: newPosition.x,
          y: newPosition.y,
          z: newPosition.z,
        },
      }, 'user');
    }
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    isDragging.current = false;
    setInteraction({ isDragging: false, dragTarget: null });
    e.target.releasePointerCapture(e.pointerId);
  };

  const poleColorN = '#ef4444';
  const poleColorS = '#3b82f6';
  const bodyColor = '#64748b';

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerOut={handlePointerUp}
      onPointerOver={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.25, 32]} />
        <meshStandardMaterial
          color={magnet.poleDirection === 'N' ? poleColorN : poleColorS}
          metalness={0.8}
          roughness={0.2}
          emissive={isSelected ? (magnet.poleDirection === 'N' ? poleColorN : poleColorS) : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>

      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.25, 32]} />
        <meshStandardMaterial
          color={magnet.poleDirection === 'N' ? poleColorS : poleColorN}
          metalness={0.8}
          roughness={0.2}
          emissive={isSelected ? (magnet.poleDirection === 'N' ? poleColorS : poleColorN) : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.1, 32]} />
        <meshStandardMaterial
          color={bodyColor}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      <mesh position={[0, 0.32, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      <mesh position={[0, -0.32, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {(hovered || isSelected) && (
        <mesh>
          <boxGeometry args={[0.5, 0.7, 0.5]} />
          <meshBasicMaterial
            color="#00d4ff"
            wireframe
            transparent
            opacity={0.5}
          />
        </mesh>
      )}
    </group>
  );
}
