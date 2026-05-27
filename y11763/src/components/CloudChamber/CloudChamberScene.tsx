import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import ParticleTrajectory from './ParticleTrajectory';
import MagneticFieldLines from './MagneticFieldLines';
import DecayEventPoint from './DecayEventPoint';
import ChamberVolume from './ChamberVolume';
import { useParticleStore } from '../../store/useParticleStore';
import { useMagneticFieldStore } from '../../store/useMagneticFieldStore';
import { useAppStore } from '../../store/useAppStore';

function SceneUpdater() {
  const isPlaying = useAppStore((s) => s.isPlaying);
  const timeScale = useAppStore((s) => s.timeScale);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (isPlaying) {
      timeRef.current += delta * timeScale;
    }
  });

  return null;
}

function CloudChamberContent() {
  const { scene } = useThree();

  useEffect(() => {
    scene.fog = new THREE.FogExp2(0x0a1628, 0.02);
    scene.background = new THREE.Color(0x0a1628);
  }, [scene]);

  const allParticles = useParticleStore((state) => state.particles);
  const filteredTypes = useParticleStore((state) => state.filteredTypes);
  const decayEvents = useParticleStore((state) => state.decayEvents);
  const magneticField = useMagneticFieldStore((state) => state.field);
  const selectedParticleId = useParticleStore((state) => state.selectedParticleId);
  const hoveredParticleId = useParticleStore((state) => state.hoveredParticleId);

  const visibleParticleIds = useMemo(() => {
    const set = new Set(filteredTypes);
    return allParticles
      .filter((p) => p.isVisible && set.has(p.type))
      .map((p) => p.id);
  }, [allParticles, filteredTypes]);

  const particleMap = useMemo(() => {
    const m = new Map<string, typeof allParticles[0]>();
    allParticles.forEach((p) => m.set(p.id, p));
    return m;
  }, [allParticles]);

  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#3b82f6" />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#8b5cf6" />

      <Stars radius={50} depth={50} count={1000} factor={4} saturation={0} fade speed={0.5} />

      <ChamberVolume />

      {magneticField.isVisible && <MagneticFieldLines field={magneticField} />}

      {visibleParticleIds.map((id) => {
        const particle = particleMap.get(id);
        if (!particle) return null;
        return (
          <ParticleTrajectory
            key={particle.id}
            particle={particle}
            isSelected={particle.id === selectedParticleId}
            isHovered={particle.id === hoveredParticleId}
          />
        );
      })}

      {decayEvents
        .filter((e) => e.isActive)
        .map((event) => (
          <DecayEventPoint key={event.id} event={event} />
        ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={40}
        autoRotate={false}
      />

      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette offset={0.5} darkness={0.5} />
      </EffectComposer>

      <SceneUpdater />
    </>
  );
}

export default function CloudChamberScene() {
  return (
    <Canvas
      camera={{ position: [0, 5, 20], fov: 60 }}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
    >
      <CloudChamberContent />
    </Canvas>
  );
}
