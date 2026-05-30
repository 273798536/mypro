import { useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import type { Streamline as StreamlineType, VectorFieldFormula, AnomalyRecord } from '@/types';
import { Streamline } from './Streamline';
import { GridGround } from './GridGround';
import { useFilteredStreamlines, useStreamlineColors } from '@/hooks/useStreamline';
import { useVectorFieldStore } from '@/store/vectorFieldStore';
import { useUIStore } from '@/store/uiStore';
import { useDetectionStore } from '@/store/detectionStore';
import { useViewpoint } from '@/hooks/useViewpoint';

interface SceneContentProps {
  formula: VectorFieldFormula | null;
  streamlines: StreamlineType[];
  anomalies: AnomalyRecord[];
}

function SceneContent({
  formula,
  streamlines,
  anomalies,
}: SceneContentProps) {
  const controlsRef = useRef<OrbitControlsType>(null);
  const { camera } = useThree();
  const { setControls, setCamera } = useViewpoint();

  const filterConditions = useVectorFieldStore((s) => s.filterConditions);
  const colorScale = useVectorFieldStore((s) => s.colorScale);
  const selectedStreamlineId = useUIStore((s) => s.selectedStreamlineId);
  const setSelectedStreamlineId = useUIStore((s) => s.setSelectedStreamlineId);
  const setSelectedAnomalyId = useUIStore((s) => s.setSelectedAnomalyId);

  const filteredStreamlines = useFilteredStreamlines(streamlines, filterConditions);
  const colorMap = useStreamlineColors(filteredStreamlines, colorScale, !!colorScale);

  useEffect(() => {
    if (controlsRef.current) {
      setControls(controlsRef.current);
    }
    if (camera) {
      setCamera(camera as THREE.PerspectiveCamera);
    }
  }, [camera, setControls, setCamera]);

  const handleStreamlineClick = useCallback((streamlineId: string) => {
    setSelectedStreamlineId(streamlineId);
    const anomaly = anomalies.find((a) => a.streamlineId === streamlineId);
    if (anomaly) {
      setSelectedAnomalyId(anomaly.id);
    }
  }, [anomalies, setSelectedStreamlineId, setSelectedAnomalyId]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.8}
        castShadow
      />
      <directionalLight
        position={[-10, -5, -5]}
        intensity={0.4}
      />

      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />

      <fogExp2 attach="fog" args={[0x0a1628, 0.02]} />

      {formula && (
        <GridGround
          size={Math.max(
            formula.params.xRange[1] - formula.params.xRange[0],
            formula.params.yRange[1] - formula.params.yRange[0]
          ) * 1.5}
          divisions={20}
          xRange={formula.params.xRange}
          yRange={formula.params.yRange}
        />
      )}

      <group>
        {filteredStreamlines.map((streamline) => (
          <Streamline
            key={streamline.id}
            streamline={streamline}
            color={colorMap.get(streamline.id)}
            selected={selectedStreamlineId === streamline.id}
            onClick={() => handleStreamlineClick(streamline.id)}
          />
        ))}
      </group>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={50}
      />
    </>
  );
}

export function Scene() {
  const currentFormula = useVectorFieldStore((s) =>
    s.formulas.find((f) => f.id === s.currentFormulaId) || null
  );
  const currentResult = useDetectionStore((s) => s.currentResult);

  const streamlines = currentResult?.streamlines || [];
  const anomalies = currentResult?.anomalies || [];

  return (
    <Canvas
      camera={{ position: [10, 10, 10], fov: 60 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'linear-gradient(180deg, #0a1628 0%, #1e3a5f 100%)' }}
    >
      <SceneContent
        formula={currentFormula}
        streamlines={streamlines}
        anomalies={anomalies}
      />
    </Canvas>
  );
}
