import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SmokeSource } from '@/types';
import { useMineStore } from '@/store/useMineStore';

interface SmokeSystemProps {
  smokeSource: SmokeSource;
  windDirection: [number, number, number];
  hasError: boolean;
}

export function SmokeSystem({ smokeSource, windDirection, hasError }: SmokeSystemProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const isPlaying = useMineStore((state) => state.isPlaying);
  const setSelectedObject = useMineStore((state) => state.setSelectedObject);

  const particleCount = 300;

  const { positions, sizes, velocities } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = smokeSource.position[0] + (Math.random() - 0.5) * 1;
      positions[i * 3 + 1] = smokeSource.position[1] + Math.random() * 0.5;
      positions[i * 3 + 2] = smokeSource.position[2] + (Math.random() - 0.5) * 1;

      sizes[i] = Math.random() * 0.5 + 0.3;

      const spreadAngle = smokeSource.reverseFlow ? Math.PI : 0;
      velocities[i * 3] = windDirection[0] * 0.02 + (Math.random() - 0.5) * 0.01 + Math.sin(spreadAngle) * 0.01;
      velocities[i * 3 + 1] = 0.01 + Math.random() * 0.01;
      velocities[i * 3 + 2] = windDirection[2] * 0.02 + (Math.random() - 0.5) * 0.01 + Math.cos(spreadAngle) * 0.01;
    }

    return { positions, sizes, velocities };
  }, [smokeSource, windDirection]);

  useFrame((_, delta) => {
    if (!particlesRef.current || !isPlaying) return;

    const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      posArray[i * 3] += velocities[i * 3] * delta * 60 * smokeSource.intensity;
      posArray[i * 3 + 1] += velocities[i * 3 + 1] * delta * 60 * smokeSource.intensity;
      posArray[i * 3 + 2] += velocities[i * 3 + 2] * delta * 60 * smokeSource.intensity;

      const dist = Math.sqrt(
        Math.pow(posArray[i * 3] - smokeSource.position[0], 2) +
        Math.pow(posArray[i * 3 + 1] - smokeSource.position[1], 2) +
        Math.pow(posArray[i * 3 + 2] - smokeSource.position[2], 2)
      );

      if (dist > 15) {
        posArray[i * 3] = smokeSource.position[0] + (Math.random() - 0.5) * 1;
        posArray[i * 3 + 1] = smokeSource.position[1] + Math.random() * 0.5;
        posArray[i * 3 + 2] = smokeSource.position[2] + (Math.random() - 0.5) * 1;
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  const smokeColor = hasError ? '#ff4444' : '#dd6b20';

  return (
    <group>
      <mesh
        position={smokeSource.position}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedObject({
            type: 'smoke',
            id: smokeSource.id,
            position: smokeSource.position,
          });
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <cylinderGeometry args={[0.3, 0.5, 0.8, 16]} />
        <meshStandardMaterial
          color={smokeColor}
          emissive={smokeColor}
          emissiveIntensity={0.6}
        />
      </mesh>

      {hasError && (
        <mesh position={[smokeSource.position[0], smokeSource.position[1] + 1.2, smokeSource.position[2]]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial
            color="#e53e3e"
            emissive="#e53e3e"
            emissiveIntensity={0.8 + Math.sin(Date.now() * 0.005) * 0.3}
          />
        </mesh>
      )}

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.8}
          color={smokeColor}
          transparent
          opacity={0.4}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
