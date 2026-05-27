import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Obstacle } from '@/types';

interface ObstacleMeshProps {
  obstacle: Obstacle;
  onDrag?: (x: number, y: number) => void;
  onRemove?: () => void;
}

export function ObstacleMesh({ obstacle, onDrag, onRemove }: ObstacleMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isDragging = useRef(false);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.y = 0.05;
    }
  });

  const getColor = () => {
    switch (obstacle.type) {
      case 'barrier':
        return '#8B4513';
      case 'reflector':
        return '#C0C0C0';
      case 'slit':
        return '#4A5568';
      case 'double_slit':
        return '#2D3748';
      default:
        return '#6B7280';
    }
  };

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    isDragging.current = true;
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const handlePointerMove = (e: any) => {
    if (!isDragging.current || !onDrag) return;
    e.stopPropagation();
    const point = e.point;
    onDrag(point.x, point.z);
  };

  const handleDoubleClick = (e: any) => {
    e.stopPropagation();
    if (onRemove) onRemove();
  };

  return (
    <group
      position={[obstacle.position.x, 0, obstacle.position.y]}
      rotation={[0, obstacle.rotation, 0]}
    >
      {obstacle.type === 'slit' ? (
        <group>
          <mesh
            ref={meshRef}
            position={[-(obstacle.size.width * 0.35), 0.05, 0]}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerUp}
            onDoubleClick={handleDoubleClick}
            castShadow
            receiveShadow
          >
            <boxGeometry
              args={[obstacle.size.width * 0.3, 0.1, obstacle.size.height]}
            />
            <meshStandardMaterial
              color={getColor()}
              transparent
              opacity={0.8}
              metalness={0.3}
              roughness={0.7}
            />
          </mesh>
          <mesh
            position={[obstacle.size.width * 0.35, 0.05, 0]}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerUp}
            onDoubleClick={handleDoubleClick}
            castShadow
            receiveShadow
          >
            <boxGeometry
              args={[obstacle.size.width * 0.3, 0.1, obstacle.size.height]}
            />
            <meshStandardMaterial
              color={getColor()}
              transparent
              opacity={0.8}
              metalness={0.3}
              roughness={0.7}
            />
          </mesh>
        </group>
      ) : obstacle.type === 'double_slit' ? (
        <group>
          <mesh
            ref={meshRef}
            position={[-(obstacle.size.width * 0.4), 0.05, 0]}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerUp}
            onDoubleClick={handleDoubleClick}
            castShadow
            receiveShadow
          >
            <boxGeometry
              args={[obstacle.size.width * 0.2, 0.1, obstacle.size.height]}
            />
            <meshStandardMaterial
              color={getColor()}
              transparent
              opacity={0.8}
              metalness={0.3}
              roughness={0.7}
            />
          </mesh>
          <mesh
            position={[0, 0.05, 0]}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerUp}
            onDoubleClick={handleDoubleClick}
            castShadow
            receiveShadow
          >
            <boxGeometry
              args={[obstacle.size.width * 0.2, 0.1, obstacle.size.height]}
            />
            <meshStandardMaterial
              color={getColor()}
              transparent
              opacity={0.8}
              metalness={0.3}
              roughness={0.7}
            />
          </mesh>
          <mesh
            position={[obstacle.size.width * 0.4, 0.05, 0]}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerUp}
            onDoubleClick={handleDoubleClick}
            castShadow
            receiveShadow
          >
            <boxGeometry
              args={[obstacle.size.width * 0.2, 0.1, obstacle.size.height]}
            />
            <meshStandardMaterial
              color={getColor()}
              transparent
              opacity={0.8}
              metalness={0.3}
              roughness={0.7}
            />
          </mesh>
        </group>
      ) : (
        <mesh
          ref={meshRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[obstacle.size.width, 0.1, obstacle.size.height]}
          />
          <meshStandardMaterial
            color={getColor()}
            transparent
            opacity={0.85}
            metalness={obstacle.type === 'reflector' ? 0.9 : 0.3}
            roughness={obstacle.type === 'reflector' ? 0.1 : 0.7}
          />
        </mesh>
      )}
      <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry
          args={[obstacle.size.width + 0.1, obstacle.size.height + 0.1, 0.01]}
        />
        <meshBasicMaterial
          color="#E63946"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
