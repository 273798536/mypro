import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DetectionIssue } from '../../types';

interface IssueMarkerProps {
  issue: DetectionIssue;
  onClick: () => void;
}

export function IssueMarker({ issue, onClick }: IssueMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const position = issue.position || [0, 0, 0];

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      groupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.1;
          child.scale.setScalar(scale);
        }
      });
    }
  });

  const getColor = () => {
    switch (issue.severity) {
      case 'high':
        return 0xff4444;
      case 'medium':
        return 0xffaa00;
      case 'low':
        return 0x4488ff;
      default:
        return 0x888888;
    }
  };

  const getSize = () => {
    switch (issue.severity) {
      case 'high':
        return 8;
      case 'medium':
        return 6;
      case 'low':
        return 4;
      default:
        return 5;
    }
  };

  return (
    <group ref={groupRef} position={position as [number, number, number]}>
      <mesh onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <ringGeometry args={[getSize() * 0.7, getSize(), 32]} />
        <meshBasicMaterial
          color={getColor()}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      <mesh>
        <sphereGeometry args={[getSize() * 0.3, 16, 16]} />
        <meshBasicMaterial
          color={getColor()}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      <mesh>
        <coneGeometry args={[getSize() * 0.4, getSize() * 1.5, 4]} />
        <meshBasicMaterial
          color={getColor()}
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}
