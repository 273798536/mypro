import { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import { NetworkNode, NODE_TYPE_COLORS, RISK_LEVEL_COLORS } from '../../types';

interface GraphNodeProps {
  node: NetworkNode;
  position: { x: number; y: number; z: number };
  isSelected: boolean;
  isInPath: boolean;
  showLabel: boolean;
  animationEnabled: boolean;
  onClick: (nodeId: string) => void;
  onPointerOver: (nodeId: string) => void;
  onPointerOut: () => void;
  onDragEnd: (nodeId: string, position: { x: number; y: number; z: number }) => void;
}

export function GraphNode({
  node,
  position,
  isSelected,
  isInPath,
  showLabel,
  animationEnabled,
  onClick,
  onPointerOver,
  onPointerOut,
  onDragEnd,
}: GraphNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster());

  const baseColor = node.isBlacklist ? '#ef4444' : NODE_TYPE_COLORS[node.type];
  const riskColor = RISK_LEVEL_COLORS[node.riskLevel];
  
  const getScale = () => {
    if (isSelected) return 1.5;
    if (hovered) return 1.2;
    if (node.isBlacklist) return 1.1;
    return 1;
  };

  const getNodeSize = () => {
    const baseSize = 0.4;
    const riskMultiplier = { low: 1, medium: 1.1, high: 1.2, critical: 1.4 };
    return baseSize * riskMultiplier[node.riskLevel];
  };

  const handlePointerDown = useCallback((event: any) => {
    event.stopPropagation();
    setIsDragging(true);
    
    const camera = event.camera;
    const planeIntersect = new THREE.Vector3();
    
    raycaster.current.setFromCamera(event.pointer, camera);
    dragPlane.current.setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new THREE.Vector3()).negate(),
      new THREE.Vector3(position.x, position.y, position.z)
    );
    
    if (raycaster.current.ray.intersectPlane(dragPlane.current, planeIntersect)) {
      dragOffset.current.copy(planeIntersect).sub(new THREE.Vector3(position.x, position.y, position.z));
    }
  }, [position]);

  const handlePointerMove = useCallback((event: any) => {
    if (!isDragging || !meshRef.current) return;
    event.stopPropagation();
    
    const camera = event.camera;
    const planeIntersect = new THREE.Vector3();
    
    raycaster.current.setFromCamera(event.pointer, camera);
    if (raycaster.current.ray.intersectPlane(dragPlane.current, planeIntersect)) {
      const newPos = planeIntersect.sub(dragOffset.current);
      meshRef.current.position.set(newPos.x, newPos.y, newPos.z);
    }
  }, [isDragging]);

  const handlePointerUp = useCallback((event: any) => {
    event.stopPropagation();
    if (isDragging && meshRef.current) {
      onDragEnd(node.id, {
        x: meshRef.current.position.x,
        y: meshRef.current.position.y,
        z: meshRef.current.position.z,
      });
    }
    setIsDragging(false);
  }, [isDragging, node.id, onDragEnd]);

  useFrame((state) => {
    if (!meshRef.current || isDragging) return;
    
    if (animationEnabled && !isDragging) {
      const time = state.clock.getElapsedTime();
      const pulse = 1 + Math.sin(time * 2 + position.x) * 0.05;
      meshRef.current.scale.setScalar(getScale() * pulse);
    }
  });

  const nodeContent = (
    <group position={[position.x, position.y, position.z]}>
      <Sphere
        ref={meshRef}
        args={[getNodeSize(), 32, 32]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          onPointerOut();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onPointerOver(node.id);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(node.id);
        }}
      >
        <meshStandardMaterial
          color={baseColor}
          emissive={isSelected || isInPath || node.isBlacklist ? riskColor : baseColor}
          emissiveIntensity={isSelected ? 0.8 : isInPath ? 0.5 : node.isBlacklist ? 0.4 : hovered ? 0.3 : 0.1}
          metalness={0.3}
          roughness={0.2}
        />
      </Sphere>
      
      {(isSelected || hovered) && (
        <Sphere args={[getNodeSize() * 1.3, 32, 32]}>
          <meshBasicMaterial
            color={riskColor}
            transparent
            opacity={0.2}
          />
        </Sphere>
      )}
      
      {showLabel && (
        <Text
          position={[0, getNodeSize() + 0.3, 0]}
          fontSize={0.25}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {node.label}
        </Text>
      )}
      
      {node.isBlacklist && (
        <Text
          position={[0, -getNodeSize() - 0.3, 0]}
          fontSize={0.2}
          color="#ef4444"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          黑名单
        </Text>
      )}
    </group>
  );

  if (animationEnabled && !isDragging) {
    return (
      <Float
        speed={2}
        rotationIntensity={0.1}
        floatIntensity={0.2}
        floatingRange={[-0.1, 0.1]}
      >
        {nodeContent}
      </Float>
    );
  }

  return nodeContent;
}
