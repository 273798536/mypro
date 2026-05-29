import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Obstacle } from '@/types';

interface ObstacleMeshProps {
  obstacle: Obstacle;
}

const ObstacleMesh: React.FC<ObstacleMeshProps> = ({ obstacle }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      meshRef.current.scale.setScalar(pulse);
    }
    if (edgesRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      edgesRef.current.scale.setScalar(pulse);
    }
  });

  const renderGeometry = () => {
    switch (obstacle.type) {
      case 'box':
        return (
          <boxGeometry
            args={[obstacle.size[0], obstacle.size[1], obstacle.size[2]]}
          />
        );
      case 'sphere':
        return (
          <sphereGeometry
            args={[obstacle.size[0] / 2, 16, 16]}
          />
        );
      case 'cylinder':
        return (
          <cylinderGeometry
            args={[obstacle.size[0] / 2, obstacle.size[0] / 2, obstacle.size[1], 16]}
          />
        );
      default:
        return (
          <boxGeometry
            args={[obstacle.size[0], obstacle.size[1], obstacle.size[2]]}
          />
        );
    }
  };

  return (
    <group
      position={obstacle.position}
      rotation={obstacle.rotation}
    >
      <mesh ref={meshRef}>
        {renderGeometry()}
        <meshStandardMaterial
          color={obstacle.color}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments ref={edgesRef}>
        {obstacle.type === 'box' ? (
          <edgesGeometry
            args={[new THREE.BoxGeometry(
              obstacle.size[0],
              obstacle.size[1],
              obstacle.size[2]
            )]}
          />
        ) : obstacle.type === 'sphere' ? (
          <edgesGeometry
            args={[new THREE.SphereGeometry(obstacle.size[0] / 2, 16, 16)]}
          />
        ) : (
          <edgesGeometry
            args={[new THREE.CylinderGeometry(
              obstacle.size[0] / 2,
              obstacle.size[0] / 2,
              obstacle.size[1],
              16
            )]}
          />
        )}
        <lineBasicMaterial
          color={obstacle.color}
          transparent
          opacity={0.8}
        />
      </lineSegments>
    </group>
  );
};

export const Obstacles: React.FC = () => {
  const { obstacles } = useWorkspaceStore();

  return (
    <group>
      {obstacles.map((obstacle) => (
        <ObstacleMesh key={obstacle.id} obstacle={obstacle} />
      ))}
    </group>
  );
};

interface GridFloorProps {
  size?: number;
  divisions?: number;
}

export const GridFloor: React.FC<GridFloorProps> = ({ size = 4, divisions = 20 }) => {
  return (
    <group position={[0, -0.05, 0]}>
      <gridHelper
        args={[size, divisions, 0x00aacc, 0x006677]}
        position={[0, 0, 0]}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          color="#0a0e1a"
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  );
};

interface AxesHelperProps {
  size?: number;
}

export const AxesHelper: React.FC<AxesHelperProps> = ({ size = 0.5 }) => {
  return (
    <group position={[-1.5, -0.04, -1.5]}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={6}
            array={new Float32Array([
              0, 0, 0, size, 0, 0,
              0, 0, 0, 0, size, 0,
              0, 0, 0, 0, 0, size,
            ])}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={6}
            array={new Float32Array([
              1, 0, 0, 1, 0.3, 0,
              0, 1, 0, 0.3, 1, 0,
              0, 0.3, 1, 0, 0, 1,
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial vertexColors />
      </lineSegments>
    </group>
  );
};
