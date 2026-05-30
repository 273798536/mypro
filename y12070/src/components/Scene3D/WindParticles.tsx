import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

const PARTICLE_COUNT = 3000;

export default function WindParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const windDirection = useStore((s) => s.windDirection);
  const windSpeed = useStore((s) => s.windSpeed);
  const showParticles = useStore((s) => s.showParticles);
  const scale = 0.01;

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const vel = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() * 3000) * scale;
      pos[i * 3 + 1] = Math.random() * 15;
      pos[i * 3 + 2] = (Math.random() * 2000) * scale;
      vel[i * 3] = 0;
      vel[i * 3 + 1] = 0;
      vel[i * 3 + 2] = 0;
    }
    return { positions: pos, velocities: vel };
  }, [scale]);

  const colorArray = useMemo(() => {
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      colors[i * 3] = 0;
      colors[i * 3 + 1] = 0.6 + Math.random() * 0.4;
      colors[i * 3 + 2] = 0.5 + Math.random() * 0.5;
    }
    return colors;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current || !showParticles) return;

    const windRad = (windDirection * Math.PI) / 180;
    const speedFactor = windSpeed * 0.015;
    const vx = Math.sin(windRad) * speedFactor;
    const vz = -Math.cos(windRad) * speedFactor;

    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posArr[i * 3] += vx * delta * 60;
      posArr[i * 3 + 1] += Math.sin(posArr[i * 3] * 5 + posArr[i * 3 + 2] * 3) * 0.003;
      posArr[i * 3 + 2] += vz * delta * 60;

      if (posArr[i * 3] > 30 || posArr[i * 3] < -5) {
        posArr[i * 3] = (Math.random() * 3000) * scale;
      }
      if (posArr[i * 3 + 2] > 25 || posArr[i * 3 + 2] < -5) {
        posArr[i * 3 + 2] = (Math.random() * 2000) * scale;
      }
      if (posArr[i * 3 + 1] > 15) posArr[i * 3 + 1] = Math.random() * 12;
      if (posArr[i * 3 + 1] < 0) posArr[i * 3 + 1] = Math.random() * 8;
    }
    posAttr.needsUpdate = true;
  });

  if (!showParticles) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={PARTICLE_COUNT}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={colorArray}
          count={PARTICLE_COUNT}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.25}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
