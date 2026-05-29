import { useRef, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Effects } from '@react-three/drei';
import { EffectComposer, Bloom, FXAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useYardStore } from '@/store/yardStore';
import { YardGround } from './YardGround';
import { Container3D } from './Container3D';
import { Crane3D } from './Crane3D';

function CameraController() {
  const { camera } = useThree();
  
  useMemo(() => {
    camera.position.set(15, 12, 10);
    camera.lookAt(6, 0, 3);
  }, [camera]);
  
  return null;
}

function SceneContent() {
  const {
    yard,
    slots,
    containers,
    cranes,
    selectedSlotId,
    selectedContainerId,
    modifiedSlotId,
    impactAnalysis,
    selectSlot,
    selectContainer,
    conflicts,
  } = useYardStore();

  const lockedSlotIds = useMemo(
    () => slots.filter(s => s.isLocked).map(s => s.id),
    [slots]
  );

  const conflictSlotIds = useMemo(
    () => conflicts.filter(c => c.status === 'open').flatMap(c => c.involvedSlotIds),
    [conflicts]
  );

  const conflictContainerIds = useMemo(
    () => conflicts.filter(c => c.status === 'open').flatMap(c => c.involvedContainerIds),
    [conflicts]
  );

  const conflictCraneIds = useMemo(
    () => conflicts.filter(c => c.status === 'open').flatMap(c => c.involvedCraneIds),
    [conflicts]
  );

  const affectedContainerIds = useMemo(
    () => impactAnalysis?.affectedContainers || [],
    [impactAnalysis]
  );

  const handleContainerClick = (containerId: string) => {
    selectContainer(containerId);
    const container = containers.find(c => c.id === containerId);
    if (container) {
      selectSlot(container.slotId);
    }
  };

  return (
    <>
      <CameraController />
      
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[20, 30, 20]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#FFE4B5" />
      
      <YardGround
        slots={slots}
        yardWidth={yard.bays}
        yardDepth={yard.rows}
        selectedSlotId={selectedSlotId}
        modifiedSlotId={modifiedSlotId}
        lockedSlotIds={lockedSlotIds}
        onSlotClick={selectSlot}
      />
      
      {containers.map((container) => {
        const slot = slots.find(s => s.id === container.slotId);
        if (!slot) return null;
        
        return (
          <Container3D
            key={container.id}
            container={container}
            slot={slot}
            isSelected={selectedContainerId === container.id}
            isAffected={affectedContainerIds.includes(container.id)}
            isModified={modifiedSlotId === container.slotId}
            hasConflict={conflictContainerIds.includes(container.id)}
            onClick={() => handleContainerClick(container.id)}
          />
        );
      })}
      
      {cranes.map((crane, index) => (
        <Crane3D
          key={crane.id}
          crane={{ ...crane, position: { x: index * 3, y: 0, z: 0 } }}
          hasConflict={conflictCraneIds.includes(crane.id)}
          yardWidth={yard.bays}
        />
      ))}
      
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.1}
      />
      
      <Effects>
        <EffectComposer>
          <Bloom
            intensity={0.5}
            luminanceThreshold={0.9}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <FXAA />
        </EffectComposer>
      </Effects>
    </>
  );
}

export function YardScene() {
  return (
    <Canvas
      shadows
      camera={{ fov: 50, near: 0.1, far: 1000 }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor('#051438');
      }}
    >
      <fog attach="fog" args={['#051438', 30, 60]} />
      <SceneContent />
    </Canvas>
  );
}
