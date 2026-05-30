import React from 'react';
import * as THREE from 'three';
import type { Container } from '../../types';

interface ContainerBoxProps {
  container: Container;
  minHeightFilter: number;
  maxHeightFilter: number;
}

export const ContainerBox: React.FC<ContainerBoxProps> = ({
  container,
  minHeightFilter,
  maxHeightFilter,
}) => {
  const totalHeight = container.position.y + container.height / 2;
  const isVisible = totalHeight >= minHeightFilter && totalHeight <= maxHeightFilter;

  if (!isVisible) return null;

  const getColor = () => {
    switch (container.status) {
      case 'overheight':
        return '#ff4d4f';
      case 'warning':
        return '#ff7d00';
      default:
        return '#165dff';
    }
  };

  return (
    <mesh position={[container.position.x, container.position.y, container.position.z]} castShadow>
      <boxGeometry args={[3.5, container.height, 2.5]} />
      <meshStandardMaterial
        color={getColor()}
        transparent
        opacity={0.85}
        metalness={0.3}
        roughness={0.5}
      />
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(3.5, container.height, 2.5)]} />
        <lineBasicMaterial color="#ffffff" opacity={0.3} transparent />
      </lineSegments>
    </mesh>
  );
};
