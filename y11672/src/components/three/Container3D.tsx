import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Container as ContainerType } from '../../types';
import { useYardStore } from '../../store/useYardStore';

interface Container3DProps {
  container: ContainerType;
  isAlert: boolean;
  alertType?: 'stacked' | 'dangerous_adjacent' | 'expired' | null;
  isPickedUp: boolean;
}

const CONTAINER_WIDTH = 1;
const CONTAINER_HEIGHT = 0.8;
const CONTAINER_DEPTH = 1;

const getContainerColor = (container: ContainerType): string => {
  if (container.dangerousGoods.level > 0) {
    return container.dangerousGoods.level <= 3 ? '#F53F3F' : '#FF7D00';
  }
  
  switch (container.type) {
    case 'reefer':
      return '#165DFF';
    case 'tank':
      return '#722ED1';
    case 'open':
      return '#0FC6C2';
    default:
      return '#4E5969';
  }
};

export function Container3D({ container, isAlert, alertType, isPickedUp }: Container3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  const { selectedContainer, hoverContainer, selectContainer, viewMode } = useYardStore();
  const isSelected = selectedContainer === container.id;
  
  const x = (container.bay - 6) * CONTAINER_WIDTH * 1.1;
  const y = (container.tier - 1) * CONTAINER_HEIGHT + CONTAINER_HEIGHT / 2;
  const z = (container.row - 4) * CONTAINER_DEPTH * 1.3;
  
  useFrame((state) => {
    if (groupRef.current) {
      if (isPickedUp) {
        const targetY = y + 8;
        groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.05;
        groupRef.current.opacity = Math.max(0, (groupRef.current as any).opacity ?? 1 - 0.02);
      }
      
      if (isAlert && alertType === 'dangerous_adjacent') {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.03;
        groupRef.current.scale.setScalar(scale);
      }
    }
  });
  
  const baseColor = getContainerColor(container);
  const color = hovered || isSelected ? '#FFC53D' : baseColor;
  
  const showPickupHighlight = viewMode === 'pickup' && container.booking.pickupOrder > 0;
  const showDangerHighlight = viewMode === 'danger' && container.dangerousGoods.level > 0;
  
  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(true);
    hoverContainer(container.id);
    document.body.style.cursor = 'pointer';
  };
  
  const handlePointerOut = () => {
    setHovered(false);
    hoverContainer(null);
    document.body.style.cursor = 'auto';
  };
  
  const handleClick = (e: any) => {
    e.stopPropagation();
    selectContainer(isSelected ? null : container.id);
  };
  
  const edgesGeometry = new THREE.EdgesGeometry(
    new THREE.BoxGeometry(CONTAINER_WIDTH, CONTAINER_HEIGHT, CONTAINER_DEPTH)
  );
  
  return (
    <group
      ref={groupRef}
      position={[x, y, z]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[CONTAINER_WIDTH, CONTAINER_HEIGHT, CONTAINER_DEPTH]} />
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.7}
          transparent
          opacity={isPickedUp ? 0.3 : 1}
        />
      </mesh>
      
      <lineSegments>
        <primitive object={edgesGeometry} attach="geometry" />
        <lineBasicMaterial color="#1D2129" linewidth={1} />
      </lineSegments>
      
      {isAlert && (
        <mesh position={[0, CONTAINER_HEIGHT / 2 + 0.1, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color={alertType === 'dangerous_adjacent' || alertType === 'expired' ? '#F53F3F' : '#FF7D00'} />
        </mesh>
      )}
      
      {showPickupHighlight && (
        <mesh position={[0, -CONTAINER_HEIGHT / 2 - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.5, 32]} />
          <meshBasicMaterial color="#00B42A" side={THREE.DoubleSide} />
        </mesh>
      )}
      
      {showDangerHighlight && (
        <mesh position={[0, -CONTAINER_HEIGHT / 2 - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.5, 32]} />
          <meshBasicMaterial color="#F53F3F" side={THREE.DoubleSide} />
        </mesh>
      )}
      
      {isSelected && (
        <mesh>
          <boxGeometry args={[CONTAINER_WIDTH + 0.05, CONTAINER_HEIGHT + 0.05, CONTAINER_DEPTH + 0.05]} />
          <meshBasicMaterial color="#FFC53D" transparent opacity={0.2} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
}
