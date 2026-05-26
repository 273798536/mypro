import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TransactionEdge } from '../../types';

interface NetworkEdgeProps {
  edge: TransactionEdge;
  startPos: { x: number; y: number; z: number };
  endPos: { x: number; y: number; z: number };
  isHighlighted: boolean;
  isDimmed: boolean;
  onClick: () => void;
}

export const NetworkEdge = ({
  edge,
  startPos,
  endPos,
  isHighlighted,
  isDimmed,
  onClick,
}: NetworkEdgeProps) => {
  const lineRef = useRef<THREE.Line>(null);
  const glowRef = useRef<THREE.Line>(null);

  const { curve, color } = useMemo(() => {
    const start = new THREE.Vector3(startPos.x, startPos.y, startPos.z);
    const end = new THREE.Vector3(endPos.x, endPos.y, endPos.z);
    
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const distance = start.distanceTo(end);
    midPoint.z += distance * 0.2;
    
    const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    const edgeColor = isHighlighted ? '#00ff88' : '#00f5ff';
    
    return { curve: geometry, color: edgeColor };
  }, [startPos, endPos, isHighlighted]);

  useFrame((state) => {
    if (!lineRef.current || !glowRef.current) return;

    const time = state.clock.getElapsedTime();
    const opacity = isDimmed && !isHighlighted ? 0.1 : isHighlighted ? 0.9 : 0.4;
    const pulseOpacity = opacity * (0.8 + Math.sin(time * 2 + edge.amount) * 0.2);
    
    (lineRef.current.material as THREE.LineBasicMaterial).opacity = pulseOpacity;
    (glowRef.current.material as THREE.LineBasicMaterial).opacity = pulseOpacity * 0.3;
  });

  const lineWidth = isHighlighted ? 3 : Math.min(2, Math.log(edge.amount + 1) * 0.3 + 0.5);

  return (
    <group onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <primitive object={new THREE.Line()} ref={lineRef as any} geometry={curve}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={0.5}
          linewidth={lineWidth}
        />
      </primitive>
      <primitive object={new THREE.Line()} ref={glowRef as any} geometry={curve}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          linewidth={lineWidth * 3}
        />
      </primitive>
    </group>
  );
};
