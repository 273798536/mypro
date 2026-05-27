import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useFunnelStore } from '@/store/funnelStore';

const LAYER_COLORS = [
  new THREE.Color('#4FC3F7'),
  new THREE.Color('#29B6F6'),
  new THREE.Color('#0288D1'),
  new THREE.Color('#F0B429'),
  new THREE.Color('#FF8F00'),
];

const LAYER_HEIGHT = 0.6;
const LAYER_GAP = 0.15;
const MAX_RADIUS = 2.8;

interface FunnelLayerProps {
  index: number;
  topRadius: number;
  bottomRadius: number;
  yPos: number;
  isHovered: boolean;
  isSelected: boolean;
  onPointerOver: () => void;
  onPointerOut: () => void;
  onClick: () => void;
  hasAnomaly: boolean;
}

function FunnelLayer({
  index,
  topRadius,
  bottomRadius,
  yPos,
  isHovered,
  isSelected,
  onPointerOver,
  onPointerOut,
  onClick,
  hasAnomaly,
}: FunnelLayerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const timeOffset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshPhysicalMaterial;
      if (isHovered || isSelected) {
        material.emissiveIntensity = 0.3 + Math.sin(state.clock.elapsedTime * 3 + timeOffset) * 0.1;
      } else {
        material.emissiveIntensity = 0.05;
      }
    }
    if (glowRef.current) {
      const scale = isHovered || isSelected ? 1.02 + Math.sin(state.clock.elapsedTime * 2 + timeOffset) * 0.01 : 1;
      glowRef.current.scale.set(scale, 1, scale);
      const gMat = glowRef.current.material as THREE.MeshBasicMaterial;
      gMat.opacity = isHovered || isSelected ? 0.15 : 0;
    }
  });

  const color = LAYER_COLORS[index % LAYER_COLORS.length];
  const anomalyColor = hasAnomaly ? new THREE.Color('#EF4444') : color;

  return (
    <group position={[0, yPos, 0]}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <cylinderGeometry args={[topRadius, bottomRadius, LAYER_HEIGHT, 64, 1, false]} />
        <meshPhysicalMaterial
          color={anomalyColor}
          transparent
          opacity={isHovered || isSelected ? 0.85 : 0.6}
          roughness={0.1}
          metalness={0.1}
          transmission={0.3}
          thickness={0.5}
          emissive={anomalyColor}
          emissiveIntensity={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={glowRef}>
        <cylinderGeometry args={[topRadius + 0.05, bottomRadius + 0.05, LAYER_HEIGHT + 0.02, 64, 1, false]} />
        <meshBasicMaterial
          color={hasAnomaly ? '#EF4444' : '#4FC3F7'}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {hasAnomaly && (
        <mesh position={[0, LAYER_HEIGHT / 2 + 0.15, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color="#EF4444" />
        </mesh>
      )}
    </group>
  );
}

function FallingParticles({ startY, endY, radius }: { startY: number; endY: number; radius: number }) {
  const count = 40;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.4,
      offset: Math.random() * Math.PI * 2,
      radiusFactor: 0.3 + Math.random() * 0.7,
    }));
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const t = ((time * p.speed + p.offset) % 1);
      const y = startY - t * (startY - endY);
      const r = radius * p.radiusFactor * (1 - t * 0.3);
      const angle = p.angle + time * 0.2;
      dummy.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
      dummy.scale.setScalar(0.02 + t * 0.01);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.03, 8, 8]} />
      <meshBasicMaterial color="#4FC3F7" transparent opacity={0.6} />
    </instancedMesh>
  );
}

export default function FunnelMesh() {
  const { funnelData, hoveredNodeIndex, selectedNodeIndex, anomalies } = useFunnelStore();
  const { hoverNode, selectNode } = useFunnelStore();

  const maxEnter = Math.max(...funnelData.map(d => d.enterCount), 1);

  const layers = useMemo(() => {
    return funnelData.map((d, i) => {
      const topR = (d.enterCount / maxEnter) * MAX_RADIUS;
      const nextEnter = i < funnelData.length - 1 ? funnelData[i + 1].enterCount : d.passCount;
      const bottomR = (nextEnter / maxEnter) * MAX_RADIUS;
      const yPos = -(i * (LAYER_HEIGHT + LAYER_GAP));
      const hasAnomaly = anomalies.some(
        a => a.type === 'duplicate_node' && d.nodeName === '复审'
      );

      return { topR, bottomR, yPos, hasAnomaly };
    });
  }, [funnelData, maxEnter, anomalies]);

  return (
    <group>
      {layers.map((layer, i) => (
        <FunnelLayer
          key={i}
          index={i}
          topRadius={layer.topR}
          bottomRadius={layer.bottomR}
          yPos={layer.yPos}
          isHovered={hoveredNodeIndex === i}
          isSelected={selectedNodeIndex === i}
          onPointerOver={() => hoverNode(i)}
          onPointerOut={() => hoverNode(null)}
          onClick={() => selectNode(selectedNodeIndex === i ? null : i)}
          hasAnomaly={layer.hasAnomaly}
        />
      ))}
      {layers.slice(0, -1).map((layer, i) => (
        <FallingParticles
          key={`particle-${i}`}
          startY={layer.yPos - LAYER_HEIGHT / 2}
          endY={layers[i + 1].yPos + LAYER_HEIGHT / 2}
          radius={(layer.bottomR + layers[i + 1].topR) / 2}
        />
      ))}
    </group>
  );
}
