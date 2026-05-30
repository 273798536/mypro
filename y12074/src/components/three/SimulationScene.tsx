import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { ChuteModel, LuggageRecord, AnomalyEvent } from '@/types';
import { Chute3D } from './Chute3D';
import { Luggage3D } from './Luggage3D';
import { AnomalyMarker } from './AnomalyMarker';

interface SceneContentProps {
  chute: ChuteModel;
  luggage: LuggageRecord[];
  anomalies: AnomalyEvent[];
  selectedLuggageId: string | null;
  selectedAnomalyId: string | null;
  showPath: boolean;
  showLabels: boolean;
  onLuggageClick: (id: string) => void;
  onAnomalyClick: (id: string) => void;
  simulationTime: number;
  playbackSpeed: number;
}

function SceneContent({
  chute,
  luggage,
  anomalies,
  selectedLuggageId,
  selectedAnomalyId,
  showPath,
  showLabels,
  onLuggageClick,
  onAnomalyClick,
}: SceneContentProps) {
  const visibleLuggage = useMemo(() => {
    return luggage.slice(-30);
  }, [luggage]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-5, 10, -5]} intensity={0.5} />

      <Grid
        position={[0, -2, 0]}
        args={[50, 50]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#2d3748"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#4a5568"
        fadeDistance={50}
        fadeStrength={1}
        followCamera={false}
      />

      <Chute3D chute={chute} showPath={showPath} />

      {visibleLuggage.map((lug) => (
        <Luggage3D
          key={lug.id}
          luggage={lug}
          chute={chute}
          isSelected={selectedLuggageId === lug.id}
          showLabel={showLabels}
          onClick={() => onLuggageClick(lug.id)}
        />
      ))}

      {anomalies.map((anomaly) => (
        <AnomalyMarker
          key={anomaly.id}
          anomaly={anomaly}
          chute={chute}
          isSelected={selectedAnomalyId === anomaly.id}
          showLabel={showLabels}
          onClick={() => onAnomalyClick(anomaly.id)}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        target={[0, 0, 0]}
      />
    </>
  );
}

interface SimulationSceneProps {
  chute: ChuteModel;
  luggage: LuggageRecord[];
  anomalies: AnomalyEvent[];
  selectedLuggageId: string | null;
  selectedAnomalyId: string | null;
  showPath: boolean;
  showLabels: boolean;
  onLuggageClick: (id: string) => void;
  onAnomalyClick: (id: string) => void;
  simulationTime: number;
  playbackSpeed: number;
  className?: string;
}

export function SimulationScene({
  chute,
  luggage,
  anomalies,
  selectedLuggageId,
  selectedAnomalyId,
  showPath,
  showLabels,
  onLuggageClick,
  onAnomalyClick,
  simulationTime,
  playbackSpeed,
  className,
}: SimulationSceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [15, 12, 15], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      className={className}
      style={{ background: 'linear-gradient(to bottom, #1a1a2e 0%, #16213e 100%)' }}
    >
      <PerspectiveCamera makeDefault position={[15, 12, 15]} fov={50} />
      <fog attach="fog" args={['#1a1a2e', 20, 60]} />
      <SceneContent
        chute={chute}
        luggage={luggage}
        anomalies={anomalies}
        selectedLuggageId={selectedLuggageId}
        selectedAnomalyId={selectedAnomalyId}
        showPath={showPath}
        showLabels={showLabels}
        onLuggageClick={onLuggageClick}
        onAnomalyClick={onAnomalyClick}
        simulationTime={simulationTime}
        playbackSpeed={playbackSpeed}
      />
    </Canvas>
  );
}
