import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { NetworkEdge, RELATION_TYPE_LABELS } from '../../types';

interface GraphEdgeProps {
  edge: NetworkEdge;
  startPosition: { x: number; y: number; z: number };
  endPosition: { x: number; y: number; z: number };
  isInPath: boolean;
  isDuplicate: boolean;
  animationEnabled: boolean;
}

export function GraphEdge({
  edge,
  startPosition,
  endPosition,
  isInPath,
  isDuplicate,
  animationEnabled,
}: GraphEdgeProps) {
  const lineRef = useRef<any>(null);
  const flowProgressRef = useRef(0);

  const points = useMemo(() => {
    return [
      new THREE.Vector3(startPosition.x, startPosition.y, startPosition.z),
      new THREE.Vector3(endPosition.x, endPosition.y, endPosition.z),
    ];
  }, [startPosition, endPosition]);

  const getColor = () => {
    if (isInPath) return '#f59e0b';
    if (isDuplicate) return '#f43f5e';
    return '#475569';
  };

  const getLineWidth = () => {
    if (isInPath) return 3;
    if (isDuplicate) return 2;
    return 1;
  };

  const getOpacity = () => {
    if (isInPath) return 1;
    if (isDuplicate) return 0.8;
    return 0.4;
  };

  useFrame((state) => {
    if (lineRef.current && animationEnabled && isInPath) {
      flowProgressRef.current = (flowProgressRef.current + 0.02) % 1;
      
      const material = lineRef.current.material as THREE.LineBasicMaterial;
      material.opacity = getOpacity() * (0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.5);
    }
  });

  const midPoint = new THREE.Vector3(
    (startPosition.x + endPosition.x) / 2,
    (startPosition.y + endPosition.y) / 2,
    (startPosition.z + endPosition.z) / 2
  );

  return (
    <group>
      <Line
        ref={lineRef}
        points={points}
        color={getColor()}
        lineWidth={getLineWidth()}
        transparent
        opacity={getOpacity()}
      />
      
      {isDuplicate && (
        <Line
          points={points}
          color="#f43f5e"
          lineWidth={4}
          transparent
          opacity={0.3}
          dashed
          dashSize={0.5}
          gapSize={0.3}
        />
      )}
      
      {isInPath && (
        <mesh position={midPoint}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}
