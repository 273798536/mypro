import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDataStore, useSceneStore } from '@/stores';
import { latLonToXY } from '@/utils/geo';

interface OilSpillParticlesProps {
  centerLat: number;
  centerLon: number;
  scale?: number;
}

export function OilSpillParticles({ centerLat, centerLon, scale = 80 }: OilSpillParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const { oilSpillFrames } = useDataStore();
  const { currentFrameIndex } = useSceneStore();

  const frameIndex = Math.min(currentFrameIndex, oilSpillFrames.length - 1);
  const currentFrame = oilSpillFrames[frameIndex] || oilSpillFrames[0];

  const { positions, colors, sizes } = useMemo(() => {
    const particles = currentFrame?.particles || [];
    const positions = new Float32Array(particles.length * 3);
    const colors = new Float32Array(particles.length * 3);
    const sizes = new Float32Array(particles.length);

    particles.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.z + 0.02;
      positions[i * 3 + 2] = -p.y;

      const hue = 0.08 + Math.random() * 0.12;
      const color = new THREE.Color().setHSL(hue, 0.8, 0.4 + Math.random() * 0.3);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = p.size;
    });

    return { positions, colors, sizes };
  }, [currentFrame]);

  useFrame((state) => {
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(state.clock.elapsedTime * 0.5 + i * 0.01) * 0.002;
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.75}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

interface SpillCenterProps {
  centerLat: number;
  centerLon: number;
  scale?: number;
}

export function SpillCenter({ centerLat, centerLon, scale = 80 }: SpillCenterProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const { oilSpillFrames } = useDataStore();
  const { currentFrameIndex } = useSceneStore();

  const frameIndex = Math.min(currentFrameIndex, oilSpillFrames.length - 1);
  const currentFrame = oilSpillFrames[frameIndex] || oilSpillFrames[0];
  const { x, y } = latLonToXY(currentFrame.centerY, currentFrame.centerX, 0, 0, 1);

  useFrame((state) => {
    if (ringRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      ringRef.current.scale.set(scale, scale, 1);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <group position={[x, 0.03, -y]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshBasicMaterial color="#ff6b35" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.15, 32]} />
        <meshBasicMaterial color="#ff6b35" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}
