import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Particle, PARTICLE_INFO } from '../../types/particle';
import { createTubeGeometry, getParticleRadius, dataToVector3 } from '../../utils/trajectoryGenerator';
import { useParticleStore } from '../../store/useParticleStore';
import { useAppStore } from '../../store/useAppStore';

interface ParticleTrajectoryProps {
  particle: Particle;
  isSelected: boolean;
  isHovered: boolean;
}

export default function ParticleTrajectory({
  particle,
  isSelected,
  isHovered,
}: ParticleTrajectoryProps) {
  const tubeRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const timeScale = useAppStore((s) => s.timeScale);

  const geometry = useMemo(() => {
    const radius = getParticleRadius(particle.type);
    return createTubeGeometry(particle.trajectoryPoints, radius * 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particle.id, particle.type, particle.trajectoryPoints.length]);

  const particleInfo = PARTICLE_INFO[particle.type];
  const baseColor = particle.color || particleInfo.color;

  useFrame((_, delta) => {
    if (isPlaying) {
      progressRef.current += delta * timeScale * 0.3;
      if (progressRef.current > 1) progressRef.current = 0;
    }

    if (tubeRef.current) {
      const material = tubeRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = isSelected || isHovered ? 1 : 0.7;
    }

    if (headRef.current && particle.trajectoryPoints.length > 0) {
      const idx = Math.min(
        Math.floor(progressRef.current * (particle.trajectoryPoints.length - 1)),
        particle.trajectoryPoints.length - 1
      );
      const pos = dataToVector3(particle.trajectoryPoints[idx]);
      headRef.current.position.copy(pos);
    }

    if (glowRef.current && particle.trajectoryPoints.length > 0) {
      const idx = Math.min(
        Math.floor(progressRef.current * (particle.trajectoryPoints.length - 1)),
        particle.trajectoryPoints.length - 1
      );
      const pos = dataToVector3(particle.trajectoryPoints[idx]);
      glowRef.current.position.copy(pos);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    useParticleStore.getState().setSelectedParticle(particle.id);
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    useParticleStore.getState().setHoveredParticle(particle.id);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    useParticleStore.getState().setHoveredParticle(null);
    document.body.style.cursor = 'auto';
  };

  const headPos = useMemo(() => {
    if (particle.trajectoryPoints.length === 0) return [0, 0, 0] as [number, number, number];
    const first = particle.trajectoryPoints[0];
    return [first.x, first.y, first.z] as [number, number, number];
  }, [particle.trajectoryPoints]);

  return (
    <group>
      <mesh
        ref={tubeRef}
        geometry={geometry}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={isSelected || isHovered ? 1 : 0.6}
          toneMapped={false}
        />
      </mesh>

      <mesh
        ref={headRef}
        position={headPos}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[getParticleRadius(particle.type) * 1.5, 16, 16]} />
        <meshBasicMaterial color={baseColor} toneMapped={false} />
      </mesh>

      {(isSelected || isHovered) && (
        <mesh ref={glowRef} position={headPos}>
          <sphereGeometry args={[getParticleRadius(particle.type) * 3, 16, 16]} />
          <meshBasicMaterial
            color={baseColor}
            transparent
            opacity={0.2}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}
