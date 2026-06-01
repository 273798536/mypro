import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WindDirection } from '../../types';

interface WindCorridorProps {
  wind: WindDirection;
  siteSize: number;
}

export function WindCorridor({ wind, siteSize }: WindCorridorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const { particles, positions } = useMemo(() => {
    const rad = (wind.angle * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dz = Math.cos(rad);
    const corridorWidth = 15 + wind.speed * 2;
    const particleCount = Math.floor(50 + wind.speed * 10);

    const posArray = new Float32Array(particleCount * 3);
    const particles: { offset: number; speed: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      const t = (i / particleCount - 0.5) * 2;
      const perpendicularX = -dz;
      const perpendicularZ = dx;
      const offset = (Math.random() - 0.5) * corridorWidth;

      posArray[i * 3] = dx * t * siteSize + perpendicularX * offset;
      posArray[i * 3 + 1] = 5 + Math.random() * 20;
      posArray[i * 3 + 2] = dz * t * siteSize + perpendicularZ * offset;

      particles.push({
        offset: Math.random(),
        speed: 0.002 + wind.speed * 0.001,
      });
    }

    return { particles, positions: posArray };
  }, [wind, siteSize]);

  useFrame((state) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const rad = (wind.angle * Math.PI) / 180;
      const dx = Math.sin(rad);
      const dz = Math.cos(rad);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const t = ((state.clock.elapsedTime * p.speed + p.offset) % 1 - 0.5) * 2;
        positions[i * 3] = dx * t * siteSize + positions[i * 3] * 0.01;
        positions[i * 3 + 2] = dz * t * siteSize + positions[i * 3 + 2] * 0.01;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const rad = (wind.angle * Math.PI) / 180;
  const corridorWidth = 15 + wind.speed * 2;

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, rad]} position={[0, 0.1, 0]}>
        <planeGeometry args={[siteSize * 2, corridorWidth]} />
        <meshBasicMaterial
          color="#00D4AA"
          transparent
          opacity={0.08 + wind.frequency * 0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particles.length}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#00D4AA"
          size={0.8}
          transparent
          opacity={0.6 + wind.frequency * 0.3}
          sizeAttenuation
        />
      </points>

      <group rotation={[0, rad, 0]}>
        <arrowHelper
          args={[
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 10, -siteSize * 0.8),
            siteSize * 0.5,
            new THREE.Color('#00D4AA'),
            3,
            2,
          ]}
        />
      </group>
    </group>
  );
}
