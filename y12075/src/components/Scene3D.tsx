import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store/appStore';
import { splToColor, getSPLRange } from '../utils/acoustics';

function OrchestraStage() {
  const { musicians, activeSections, selectedMusicianId, selectMusician, sections } = useAppStore();

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -5]}>
        <planeGeometry args={[20, 12]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {musicians.map((musician) => {
        if (!musician.position) return null;
        if (!activeSections.has(musician.sectionId)) return null;
        const section = sections.find((s) => s.id === musician.sectionId);
        const isSelected = selectedMusicianId === musician.id;

        return (
          <mesh
            key={musician.id}
            position={[musician.position.x, musician.position.y + 0.5, musician.position.z]}
            onClick={(e) => {
              e.stopPropagation();
              selectMusician(isSelected ? null : musician.id);
            }}
          >
            <cylinderGeometry args={[0.2, 0.2, 1, 16]} />
            <meshStandardMaterial
              color={section?.color || '#888'}
              emissive={isSelected ? section?.color || '#888' : '#000'}
              emissiveIntensity={isSelected ? 0.3 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function AudienceSeats({ splRange }: { splRange: { min: number; max: number } }) {
  const { seats, seatPressures, activeSections, selectedSeatId, selectSeat, musicians } = useAppStore();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = new THREE.Object3D();

  const activeMusicianIds = musicians
    .filter((m) => activeSections.has(m.sectionId) && m.position)
    .map((m) => m.id);

  useFrame(() => {
    if (!meshRef.current) return;

    seats.forEach((seat, i) => {
      const sp = seatPressures.find((p) => p.seatId === seat.id);
      const filteredContributions = sp?.contributions.filter((c) =>
        activeMusicianIds.includes(c.musicianId)
      ) || [];

      let totalSPL = 40;
      if (filteredContributions.length > 0) {
        const energySum = filteredContributions.reduce((sum, c) => sum + Math.pow(10, c.spl / 10), 0);
        totalSPL = 10 * Math.log10(energySum || 1e-10);
      }

      const isSelected = selectedSeatId === seat.id;
      const color = new THREE.Color(splToColor(totalSPL, splRange.min, splRange.max));

      dummy.position.set(seat.position.x, seat.position.y + 0.1, seat.position.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.setScalar(isSelected ? 1.5 : 1);
      dummy.updateMatrix();

      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, isSelected ? new THREE.Color('#ffffff') : color);
    });

    meshRef.current!.instanceMatrix.needsUpdate = true;
    if (meshRef.current!.instanceColor) {
      meshRef.current!.instanceColor.needsUpdate = true;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    const instanceId = e.instanceId;
    if (instanceId !== undefined && seats[instanceId]) {
      selectSeat(selectedSeatId === seats[instanceId].id ? null : seats[instanceId].id);
    }
  };

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, seats.length]} onClick={handleClick}>
      <planeGeometry args={[0.8, 0.6]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}

function OcclusionVisualizer() {
  const { occlusionResults, activeSections, sections } = useAppStore();

  return (
    <group>
      {occlusionResults.map((occlusion, idx) => {
        if (!activeSections.has(occlusion.sourceSectionId)) return null;
        const sourceSection = sections.find((s) => s.id === occlusion.sourceSectionId);
        const height = Math.max(0.1, occlusion.avgOcclusionLoss / 20);

        return (
          <mesh key={idx} position={[0, height / 2, 5]}>
            <coneGeometry args={[8, height * 5, 4, 1, true]} />
            <meshStandardMaterial
              color={sourceSection?.color || '#ff0000'}
              transparent
              opacity={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function CameraController({
  onViewChange,
}: {
  onViewChange: (pos: [number, number, number], target: [number, number, number]) => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useFrame(() => {
    if (controlsRef.current) {
      const target = controlsRef.current.target;
      onViewChange(
        [camera.position.x, camera.position.y, camera.position.z],
        [target.x, target.y, target.z]
      );
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2 - 0.1}
      minDistance={5}
      maxDistance={50}
      enableDamping
      dampingFactor={0.05}
    />
  );
}

function SceneContent({ splRange, onViewChange }: { splRange: { min: number; max: number }; onViewChange: (pos: [number, number, number], target: [number, number, number]) => void }) {
  const { selectedSeatId, selectSeat, selectedMusicianId, selectMusician } = useAppStore();

  const handleCanvasClick = () => {
    if (selectedSeatId) selectSeat(null);
    if (selectedMusicianId) selectMusician(null);
  };

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 15, 5]} intensity={0.8} castShadow />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#fff5e6" />

      <fog attach="fog" args={['#0a1628', 20, 60]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow onClick={handleCanvasClick}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0a1628" />
      </mesh>

      <mesh position={[-15, 3, -5]}>
        <boxGeometry args={[1, 8, 12]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.8} />
      </mesh>
      <mesh position={[15, 3, -5]}>
        <boxGeometry args={[1, 8, 12]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.8} />
      </mesh>

      <OrchestraStage />
      <AudienceSeats splRange={splRange} />
      <OcclusionVisualizer />

      <CameraController onViewChange={onViewChange} />
    </>
  );
}

export default function Scene3D({
  onViewChange,
}: {
  onViewChange: (pos: [number, number, number], target: [number, number, number]) => void;
}) {
  const { seatPressures } = useAppStore();
  const splRange = getSPLRange(seatPressures);

  return (
    <Canvas
      camera={{ position: [0, 12, 15], fov: 50 }}
      gl={{ antialias: true }}
      style={{ background: 'linear-gradient(to bottom, #0a1628, #0d1f35)' }}
    >
      <SceneContent splRange={splRange} onViewChange={onViewChange} />
    </Canvas>
  );
}
