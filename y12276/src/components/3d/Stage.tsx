import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { stageData, stageDimensions } from '@/data/mockStage';
import { useObjectSelection } from '@/hooks/useObjectSelection';

export function Stage() {
  const groupRef = useRef<THREE.Group>(null);
  const { selectedObjectId, handleObjectClick, handleBackgroundClick } = useObjectSelection();
  const isSelected = selectedObjectId === stageData.id;

  const edgeGeometry = useMemo(() => {
    const geometry = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(stageDimensions.width, stageDimensions.height, stageDimensions.depth)
    );
    return geometry;
  }, []);

  const surfaceGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(stageDimensions.width, stageDimensions.depth);
  }, []);

  useFrame((state) => {
    if (groupRef.current && isSelected) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      groupRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group
      ref={groupRef}
      position={stageData.position}
      rotation={stageData.rotation}
    >
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onClick={(e) => handleObjectClick(e, stageData.id)}
        onPointerMissed={handleBackgroundClick}
      >
        <primitive object={surfaceGeometry} attach="geometry" />
        <meshStandardMaterial
          color={isSelected ? '#3d3d5c' : stageData.color}
          transparent
          opacity={0.9}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      <lineSegments
        position={[0, stageDimensions.height / 2, 0]}
        onClick={(e) => handleObjectClick(e, stageData.id)}
      >
        <primitive object={edgeGeometry} attach="geometry" />
        <lineBasicMaterial
          color={isSelected ? '#00ff88' : '#4a5568'}
          linewidth={2}
          transparent
          opacity={isSelected ? 1 : 0.6}
        />
      </lineSegments>

      <gridHelper
        args={[50, 50, '#333355', '#222244']}
        position={[0, 0.01, 0]}
      />
    </group>
  );
}
