import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Effects } from '@react-three/drei';
import { Bloom } from '@react-three/postprocessing';
import { useSandboxStore } from '../../store/useSandboxStore';
import { Gate3D } from './Gate3D';
import { Taxiway3D } from './Taxiway3D';
import { ApronGround } from './ApronGround';
import { ConflictHighlight } from './ConflictHighlight';

export function SandboxScene() {
  const {
    gates,
    taxiways,
    conflicts,
    selectedConflictId,
    highlightedGateIds,
    highlightedTaxiwayIds,
    filterTypes,
    filterSeverities,
  } = useSandboxStore();

  const filteredConflicts = useMemo(() => {
    return conflicts.filter(
      (c) => filterTypes.includes(c.type) && filterSeverities.includes(c.severity)
    );
  }, [conflicts, filterTypes, filterSeverities]);

  const selectedConflict = useMemo(() => {
    return conflicts.find((c) => c.id === selectedConflictId);
  }, [conflicts, selectedConflictId]);

  const gatesWithConflict = useMemo(() => {
    const conflictGateIds = new Set(
      filteredConflicts.flatMap((c) => c.gateIds)
    );
    return new Set(Array.from(conflictGateIds));
  }, [filteredConflicts]);

  const taxiwaysWithConflict = useMemo(() => {
    const conflictTwIds = new Set(
      filteredConflicts.flatMap((c) => c.taxiwayIds)
    );
    return new Set(Array.from(conflictTwIds));
  }, [filteredConflicts]);

  const selectedConflictGates = useMemo(() => {
    if (!selectedConflict) return [];
    return gates.filter((g) => selectedConflict.gateIds.includes(g.id));
  }, [selectedConflict, gates]);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 50, 50], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#0a0f1a']} />
      <fog attach="fog" args={['#0a0f1a', 60, 150]} />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[20, 40, 20]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      <pointLight position={[-30, 20, -30]} intensity={0.5} color="#4a90d9" />
      <pointLight position={[30, 20, 30]} intensity={0.5} color="#4a90d9" />

      <ApronGround />

      {taxiways.map((taxiway) => (
        <Taxiway3D
          key={taxiway.id}
          taxiway={taxiway}
          isHighlighted={highlightedTaxiwayIds.includes(taxiway.id)}
          hasConflict={taxiwaysWithConflict.has(taxiway.id)}
        />
      ))}

      {gates.map((gate) => (
        <Gate3D
          key={gate.id}
          gate={gate}
          isHighlighted={highlightedGateIds.includes(gate.id)}
          hasConflict={gatesWithConflict.has(gate.id)}
        />
      ))}

      {selectedConflict && (
        <ConflictHighlight
          gates={selectedConflictGates}
          type={selectedConflict.type}
        />
      )}

      {filteredConflicts
        .filter((c) => c.id !== selectedConflictId && c.severity === 'high')
        .map((conflict) => {
          const conflictGates = gates.filter((g) => conflict.gateIds.includes(g.id));
          return (
            <ConflictHighlight
              key={conflict.id}
              gates={conflictGates}
              type={conflict.type}
            />
          );
        })}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={15}
        maxDistance={100}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 0]}
      />

      <Environment preset="city" />

      <Effects>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </Effects>
    </Canvas>
  );
}
